"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import gsap from "gsap";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Building2,
  Calendar,
  FileSpreadsheet,
  Receipt,
  Plus,
  Upload,
  Search,
  Check,
  AlertCircle,
  Clock,
  Trash2,
  Edit3,
  Download,
  LayoutGrid,
  ChevronRight,
  X,
  ArrowUpRight,
  SlidersHorizontal,
  CheckCircle2,
  FileText,
  Scale,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import type { Azienda, Scadenza, Cedolino } from "@/lib/db/schema";
import {
  initialAziende,
  initialScadenze,
  initialCedolini,
} from "@/lib/db/seed-data";

type ActiveTab =
  | "dashboard"
  | "aziende"
  | "scadenzario"
  | "cedolini"
  | "import";

const CCNL_OPTIONS = [
  "Commercio e Terziario (Confcommercio)",
  "Metalmeccanica Industria",
  "Turismo e Pubblici Esercizi",
  "Edilizia Industria",
  "Studi Professionali",
  "Logistica, Trasporto Merci e Spedizione",
  "Chimico-Farmaceutico",
  "Artigianato Metalmeccanico",
];

function formatEuro(value: number | string | null | undefined) {
  const num = typeof value === "number" ? value : parseFloat(String(value || "0"));
  return (isNaN(num) ? 0 : num).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateIt(dateStr: string) {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const months = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
  ];
  const m = parseInt(parts[1], 10) - 1;
  return `${parts[2]} ${months[m] || parts[1]} ${parts[0]}`;
}

export default function CrmConsulentiApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [aziende, setAziende] = useState<Azienda[]>(initialAziende);
  const [scadenze, setScadenze] = useState<Scadenza[]>(initialScadenze);
  const [cedolini, setCedolini] = useState<Cedolino[]>(initialCedolini);
  const [dbSource, setDbSource] = useState<"neon" | "memory">("memory");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statoFilter, setStatoFilter] = useState<string>("Tutti");
  const [scadenzaTipoFilter, setScadenzaTipoFilter] = useState<string>("Tutti");
  const [scadenzaStatoFilter, setScadenzaStatoFilter] = useState<
    "Tutte" | "Aperte" | "Evase"
  >("Tutte");

  // Selected Azienda for Vertical Inspection Drawer
  const [selectedAzienda, setSelectedAzienda] = useState<Azienda | null>(null);

  // Slide-over Drawer states - Azienda CRUD
  const [isAziendaModalOpen, setIsAziendaModalOpen] = useState(false);
  const [editingAzienda, setEditingAzienda] = useState<Azienda | null>(null);
  const [aziendaForm, setAziendaForm] = useState({
    ragioneSociale: "",
    partitaIva: "",
    codiceFiscale: "",
    ccnl: CCNL_OPTIONS[0],
    numeroDipendenti: 1,
    email: "",
    telefono: "",
    citta: "",
    stato: "Attiva",
    posizioneInps: "",
    patInail: "",
  });

  // Slide-over Drawer states - Scadenza
  const [isScadenzaModalOpen, setIsScadenzaModalOpen] = useState(false);
  const [scadenzaForm, setScadenzaForm] = useState({
    titolo: "",
    tipo: "F24",
    dataScadenza: "2026-11-16",
    aziendaId: "",
    aziendaNome: "Tutte le Aziende Clienti",
    importo: "",
    priorita: "Alta",
    note: "",
  });

  // Slide-over Drawer states - Cedolino
  const [isCedolinoModalOpen, setIsCedolinoModalOpen] = useState(false);
  const [cedolinoForm, setCedolinoForm] = useState({
    aziendaId: "1",
    dipendenteNome: "",
    qualifica: "Impiegato Amministrativo",
    meseCompetenza: "Ottobre 2026",
    nettoBusta: "",
    costoAzienda: "",
    stato: "Elaborato",
  });

  // CSV / XLSX Import state
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for subtle GSAP motion
  const contentRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    async function fetchAll() {
      try {
        const [azRes, scRes, ceRes] = await Promise.all([
          fetch("/api/aziende").then((r) => r.json()),
          fetch("/api/scadenze").then((r) => r.json()),
          fetch("/api/cedolini").then((r) => r.json()),
        ]);
        if (Array.isArray(azRes.data) && azRes.data.length > 0) {
          setAziende(azRes.data);
        }
        if (Array.isArray(scRes.data) && scRes.data.length > 0) {
          setScadenze(scRes.data);
        }
        if (Array.isArray(ceRes.data) && ceRes.data.length > 0) {
          setCedolini(ceRes.data);
        }
        if (azRes.source === "neon") {
          setDbSource("neon");
        }
      } catch {
        // fallback to seed
      }
    }
    fetchAll();
  }, []);

  // Crisp, fast GSAP transition on view change & vertical bar growth
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
        );
      }
      if (barsRef.current) {
        const bars = barsRef.current.querySelectorAll(".gsap-vbar");
        gsap.fromTo(
          bars,
          { scaleY: 0, transformOrigin: "bottom center" },
          {
            scaleY: 1,
            duration: 0.6,
            stagger: 0.06,
            ease: "power3.out",
          }
        );
      }
    });
    return () => ctx.revert();
  }, [activeTab, aziende.length]);

  // Computed Studio Metrics
  const kpis = useMemo(() => {
    const aziendeAttive = aziende.filter((a) => a.stato === "Attiva").length;
    const totaleDipendenti = aziende.reduce(
      (acc, a) => acc + (Number(a.numeroDipendenti) || 0),
      0
    );
    const scadenzeAperte = scadenze.filter((s) => !s.completata);
    const scadenzeEvase = scadenze.filter((s) => s.completata);
    const scadenzeUrgenti = scadenzeAperte.filter(
      (s) => s.stato === "Urgente" || s.priorita === "Alta"
    ).length;
    const totaleVersamentiF24 = scadenzeAperte.reduce(
      (acc, s) => acc + (parseFloat(String(s.importo || "0")) || 0),
      0
    );
    const costoLavoroTotale = cedolini.reduce(
      (acc, c) => acc + (parseFloat(String(c.costoAzienda || "0")) || 0),
      0
    );
    const nettoTotale = cedolini.reduce(
      (acc, c) => acc + (parseFloat(String(c.nettoBusta || "0")) || 0),
      0
    );
    const percentualeChiusura =
      scadenze.length > 0
        ? Math.round((scadenzeEvase.length / scadenze.length) * 100)
        : 100;

    return {
      aziendeAttive,
      totaleAziende: aziende.length,
      totaleDipendenti,
      scadenzePendenti: scadenzeAperte.length,
      scadenzeEvaseCount: scadenzeEvase.length,
      scadenzeUrgenti,
      totaleVersamentiF24,
      totaleCedolini: cedolini.length,
      costoLavoroTotale,
      nettoTotale,
      percentualeChiusura,
    };
  }, [aziende, scadenze, cedolini]);

  // Vertical CCNL Distribution Data for Graphic Chart
  const ccnlStats = useMemo(() => {
    const map = new Map<string, { count: number; dipendenti: number }>();
    for (const a of aziende) {
      const shortName = a.ccnl.split("(")[0].trim();
      const prev = map.get(shortName) || { count: 0, dipendenti: 0 };
      map.set(shortName, {
        count: prev.count + 1,
        dipendenti: prev.dipendenti + (Number(a.numeroDipendenti) || 0),
      });
    }
    const arr = Array.from(map.entries())
      .map(([name, val]) => ({
        name,
        aziendeCount: val.count,
        dipendenti: val.dipendenti,
      }))
      .sort((a, b) => b.dipendenti - a.dipendenti);

    const maxDip = Math.max(...arr.map((x) => x.dipendenti), 1);
    return arr.map((item) => ({
      ...item,
      heightPct: Math.max(Math.round((item.dipendenti / maxDip) * 100), 14),
      sharePct:
        kpis.totaleDipendenti > 0
          ? Math.round((item.dipendenti / kpis.totaleDipendenti) * 100)
          : 0,
    }));
  }, [aziende, kpis.totaleDipendenti]);

  // Filtered lists
  const filteredAziende = useMemo(() => {
    return aziende.filter((a) => {
      const matchesQuery =
        a.ragioneSociale.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.partitaIva.includes(searchQuery) ||
        a.ccnl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.citta || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStato =
        statoFilter === "Tutti" || a.stato === statoFilter;
      return matchesQuery && matchesStato;
    });
  }, [aziende, searchQuery, statoFilter]);

  const filteredScadenze = useMemo(() => {
    return scadenze
      .filter((s) =>
        scadenzaTipoFilter === "Tutti" ? true : s.tipo === scadenzaTipoFilter
      )
      .filter((s) => {
        if (scadenzaStatoFilter === "Aperte") return !s.completata;
        if (scadenzaStatoFilter === "Evase") return s.completata;
        return true;
      })
      .sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza));
  }, [scadenze, scadenzaTipoFilter, scadenzaStatoFilter]);

  // Group Scadenze by Date for Vertical Timeline
  const groupedScadenze = useMemo(() => {
    const groups: Record<string, Scadenza[]> = {};
    for (const s of filteredScadenze) {
      if (!groups[s.dataScadenza]) groups[s.dataScadenza] = [];
      groups[s.dataScadenza].push(s);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredScadenze]);

  // CRUD Handlers - Azienda
  function openNewAziendaModal() {
    setEditingAzienda(null);
    setAziendaForm({
      ragioneSociale: "",
      partitaIva: "",
      codiceFiscale: "",
      ccnl: CCNL_OPTIONS[0],
      numeroDipendenti: 8,
      email: "",
      telefono: "",
      citta: "",
      stato: "Attiva",
      posizioneInps: "",
      patInail: "",
    });
    setIsAziendaModalOpen(true);
  }

  function openEditAziendaModal(azienda: Azienda, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditingAzienda(azienda);
    setAziendaForm({
      ragioneSociale: azienda.ragioneSociale,
      partitaIva: azienda.partitaIva,
      codiceFiscale: azienda.codiceFiscale || azienda.partitaIva,
      ccnl: azienda.ccnl,
      numeroDipendenti: azienda.numeroDipendenti,
      email: azienda.email || "",
      telefono: azienda.telefono || "",
      citta: azienda.citta || "",
      stato: azienda.stato,
      posizioneInps: azienda.posizioneInps || "",
      patInail: azienda.patInail || "",
    });
    setIsAziendaModalOpen(true);
  }

  async function handleSaveAzienda(e: React.FormEvent) {
    e.preventDefault();
    if (!aziendaForm.ragioneSociale || !aziendaForm.partitaIva) return;

    if (editingAzienda) {
      const updatedPayload = { ...editingAzienda, ...aziendaForm };
      setAziende((prev) =>
        prev.map((a) => (a.id === editingAzienda.id ? updatedPayload : a))
      );
      if (selectedAzienda?.id === editingAzienda.id) {
        setSelectedAzienda(updatedPayload);
      }
      setIsAziendaModalOpen(false);
      await fetch("/api/aziende", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload),
      });
    } else {
      const res = await fetch("/api/aziende", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aziendaForm),
      });
      const json = await res.json();
      if (json.data) {
        setAziende((prev) => [json.data, ...prev]);
      }
      setIsAziendaModalOpen(false);
    }
  }

  async function handleDeleteAzienda(id: number, e?: React.MouseEvent) {
    e?.stopPropagation();
    setAziende((prev) => prev.filter((a) => a.id !== id));
    if (selectedAzienda?.id === id) setSelectedAzienda(null);
    await fetch(`/api/aziende?id=${id}`, { method: "DELETE" });
  }

  // Handlers - Scadenze
  async function handleToggleScadenza(scadenza: Scadenza) {
    const nextCompletata = !scadenza.completata;
    setScadenze((prev) =>
      prev.map((s) =>
        s.id === scadenza.id
          ? {
              ...s,
              completata: nextCompletata,
              stato: nextCompletata ? "Completata" : "In Scadenza",
            }
          : s
      )
    );
    await fetch("/api/scadenze", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: scadenza.id, completata: nextCompletata }),
    });
  }

  async function handleCreateScadenza(e: React.FormEvent) {
    e.preventDefault();
    if (!scadenzaForm.titolo || !scadenzaForm.dataScadenza) return;

    const selectedAz = aziende.find(
      (a) => String(a.id) === String(scadenzaForm.aziendaId)
    );

    const payload = {
      ...scadenzaForm,
      aziendaId: selectedAz ? selectedAz.id : null,
      aziendaNome: selectedAz
        ? selectedAz.ragioneSociale
        : "Tutte le Aziende Clienti",
      importo: scadenzaForm.importo || "0.00",
      stato: scadenzaForm.priorita === "Alta" ? "Urgente" : "In Scadenza",
    };

    const res = await fetch("/api/scadenze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.data) {
      setScadenze((prev) => [...prev, json.data]);
    }
    setIsScadenzaModalOpen(false);
    setScadenzaForm({
      titolo: "",
      tipo: "F24",
      dataScadenza: "2026-11-16",
      aziendaId: "",
      aziendaNome: "Tutte le Aziende Clienti",
      importo: "",
      priorita: "Alta",
      note: "",
    });
  }

  async function handleDeleteScadenza(id: number) {
    setScadenze((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/scadenze?id=${id}`, { method: "DELETE" });
  }

  // Handlers - Cedolini
  async function handleCreateCedolino(e: React.FormEvent) {
    e.preventDefault();
    if (!cedolinoForm.dipendenteNome || !cedolinoForm.nettoBusta) return;

    const selectedAz =
      aziende.find((a) => String(a.id) === String(cedolinoForm.aziendaId)) ||
      aziende[0];

    const payload = {
      ...cedolinoForm,
      aziendaId: selectedAz?.id || 1,
      aziendaNome: selectedAz?.ragioneSociale || "Azienda Cliente",
    };

    const res = await fetch("/api/cedolini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.data) {
      setCedolini((prev) => [json.data, ...prev]);
    }
    setIsCedolinoModalOpen(false);
    setCedolinoForm({
      aziendaId: String(aziende[0]?.id || 1),
      dipendenteNome: "",
      qualifica: "Impiegato Amministrativo",
      meseCompetenza: "Ottobre 2026",
      nettoBusta: "",
      costoAzienda: "",
      stato: "Elaborato",
    });
  }

  // Handlers - CSV / XLSX Bulk Import
  function handleFileUpload(file: File) {
    setImportStatus(null);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
          defval: "",
        });
        setCsvPreview(data);
      };
      reader.readAsBinaryString(file);
    } else {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvPreview(results.data);
        },
      });
    }
  }

  function loadSampleCsvData() {
    const sampleRows: Record<string, string>[] = [
      {
        ragioneSociale: "Tecnologie Avanzate Adriatica S.r.l.",
        partitaIva: "03918270401",
        ccnl: "Metalmeccanica Industria",
        numeroDipendenti: "31",
        email: "hr@tecnologieadriatica.it",
        telefono: "+39 0541 781234",
        citta: "Rimini (RN)",
        posizioneInps: "6619283745",
        patInail: "99182734/11",
      },
      {
        ragioneSociale: "Boutique Moda Milano S.r.l.",
        partitaIva: "09182730154",
        ccnl: "Commercio e Terziario (Confcommercio)",
        numeroDipendenti: "14",
        email: "amm@boutiquemilano.it",
        telefono: "+39 02 7612398",
        citta: "Milano (MI)",
        posizioneInps: "4918273111",
        patInail: "33445566/09",
      },
      {
        ragioneSociale: "Cantieri Navali Tirreno S.p.A.",
        partitaIva: "05192830492",
        ccnl: "Metalmeccanica Industria",
        numeroDipendenti: "58",
        email: "personale@cantieritirreno.it",
        telefono: "+39 0586 441290",
        citta: "Livorno (LI)",
        posizioneInps: "4291827364",
        patInail: "77889900/25",
      },
    ];
    setCsvPreview(sampleRows);
    setImportStatus(
      "Tracciato di prova caricato (3 aziende). Verifica le colonne qui sotto e clicca su 'Esegui Importazione'."
    );
  }

  function downloadCsvTemplate() {
    const csvContent =
      "ragioneSociale,partitaIva,ccnl,numeroDipendenti,email,telefono,citta,posizioneInps,patInail\n" +
      '"Rossi & Partners S.r.l.","01234567890","Studi Professionali",12,"info@rossipartners.it","+39 02 1234567","Milano (MI)","4900112233","12345678/90"\n' +
      '"Verde Bio Agricola S.r.l.","09876543210","Commercio e Terziario",24,"hr@verdebio.it","+39 051 9876543","Bologna (BO)","2099887766","87654321/01"';
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tracciato_aziende_studio.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function confirmBulkImport() {
    if (csvPreview.length === 0) return;

    const normalized = csvPreview.map((row) => ({
      ragioneSociale:
        row.ragioneSociale ||
        row.RagioneSociale ||
        row["Ragione Sociale"] ||
        row.azienda ||
        "Nuova Azienda S.r.l.",
      partitaIva:
        row.partitaIva ||
        row.PartitaIva ||
        row["Partita IVA"] ||
        row.piva ||
        String(Math.floor(10000000000 + Math.random() * 89999999999)),
      ccnl:
        row.ccnl ||
        row.CCNL ||
        "Commercio e Terziario (Confcommercio)",
      numeroDipendenti:
        Number(
          row.numeroDipendenti ||
            row.dipendenti ||
            row["Numero Dipendenti"] ||
            5
        ) || 5,
      email: row.email || row.Email || "",
      telefono: row.telefono || row.Telefono || "",
      citta: row.citta || row.Citta || row["Città"] || "",
      stato: "Attiva",
      posizioneInps: row.posizioneInps || row.INPS || "",
      patInail: row.patInail || row.INAIL || "",
    }));

    const res = await fetch("/api/aziende", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: normalized }),
    });
    const json = await res.json();
    if (Array.isArray(json.data)) {
      setAziende((prev) => [...json.data, ...prev]);
      setImportStatus(
        `Acquisite ${json.data.length} nuove anagrafiche aziendali nel registro di Studio.`
      );
      setCsvPreview([]);
    }
  }

  const navItems = [
    {
      id: "dashboard",
      label: "Quadro Sinottico",
      icon: LayoutGrid,
      badge: null,
    },
    {
      id: "aziende",
      label: "Aziende & Deleghe",
      icon: Building2,
      badge: String(aziende.length),
    },
    {
      id: "scadenzario",
      label: "Scadenzario Fiscale",
      icon: Calendar,
      badge:
        kpis.scadenzePendenti > 0 ? String(kpis.scadenzePendenti) : null,
      urgent: kpis.scadenzeUrgenti > 0,
    },
    {
      id: "cedolini",
      label: "Libro Unico (LUL)",
      icon: Receipt,
      badge: String(cedolini.length),
    },
    {
      id: "import",
      label: "Acquisizione CSV",
      icon: FileSpreadsheet,
      badge: null,
    },
  ];

  const activeTitle = {
    dashboard: "Quadro Sinottico di Studio",
    aziende: "Registro Aziende & Posizioni Previdenziali",
    scadenzario: "Scadenzario Fiscale e Adempimenti Mensili",
    cedolini: "Libro Unico del Lavoro & Prospetti Paga",
    import: "Importazione Massiva Anagrafiche (CSV / Excel)",
  }[activeTab];

  const activeSubtitle = {
    dashboard:
      "Controllo direzionale su organico gestito, riparto CCNL, stato elaborazione LUL e flussi F24.",
    aziende:
      "Gestione completa delle deleghe attive, matricole INPS, codici ditta PAT INAIL e contratti applicati.",
    scadenzario:
      "Pianificazione cronologica verticale di versamenti F24, trasmissioni UNIEMENS e autoliquidazioni INAIL.",
    cedolini:
      "Riepilogo cedolini elaborati, netto in busta e cuneo contributivo per azienda cliente.",
    import:
      "Acquisizione strutturata da tracciati esterni per l'onboarding rapido di nuovi pacchetti clienti.",
  }[activeTab];

  return (
    <div className="min-h-screen flex bg-[#F7F7F5] text-[#111827]">
      {/* LEFT VERTICAL SIDEBAR — Architectural & Institutional */}
      <aside className="w-64 shrink-0 border-r border-[#E4E4E0] bg-white flex flex-col justify-between sticky top-0 h-screen select-none">
        <div>
          {/* Studio Brand Header */}
          <div className="px-5 py-5 border-b border-[#E4E4E0]">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#111827] text-white flex items-center justify-center font-mono text-xs font-semibold tracking-tighter">
                CDL
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-[#111827] leading-none">
                  Studio Di Tolla
                </div>
                <div className="text-[11px] text-[#6B7280] mt-1 font-medium">
                  Consulenti del Lavoro
                </div>
              </div>
            </div>
          </div>

          {/* Period Indicator */}
          <div className="px-5 py-3 border-b border-[#F0F0EC] bg-[#FAFAF8] flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
              Periodo Fiscale
            </span>
            <span className="font-mono text-xs font-semibold text-[#111827]">
              NOV 2026
            </span>
          </div>

          {/* Vertical Navigation */}
          <div className="p-3 space-y-1">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
              Gestione Operativa
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ActiveTab)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#111827] text-white"
                      : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? "text-white" : "text-[#6B7280]"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                        isActive
                          ? "bg-white/15 text-white"
                          : item.urgent
                          ? "bg-[#FEF2F2] text-[#B91C1C] font-semibold"
                          : "bg-[#F3F4F6] text-[#4B5563]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Vertical Studio Skill / Progress Tracker in Sidebar */}
          <div className="mx-3 mt-4 p-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAF8]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#374151]">
                Avanzamento Mensile
              </span>
              <span className="font-mono text-xs font-bold text-[#111827]">
                {kpis.percentualeChiusura}%
              </span>
            </div>

            {/* Vertical Step Checklist */}
            <div className="mt-3 space-y-2.5 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[#D1D5DB]">
              {[
                { label: "Acquisizione Presenze", done: true },
                { label: "Elaborazione LUL Ott.", done: true },
                {
                  label: "Quadratura Deleghe F24",
                  done: kpis.percentualeChiusura >= 50,
                },
                {
                  label: "Invio Flussi UNIEMENS",
                  done: kpis.percentualeChiusura === 100,
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 relative z-10"
                >
                  <div
                    className={`h-3.5 w-3.5 rounded-full flex items-center justify-center border ${
                      step.done
                        ? "bg-[#15803D] border-[#15803D] text-white"
                        : "bg-white border-[#9CA3AF]"
                    }`}
                  >
                    {step.done && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                  <span
                    className={`text-xs ${
                      step.done
                        ? "text-[#111827] font-medium"
                        : "text-[#6B7280]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: DB & Practitioner Info */}
        <div className="p-4 border-t border-[#E4E4E0] space-y-3 bg-[#FAFAF8]">
          <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>Motore Dati</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[#111827] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
              {dbSource === "neon" ? "Neon Postgres" : "Drizzle Active"}
            </span>
          </div>
          <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#111827]">
                Dott. R. Di Tolla
              </div>
              <div className="text-[11px] text-[#6B7280]">
                Albo CDL • Sede Principale
              </div>
            </div>
            <Scale className="h-4 w-4 text-[#9CA3AF]" />
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE COLUMN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Action & Context Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#E4E4E0] px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-0.5">
              <span>Studio Di Tolla</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#111827] font-medium">{activeTitle}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#111827]">
              {activeTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsScadenzaModalOpen(true)}
              className="px-3.5 py-2 rounded-lg border border-[#D1D5DB] bg-white text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-[#6B7280]" />
              Nuova Scadenza
            </button>
            <button
              onClick={() => setIsCedolinoModalOpen(true)}
              className="px-3.5 py-2 rounded-lg border border-[#D1D5DB] bg-white text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition flex items-center gap-1.5"
            >
              <Receipt className="h-3.5 w-3.5 text-[#6B7280]" />
              Registra Cedolino
            </button>
            <button
              onClick={openNewAziendaModal}
              className="px-4 py-2 rounded-lg bg-[#111827] text-xs font-semibold text-white hover:bg-[#1F2937] transition flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuova Azienda
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main ref={contentRef} className="p-8 max-w-[1400px] w-full mx-auto space-y-8">
          <p className="text-sm text-[#4B5563] -mt-4">{activeSubtitle}</p>

          {/* =========================================================
              VIEW 1: QUADRO SINOTTICO (DASHBOARD DIREZIONALE)
             ========================================================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Executive Financial & Operational Ledger Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white rounded-xl border border-[#E4E4E0] divide-y sm:divide-y-0 sm:divide-x divide-[#E4E4E0]">
                <div className="p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#6B7280]">
                    <span>DELEGHE AZIENDALI</span>
                    <Building2 className="h-4 w-4 text-[#9CA3AF]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2.5">
                    <span className="text-3xl font-bold tracking-tight text-[#111827] font-mono tabular-nums">
                      {kpis.totaleAziende}
                    </span>
                    <span className="text-xs font-medium text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded">
                      {kpis.aziendeAttive} attive
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-[#6B7280]">
                    Posizioni INPS e PAT INAIL verificate
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#6B7280]">
                    <span>ORGANICO AMMINISTRATO</span>
                    <FileText className="h-4 w-4 text-[#9CA3AF]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2.5">
                    <span className="text-3xl font-bold tracking-tight text-[#111827] font-mono tabular-nums">
                      {kpis.totaleDipendenti}
                    </span>
                    <span className="text-xs text-[#6B7280]">lavoratori</span>
                  </div>
                  <div className="mt-2 text-xs text-[#6B7280]">
                    Media{" "}
                    {kpis.totaleAziende > 0
                      ? Math.round(kpis.totaleDipendenti / kpis.totaleAziende)
                      : 0}{" "}
                    dipendenti per azienda
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#6B7280]">
                    <span>MONTE DELEGHE F24 (NOV)</span>
                    <Scale className="h-4 w-4 text-[#9CA3AF]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-[#111827] font-mono tabular-nums">
                      € {formatEuro(kpis.totaleVersamentiF24)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-[#6B7280]">
                    Ritenute IRPEF, contributi INPS e premi INAIL
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#6B7280]">
                    <span>SCADENZE DA EVADERE</span>
                    <Calendar className="h-4 w-4 text-[#9CA3AF]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2.5">
                    <span className="text-3xl font-bold tracking-tight text-[#111827] font-mono tabular-nums">
                      {kpis.scadenzePendenti}
                    </span>
                    {kpis.scadenzeUrgenti > 0 && (
                      <span className="text-xs font-semibold text-[#B91C1C] bg-[#FEF2F2] px-2 py-0.5 rounded">
                        {kpis.scadenzeUrgenti} urgenti
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-[#6B7280]">
                    {kpis.scadenzeEvaseCount} adempimenti già evasi nel mese
                  </div>
                </div>
              </div>

              {/* MAIN 12-COLUMN EDITORIAL GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT 7 COLS: VERTICAL GRAPHIC SKILLS & CCNL BREAKDOWN + AZIENDE LEDGER */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Vertical Graphic Chart Card: Riparto Organico e Competenze per CCNL */}
                  <div className="bg-white rounded-xl border border-[#E4E4E0] p-6">
                    <div className="flex items-center justify-between border-b border-[#F0F0EC] pb-4">
                      <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827]">
                          Analisi Verticale Organico per CCNL
                        </h2>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Incidenza lavoratori gestiti e specializzazione contrattuale dello Studio
                        </p>
                      </div>
                      <span className="font-mono text-xs text-[#6B7280]">
                        Totale: {kpis.totaleDipendenti} unità
                      </span>
                    </div>

                    {/* Vertical Column Chart + Vertical Skill Meters */}
                    <div
                      ref={barsRef}
                      className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 items-end pt-4"
                    >
                      {ccnlStats.slice(0, 6).map((item, idx) => (
                        <div
                          key={item.name}
                          className="flex flex-col items-center group"
                        >
                          <div className="font-mono text-xs font-bold text-[#111827] mb-1.5">
                            {item.dipendenti}
                          </div>
                          {/* Vertical Graphic Track */}
                          <div className="w-full h-36 bg-[#F3F4F6] rounded-lg p-1 flex items-end overflow-hidden border border-[#E5E7EB]">
                            <div
                              style={{ height: `${item.heightPct}%` }}
                              className={`gsap-vbar w-full rounded transition-all ${
                                idx === 0
                                  ? "bg-[#111827]"
                                  : idx === 1
                                  ? "bg-[#374151]"
                                  : "bg-[#6B7280]"
                              }`}
                            />
                          </div>
                          <div className="mt-2.5 text-center w-full">
                            <div className="font-mono text-[11px] font-semibold text-[#111827]">
                              {item.sharePct}%
                            </div>
                            <div
                              className="text-[11px] text-[#4B5563] font-medium truncate mt-0.5"
                              title={item.name}
                            >
                              {item.name}
                            </div>
                            <div className="text-[10px] text-[#9CA3AF]">
                              {item.aziendeCount}{" "}
                              {item.aziendeCount === 1 ? "azienda" : "aziende"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Vertical Skill & Compliance Bars (Capacità Operativa Studio) */}
                    <div className="mt-6 pt-5 border-t border-[#F0F0EC] grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        {
                          label: "Copertura Deleghe F24",
                          code: "ENTRATEL / I24",
                          pct: 94,
                        },
                        {
                          label: "Conformità Flussi INPS",
                          code: "UNIEMENS / LUL",
                          pct: 98,
                        },
                        {
                          label: "Autoliquidazione INAIL",
                          code: "ALPI / BASI SALARIALI",
                          pct: 89,
                        },
                      ].map((skill) => (
                        <div
                          key={skill.label}
                          className="p-3 rounded-lg bg-[#FAFAF8] border border-[#E5E7EB]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-semibold text-[#6B7280]">
                              {skill.code}
                            </span>
                            <span className="font-mono text-xs font-bold text-[#111827]">
                              {skill.pct}%
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-[#111827] mt-1">
                            {skill.label}
                          </div>
                          <div className="mt-2 h-1.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                            <div
                              style={{ width: `${skill.pct}%` }}
                              className="h-full bg-[#111827] rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Aziende Clienti Ledger */}
                  <div className="bg-white rounded-xl border border-[#E4E4E0] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#E4E4E0] flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827]">
                          Anagrafiche Aziende Principali
                        </h2>
                        <p className="text-xs text-[#6B7280]">
                          Clicca su una riga per aprire il fascicolo verticale completo
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("aziende")}
                        className="text-xs font-semibold text-[#111827] hover:underline flex items-center gap-1"
                      >
                        Vedi registro ({aziende.length})
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="divide-y divide-[#E4E4E0]">
                      {aziende.slice(0, 5).map((az) => (
                        <div
                          key={az.id}
                          onClick={() => setSelectedAzienda(az)}
                          className="px-6 py-3.5 flex items-center justify-between hover:bg-[#F9FAFB] cursor-pointer transition"
                        >
                          <div className="min-w-0 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[#111827] truncate">
                                {az.ragioneSociale}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                  az.stato === "Attiva"
                                    ? "bg-[#F0FDF4] text-[#15803D]"
                                    : "bg-[#FEF3C7] text-[#B45309]"
                                }`}
                              >
                                {az.stato}
                              </span>
                            </div>
                            <div className="text-xs text-[#6B7280] mt-0.5 flex items-center gap-2 font-mono">
                              <span>P.IVA {az.partitaIva}</span>
                              <span>•</span>
                              <span className="font-sans">{az.ccnl}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-5 shrink-0">
                            <div className="text-right">
                              <div className="font-mono text-sm font-bold text-[#111827]">
                                {az.numeroDipendenti}
                              </div>
                              <div className="text-[10px] uppercase text-[#6B7280]">
                                Dipendenti
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT 5 COLS: VERTICAL CHRONOLOGICAL TIMELINE OF FISCAL DEADLINES */}
                <div className="lg:col-span-5">
                  <div className="bg-white rounded-xl border border-[#E4E4E0] p-6 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-[#F0F0EC] pb-4">
                        <div>
                          <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827]">
                            Timeline Verticale Scadenze
                          </h2>
                          <p className="text-xs text-[#6B7280] mt-0.5">
                            Adempimenti fiscali e contributivi in ordine cronologico
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab("scadenzario")}
                          className="text-xs font-semibold text-[#111827] hover:underline"
                        >
                          Calendario →
                        </button>
                      </div>

                      {/* Vertical Timeline Rail */}
                      <div className="mt-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-[#E5E7EB] space-y-6">
                        {scadenze.slice(0, 6).map((sc) => (
                          <div
                            key={sc.id}
                            className="relative pl-10 group"
                          >
                            {/* Timeline Node */}
                            <button
                              type="button"
                              onClick={() => handleToggleScadenza(sc)}
                              title="Cambia stato adempimento"
                              className={`absolute left-1.5 top-1 h-5 w-5 rounded-full border flex items-center justify-center transition ${
                                sc.completata
                                  ? "bg-[#15803D] border-[#15803D] text-white"
                                  : sc.stato === "Urgente"
                                  ? "bg-[#FEF2F2] border-[#B91C1C] text-[#B91C1C]"
                                  : "bg-white border-[#9CA3AF] hover:border-[#111827]"
                              }`}
                            >
                              {sc.completata ? (
                                <Check className="h-3 w-3 stroke-[3]" />
                              ) : sc.stato === "Urgente" ? (
                                <span className="h-2 w-2 rounded-full bg-[#B91C1C]" />
                              ) : null}
                            </button>

                            {/* Card Body */}
                            <div
                              onClick={() => handleToggleScadenza(sc)}
                              className={`cursor-pointer rounded-lg border p-3.5 transition ${
                                sc.completata
                                  ? "border-[#E5E7EB] bg-[#FAFAF8] opacity-65"
                                  : sc.stato === "Urgente"
                                  ? "border-[#FECACA] bg-[#FFFBFB] hover:border-[#F87171]"
                                  : "border-[#E5E7EB] bg-white hover:border-[#111827]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#111827] border border-[#E5E7EB]">
                                    {sc.tipo}
                                  </span>
                                  <span className="font-mono text-xs font-semibold text-[#4B5563]">
                                    {formatDateIt(sc.dataScadenza)}
                                  </span>
                                </div>
                                {Number(sc.importo) > 0 && (
                                  <span className="font-mono text-xs font-bold text-[#111827]">
                                    € {formatEuro(sc.importo)}
                                  </span>
                                )}
                              </div>

                              <div
                                className={`text-sm font-semibold mt-1.5 ${
                                  sc.completata
                                    ? "line-through text-[#6B7280]"
                                    : "text-[#111827]"
                                }`}
                              >
                                {sc.titolo}
                              </div>

                              <div className="text-xs text-[#6B7280] mt-1 flex items-center justify-between">
                                <span>{sc.aziendaNome}</span>
                                <span className="text-[11px] font-medium underline opacity-0 group-hover:opacity-100 transition">
                                  {sc.completata ? "Riapri" : "Segna evasa"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#F0F0EC] flex items-center justify-between text-xs text-[#6B7280]">
                      <span>Prossima scadenza fiscale unificata:</span>
                      <span className="font-mono font-bold text-[#111827]">
                        16 Novembre 2026
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              VIEW 2: REGISTRO AZIENDE & DELEGHE (CRUD)
             ========================================================= */}
          {activeTab === "aziende" && (
            <div className="bg-white rounded-xl border border-[#E4E4E0] overflow-hidden">
              {/* Toolbar */}
              <div className="p-5 border-b border-[#E4E4E0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAFAF8]">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca ragione sociale, P.IVA, matricola INPS o città..."
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white pl-9 pr-4 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:border-[#111827] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#6B7280] mr-1" />
                  {["Tutti", "Attiva", "In Onboarding", "Sospesa"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatoFilter(st)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        statoFilter === st
                          ? "bg-[#111827] text-white"
                          : "bg-white border border-[#D1D5DB] text-[#4B5563] hover:bg-[#F3F4F6]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* High-Contrast Professional Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E4E4E0] bg-[#FAFAF8] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      <th className="py-3.5 pl-6 pr-4">Ragione Sociale & Città</th>
                      <th className="py-3.5 px-4">Partita IVA</th>
                      <th className="py-3.5 px-4">Posizioni INPS / INAIL</th>
                      <th className="py-3.5 px-4">CCNL Applicato</th>
                      <th className="py-3.5 px-4 text-right">Organico</th>
                      <th className="py-3.5 px-4">Stato</th>
                      <th className="py-3.5 pl-4 pr-6 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E0] text-sm">
                    {filteredAziende.map((az) => (
                      <tr
                        key={az.id}
                        onClick={() => setSelectedAzienda(az)}
                        className="hover:bg-[#F9FAFB] cursor-pointer transition"
                      >
                        <td className="py-4 pl-6 pr-4">
                          <div className="font-semibold text-[#111827]">
                            {az.ragioneSociale}
                          </div>
                          <div className="text-xs text-[#6B7280] mt-0.5">
                            {az.citta || "Sede Legale"} • {az.email || "—"}
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-xs font-medium text-[#111827]">
                          {az.partitaIva}
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-[#4B5563]">
                          <div>INPS: {az.posizioneInps || "—"}</div>
                          <div className="text-[#6B7280]">
                            PAT: {az.patInail || "—"}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-block rounded border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 text-xs font-medium text-[#374151]">
                            {az.ccnl}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-[#111827]">
                          {az.numeroDipendenti}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                              az.stato === "Attiva"
                                ? "bg-[#F0FDF4] text-[#15803D]"
                                : az.stato === "In Onboarding"
                                ? "bg-[#FEF3C7] text-[#B45309]"
                                : "bg-[#FEF2F2] text-[#B91C1C]"
                            }`}
                          >
                            {az.stato}
                          </span>
                        </td>
                        <td className="py-4 pl-4 pr-6 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={(e) => openEditAziendaModal(az, e)}
                              className="p-1.5 rounded border border-[#E5E7EB] bg-white text-[#4B5563] hover:text-[#111827] hover:border-[#111827] transition"
                              title="Modifica anagrafica"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteAzienda(az.id, e)}
                              className="p-1.5 rounded border border-[#E5E7EB] bg-white text-[#4B5563] hover:text-[#B91C1C] hover:border-[#B91C1C] transition"
                              title="Rimuovi delega"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================
              VIEW 3: SCADENZARIO FISCALE VERTICALE PER DATA
             ========================================================= */}
          {activeTab === "scadenzario" && (
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="bg-white rounded-xl border border-[#E4E4E0] p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#6B7280] mr-2">
                    Tributo / Flusso:
                  </span>
                  {["Tutti", "F24", "UNIEMENS", "INAIL", "Altro"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setScadenzaTipoFilter(t)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        scadenzaTipoFilter === t
                          ? "bg-[#111827] text-white"
                          : "bg-[#F3F4F6] text-[#4B5563] hover:text-[#111827]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  {(["Tutte", "Aperte", "Evase"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setScadenzaStatoFilter(st)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                        scadenzaStatoFilter === st
                          ? "border-[#111827] bg-[#111827] text-white"
                          : "border-[#D1D5DB] bg-white text-[#4B5563]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chronological Date Groups (Vertical Layout) */}
              <div className="space-y-6">
                {groupedScadenze.map(([dateStr, items]) => (
                  <div
                    key={dateStr}
                    className="bg-white rounded-xl border border-[#E4E4E0] overflow-hidden"
                  >
                    <div className="px-6 py-3 bg-[#FAFAF8] border-b border-[#E4E4E0] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold uppercase px-2.5 py-1 rounded bg-[#111827] text-white">
                          {formatDateIt(dateStr)}
                        </span>
                        <span className="text-xs font-medium text-[#4B5563]">
                          {items.length}{" "}
                          {items.length === 1
                            ? "adempimento previsto"
                            : "adempimenti previsti"}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#111827]">
                        Totale data: €{" "}
                        {formatEuro(
                          items.reduce(
                            (acc, x) => acc + (parseFloat(String(x.importo || 0)) || 0),
                            0
                          )
                        )}
                      </span>
                    </div>

                    <div className="divide-y divide-[#E4E4E0]">
                      {items.map((sc) => (
                        <div
                          key={sc.id}
                          className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                            sc.completata ? "bg-[#FAFAF8] opacity-65" : "bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <button
                              onClick={() => handleToggleScadenza(sc)}
                              className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition ${
                                sc.completata
                                  ? "bg-[#15803D] border-[#15803D] text-white"
                                  : "bg-white border-[#9CA3AF] hover:border-[#111827]"
                              }`}
                            >
                              {sc.completata && (
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              )}
                            </button>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#F3F4F6] text-[#111827]">
                                  {sc.tipo}
                                </span>
                                {sc.stato === "Urgente" && !sc.completata && (
                                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FEF2F2] text-[#B91C1C]">
                                    Priorità Alta
                                  </span>
                                )}
                                <h3
                                  className={`text-sm font-semibold ${
                                    sc.completata
                                      ? "line-through text-[#6B7280]"
                                      : "text-[#111827]"
                                  }`}
                                >
                                  {sc.titolo}
                                </h3>
                              </div>
                              <div className="text-xs text-[#4B5563] mt-1">
                                Azienda:{" "}
                                <span className="font-medium text-[#111827]">
                                  {sc.aziendaNome}
                                </span>
                                {sc.note ? ` — ${sc.note}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                            <div className="text-right">
                              <div className="font-mono text-sm font-bold text-[#111827]">
                                {Number(sc.importo) > 0
                                  ? `€ ${formatEuro(sc.importo)}`
                                  : "Flusso Telematico"}
                              </div>
                              <div className="text-[10px] uppercase text-[#6B7280]">
                                {sc.completata ? "Evaso" : "Da trasmettere"}
                              </div>
                            </div>

                            <button
                              onClick={() => handleToggleScadenza(sc)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                sc.completata
                                  ? "border-[#D1D5DB] bg-white text-[#4B5563]"
                                  : "border-[#111827] bg-[#111827] text-white hover:bg-[#1F2937]"
                              }`}
                            >
                              {sc.completata ? "Riapri" : "Segna Evasa"}
                            </button>

                            <button
                              onClick={() => handleDeleteScadenza(sc.id)}
                              className="p-1.5 text-[#9CA3AF] hover:text-[#B91C1C] transition"
                              title="Elimina scadenza"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================
              VIEW 4: LIBRO UNICO DEL LAVORO & CEDOLINI
             ========================================================= */}
          {activeTab === "cedolini" && (
            <div className="space-y-6">
              {/* Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 bg-white rounded-xl border border-[#E4E4E0] divide-y sm:divide-y-0 sm:divide-x divide-[#E4E4E0]">
                <div className="p-5">
                  <div className="text-xs font-medium text-[#6B7280]">
                    PROSPETTI ELABORATI
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#111827]">
                    {cedolini.length}
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-xs font-medium text-[#6B7280]">
                    TOTALE NETTO IN BUSTA
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#15803D]">
                    € {formatEuro(kpis.nettoTotale)}
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-xs font-medium text-[#6B7280]">
                    COSTO COMPLESSIVO AZIENDA
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#111827]">
                    € {formatEuro(kpis.costoLavoroTotale)}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#E4E4E0] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E4E4E0] bg-[#FAFAF8] text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      <th className="py-3.5 pl-6 pr-4">Lavoratore & Qualifica</th>
                      <th className="py-3.5 px-4">Azienda Datrice</th>
                      <th className="py-3.5 px-4">Competenza</th>
                      <th className="py-3.5 px-4 text-right">Netto Busta</th>
                      <th className="py-3.5 px-4 text-right">Costo Azienda</th>
                      <th className="py-3.5 px-4">Incidenza Netto / Costo</th>
                      <th className="py-3.5 pl-4 pr-6 text-right">Stato LUL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E0] text-sm">
                    {cedolini.map((c) => {
                      const netto = parseFloat(String(c.nettoBusta)) || 0;
                      const costo = parseFloat(String(c.costoAzienda)) || 1;
                      const ratio = Math.min(Math.round((netto / costo) * 100), 100);
                      return (
                        <tr key={c.id} className="hover:bg-[#F9FAFB]">
                          <td className="py-4 pl-6 pr-4">
                            <div className="font-semibold text-[#111827]">
                              {c.dipendenteNome}
                            </div>
                            <div className="text-xs text-[#6B7280]">
                              {c.qualifica}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs font-medium text-[#374151]">
                            {c.aziendaNome}
                          </td>
                          <td className="py-4 px-4 font-mono text-xs text-[#4B5563]">
                            {c.meseCompetenza}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-[#15803D]">
                            € {formatEuro(c.nettoBusta)}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-semibold text-[#111827]">
                            € {formatEuro(c.costoAzienda)}
                          </td>
                          <td className="py-4 px-4 w-44">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${ratio}%` }}
                                  className="h-full bg-[#111827]"
                                />
                              </div>
                              <span className="font-mono text-xs text-[#6B7280]">
                                {ratio}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4 pl-4 pr-6 text-right">
                            <span className="inline-block rounded px-2.5 py-0.5 text-xs font-semibold bg-[#F3F4F6] text-[#111827]">
                              {c.stato}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================
              VIEW 5: IMPORTAZIONE MASSIVA CSV / EXCEL
             ========================================================= */}
          {activeTab === "import" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left 4 cols: Vertical Instructions & Tracciato Standard */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white rounded-xl border border-[#E4E4E0] p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#111827]">
                    Procedura Acquisizione Massiva
                  </h3>
                  <div className="space-y-4 text-xs text-[#4B5563]">
                    <div className="flex gap-3">
                      <span className="font-mono font-bold text-[#111827]">
                        01.
                      </span>
                      <p>
                        Scarica il tracciato CSV standardizzato oppure carica un
                        foglio Excel (`.xlsx`) esportato dal tuo gestionale paghe.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-mono font-bold text-[#111827]">
                        02.
                      </span>
                      <p>
                        Verifica l&apos;anteprima delle colonne (Ragione Sociale,
                        P.IVA, Matricola INPS, PAT INAIL, CCNL, Organico).
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="font-mono font-bold text-[#111827]">
                        03.
                      </span>
                      <p>
                        Conferma la scrittura nel database di Studio in un&apos;unica
                        transazione.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E4E4E0] flex flex-col gap-2">
                    <button
                      onClick={downloadCsvTemplate}
                      className="w-full py-2.5 px-4 rounded-lg border border-[#D1D5DB] bg-white text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB] transition flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Scarica Tracciato CSV Ufficiale
                    </button>
                    <button
                      onClick={loadSampleCsvData}
                      className="w-full py-2.5 px-4 rounded-lg bg-[#111827] text-xs font-semibold text-white hover:bg-[#1F2937] transition flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Carica Esempio (3 Aziende)
                    </button>
                  </div>
                </div>
              </div>

              {/* Right 8 cols: Dropzone & Preview Table */}
              <div className="lg:col-span-8 space-y-6">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className={`bg-white rounded-xl border-2 border-dashed p-10 text-center transition ${
                    isDragging
                      ? "border-[#111827] bg-[#F9FAFB]"
                      : "border-[#D1D5DB] hover:border-[#9CA3AF]"
                  }`}
                >
                  <div className="mx-auto h-11 w-11 rounded-lg bg-[#F3F4F6] flex items-center justify-center text-[#111827] mb-3">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-[#111827]">
                    Trascina qui il file CSV o Excel (.xlsx)
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Riconoscimento automatico delimitatori e intestazioni
                  </p>
                  <label className="mt-4 inline-block cursor-pointer rounded-lg border border-[#111827] bg-white px-4 py-2 text-xs font-semibold text-[#111827] hover:bg-[#111827] hover:text-white transition">
                    Seleziona file dal computer
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </label>
                </div>

                {importStatus && (
                  <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 flex items-center gap-2.5 text-xs font-medium text-[#15803D]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{importStatus}</span>
                  </div>
                )}

                {csvPreview.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#E4E4E0] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#E4E4E0] flex items-center justify-between bg-[#FAFAF8]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                        Anteprima Tracciato ({csvPreview.length} righe)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCsvPreview([])}
                          className="px-3 py-1.5 rounded-lg border border-[#D1D5DB] bg-white text-xs font-medium text-[#4B5563]"
                        >
                          Svuota
                        </button>
                        <button
                          onClick={confirmBulkImport}
                          className="px-4 py-1.5 rounded-lg bg-[#15803D] text-xs font-semibold text-white hover:bg-[#166534] transition"
                        >
                          Esegui Importazione ({csvPreview.length})
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[#E4E4E0] bg-[#FAFAF8] text-[#6B7280] uppercase">
                          <tr>
                            <th className="p-3.5">Ragione Sociale</th>
                            <th className="p-3.5">P.IVA</th>
                            <th className="p-3.5">CCNL</th>
                            <th className="p-3.5">Dip.</th>
                            <th className="p-3.5">Città</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4E4E0]">
                          {csvPreview.map((row, idx) => (
                            <tr key={idx}>
                              <td className="p-3.5 font-semibold text-[#111827]">
                                {row.ragioneSociale ||
                                  row["Ragione Sociale"] ||
                                  "—"}
                              </td>
                              <td className="p-3.5 font-mono">
                                {row.partitaIva || row["Partita IVA"] || "—"}
                              </td>
                              <td className="p-3.5">{row.ccnl || "Commercio"}</td>
                              <td className="p-3.5 font-mono font-bold">
                                {row.numeroDipendenti || "5"}
                              </td>
                              <td className="p-3.5 text-[#6B7280]">
                                {row.citta || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================
          VERTICAL RIGHT DRAWER: FASCICOLO AZIENDA (INSPECTION)
         ========================================================= */}
      {selectedAzienda && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/25 backdrop-blur-[1px]">
          <div className="w-full max-w-md bg-white h-full border-l border-[#E4E4E0] shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="p-6 border-b border-[#E4E4E0] flex items-start justify-between">
                <div>
                  <span className="font-mono text-[11px] font-semibold uppercase text-[#6B7280]">
                    Fascicolo Cliente #{selectedAzienda.id}
                  </span>
                  <h3 className="text-lg font-bold text-[#111827] mt-1">
                    {selectedAzienda.ragioneSociale}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAzienda(null)}
                  className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Key Identifiers */}
                <div className="grid grid-cols-2 gap-3 bg-[#FAFAF8] p-4 rounded-xl border border-[#E5E7EB]">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-[#6B7280]">
                      Partita IVA
                    </div>
                    <div className="font-mono text-sm font-bold text-[#111827] mt-0.5">
                      {selectedAzienda.partitaIva}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-[#6B7280]">
                      Organico Attivo
                    </div>
                    <div className="font-mono text-sm font-bold text-[#111827] mt-0.5">
                      {selectedAzienda.numeroDipendenti} dipendenti
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-[#6B7280]">
                      Matricola INPS
                    </div>
                    <div className="font-mono text-xs font-medium text-[#374151] mt-0.5">
                      {selectedAzienda.posizioneInps || "Non registrata"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-[#6B7280]">
                      PAT INAIL
                    </div>
                    <div className="font-mono text-xs font-medium text-[#374151] mt-0.5">
                      {selectedAzienda.patInail || "Non registrata"}
                    </div>
                  </div>
                </div>

                {/* CCNL & Contacts */}
                <div className="space-y-3 text-xs">
                  <div className="font-semibold uppercase tracking-wider text-[#6B7280]">
                    Contratto Collettivo & Recapiti
                  </div>
                  <div className="p-3 rounded-lg border border-[#E5E7EB] font-medium text-[#111827]">
                    {selectedAzienda.ccnl}
                  </div>
                  <div className="space-y-2 text-[#4B5563] pt-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-[#9CA3AF]" />
                      <span>{selectedAzienda.email || "Nessuna email"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-[#9CA3AF]" />
                      <span>
                        {selectedAzienda.telefono || "Nessun telefono"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-[#9CA3AF]" />
                      <span>{selectedAzienda.citta || "Sede in Italia"}</span>
                    </div>
                  </div>
                </div>

                {/* Scadenze Associate */}
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    Adempimenti Associati
                  </div>
                  {scadenze
                    .filter(
                      (s) =>
                        s.aziendaId === selectedAzienda.id ||
                        s.aziendaNome === selectedAzienda.ragioneSociale
                    )
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-lg border border-[#E5E7EB] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-[#111827]">
                            {s.titolo}
                          </div>
                          <div className="font-mono text-[#6B7280] mt-0.5">
                            {s.tipo} • {formatDateIt(s.dataScadenza)}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-[#111827]">
                          {Number(s.importo) > 0
                            ? `€ ${formatEuro(s.importo)}`
                            : "Telematico"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-[#E4E4E0] bg-[#FAFAF8] flex items-center justify-between">
              <button
                onClick={() => handleDeleteAzienda(selectedAzienda.id)}
                className="px-3.5 py-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-xs font-semibold text-[#B91C1C]"
              >
                Revoca Delega
              </button>
              <button
                onClick={() => openEditAziendaModal(selectedAzienda)}
                className="px-4 py-2 rounded-lg bg-[#111827] text-xs font-semibold text-white"
              >
                Modifica Scheda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SLIDE-OVER DRAWER: CREATE / EDIT AZIENDA
         ========================================================= */}
      {isAziendaModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px]">
          <div className="w-full max-w-lg bg-white h-full border-l border-[#E4E4E0] p-6 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-[#E4E4E0] pb-4">
                <h3 className="text-base font-bold text-[#111827]">
                  {editingAzienda
                    ? "Modifica Anagrafica Azienda"
                    : "Nuova Delega Aziendale"}
                </h3>
                <button
                  onClick={() => setIsAziendaModalOpen(false)}
                  className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                id="azienda-form"
                onSubmit={handleSaveAzienda}
                className="mt-5 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Ragione Sociale *
                  </label>
                  <input
                    type="text"
                    required
                    value={aziendaForm.ragioneSociale}
                    onChange={(e) =>
                      setAziendaForm({
                        ...aziendaForm,
                        ragioneSociale: e.target.value,
                      })
                    }
                    placeholder="Es. Officine Meccaniche Rossi S.r.l."
                    className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm text-[#111827] focus:border-[#111827] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Partita IVA *
                    </label>
                    <input
                      type="text"
                      required
                      value={aziendaForm.partitaIva}
                      onChange={(e) =>
                        setAziendaForm({
                          ...aziendaForm,
                          partitaIva: e.target.value,
                        })
                      }
                      placeholder="11 cifre"
                      className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm font-mono text-[#111827] focus:border-[#111827] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Numero Dipendenti
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={aziendaForm.numeroDipendenti}
                      onChange={(e) =>
                        setAziendaForm({
                          ...aziendaForm,
                          numeroDipendenti: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm font-mono text-[#111827] focus:border-[#111827] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    CCNL Applicato
                  </label>
                  <select
                    value={aziendaForm.ccnl}
                    onChange={(e) =>
                      setAziendaForm({ ...aziendaForm, ccnl: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2 text-sm text-[#111827] focus:border-[#111827] focus:outline-none"
                  >
                    {CCNL_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Matricola INPS
                    </label>
                    <input
                      type="text"
                      value={aziendaForm.posizioneInps}
                      onChange={(e) =>
                        setAziendaForm({
                          ...aziendaForm,
                          posizioneInps: e.target.value,
                        })
                      }
                      placeholder="4918273645"
                      className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm font-mono text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Codice PAT INAIL
                    </label>
                    <input
                      type="text"
                      value={aziendaForm.patInail}
                      onChange={(e) =>
                        setAziendaForm({
                          ...aziendaForm,
                          patInail: e.target.value,
                        })
                      }
                      placeholder="91827364/12"
                      className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm font-mono text-[#111827]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Email Referente HR
                    </label>
                    <input
                      type="email"
                      value={aziendaForm.email}
                      onChange={(e) =>
                        setAziendaForm({ ...aziendaForm, email: e.target.value })
                      }
                      placeholder="amministrazione@azienda.it"
                      className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Città / Provincia
                    </label>
                    <input
                      type="text"
                      value={aziendaForm.citta}
                      onChange={(e) =>
                        setAziendaForm({ ...aziendaForm, citta: e.target.value })
                      }
                      placeholder="Milano (MI)"
                      className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm text-[#111827]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Stato Delega
                  </label>
                  <select
                    value={aziendaForm.stato}
                    onChange={(e) =>
                      setAziendaForm({ ...aziendaForm, stato: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2 text-sm text-[#111827]"
                  >
                    <option value="Attiva">Attiva</option>
                    <option value="In Onboarding">In Onboarding</option>
                    <option value="Sospesa">Sospesa</option>
                  </select>
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-[#E4E4E0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAziendaModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#D1D5DB] text-xs font-semibold text-[#4B5563]"
              >
                Annulla
              </button>
              <button
                type="submit"
                form="azienda-form"
                className="px-5 py-2 rounded-lg bg-[#111827] text-xs font-semibold text-white hover:bg-[#1F2937]"
              >
                {editingAzienda ? "Salva Variazioni" : "Registra Azienda"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SLIDE-OVER DRAWER: NUOVA SCADENZA
         ========================================================= */}
      {isScadenzaModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px]">
          <div className="w-full max-w-md bg-white h-full border-l border-[#E4E4E0] p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-[#E4E4E0] pb-4">
                <h3 className="text-base font-bold text-[#111827]">
                  Nuovo Adempimento in Scadenzario
                </h3>
                <button
                  onClick={() => setIsScadenzaModalOpen(false)}
                  className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                id="scadenza-form"
                onSubmit={handleCreateScadenza}
                className="mt-5 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Descrizione Adempimento *
                  </label>
                  <input
                    type="text"
                    required
                    value={scadenzaForm.titolo}
                    onChange={(e) =>
                      setScadenzaForm({
                        ...scadenzaForm,
                        titolo: e.target.value,
                      })
                    }
                    placeholder="Es. Versamento F24 Ritenute e Contributi"
                    className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm text-[#111827]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Modello / Flusso
                    </label>
                    <select
                      value={scadenzaForm.tipo}
                      onChange={(e) =>
                        setScadenzaForm({
                          ...scadenzaForm,
                          tipo: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2 text-sm text-[#111827]"
                    >
                      <option value="F24">Modello F24</option>
                      <option value="UNIEMENS">Flusso UNIEMENS</option>
                      <option value="INAIL">Autoliquidazione INAIL</option>
                      <option value="CU">Certificazione Unica</option>
                      <option value="770">Modello 770</option>
                      <option value="Altro">Altro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Data Scadenza *
                    </label>
                    <input
                      type="date"
                      required
                      value={scadenzaForm.dataScadenza}
                      onChange={(e) =>
                        setScadenzaForm({
                          ...scadenzaForm,
                          dataScadenza: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm font-mono text-[#111827]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Azienda Cliente
                  </label>
                  <select
                    value={scadenzaForm.aziendaId}
                    onChange={(e) =>
                      setScadenzaForm({
                        ...scadenzaForm,
                        aziendaId: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2 text-sm text-[#111827]"
                  >
                    <option value="">Tutte le Aziende Clienti</option>
                    {aziende.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.ragioneSociale}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Importo Delega (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={scadenzaForm.importo}
                    onChange={(e) =>
                      setScadenzaForm({
                        ...scadenzaForm,
                        importo: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm font-mono text-[#111827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Note Operative
                  </label>
                  <input
                    type="text"
                    value={scadenzaForm.note}
                    onChange={(e) =>
                      setScadenzaForm({
                        ...scadenzaForm,
                        note: e.target.value,
                      })
                    }
                    placeholder="Riferimento protocollo telematico..."
                    className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm text-[#111827]"
                  />
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-[#E4E4E0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsScadenzaModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#D1D5DB] text-xs font-semibold text-[#4B5563]"
              >
                Annulla
              </button>
              <button
                type="submit"
                form="scadenza-form"
                className="px-5 py-2 rounded-lg bg-[#111827] text-xs font-semibold text-white"
              >
                Pianifica Scadenza
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          SLIDE-OVER DRAWER: NUOVO CEDOLINO
         ========================================================= */}
      {isCedolinoModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-[1px]">
          <div className="w-full max-w-md bg-white h-full border-l border-[#E4E4E0] p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-[#E4E4E0] pb-4">
                <h3 className="text-base font-bold text-[#111827]">
                  Registrazione Prospetto Paga (LUL)
                </h3>
                <button
                  onClick={() => setIsCedolinoModalOpen(false)}
                  className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                id="cedolino-form"
                onSubmit={handleCreateCedolino}
                className="mt-5 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Azienda Datrice *
                  </label>
                  <select
                    value={cedolinoForm.aziendaId}
                    onChange={(e) =>
                      setCedolinoForm({
                        ...cedolinoForm,
                        aziendaId: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2 text-sm text-[#111827]"
                  >
                    {aziende.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.ragioneSociale}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Lavoratore (Nome e Cognome) *
                  </label>
                  <input
                    type="text"
                    required
                    value={cedolinoForm.dipendenteNome}
                    onChange={(e) =>
                      setCedolinoForm({
                        ...cedolinoForm,
                        dipendenteNome: e.target.value,
                      })
                    }
                    placeholder="Es. Marco Bianchi"
                    className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm text-[#111827]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Qualifica / Livello
                    </label>
                    <input
                      type="text"
                      value={cedolinoForm.qualifica}
                      onChange={(e) =>
                        setCedolinoForm({
                          ...cedolinoForm,
                          qualifica: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Mese Competenza
                    </label>
                    <input
                      type="text"
                      value={cedolinoForm.meseCompetenza}
                      onChange={(e) =>
                        setCedolinoForm({
                          ...cedolinoForm,
                          meseCompetenza: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm text-[#111827]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Netto in Busta (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={cedolinoForm.nettoBusta}
                      onChange={(e) =>
                        setCedolinoForm({
                          ...cedolinoForm,
                          nettoBusta: e.target.value,
                        })
                      }
                      placeholder="2150.00"
                      className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm font-mono text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">
                      Costo Azienda (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={cedolinoForm.costoAzienda}
                      onChange={(e) =>
                        setCedolinoForm({
                          ...cedolinoForm,
                          costoAzienda: e.target.value,
                        })
                      }
                      placeholder="3680.00"
                      className="w-full rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-sm font-mono text-[#111827]"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-[#E4E4E0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCedolinoModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#D1D5DB] text-xs font-semibold text-[#4B5563]"
              >
                Annulla
              </button>
              <button
                type="submit"
                form="cedolino-form"
                className="px-5 py-2 rounded-lg bg-[#111827] text-xs font-semibold text-white"
              >
                Registra Cedolino
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
