"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import gsap from "gsap";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Building2,
  CalendarClock,
  FileSpreadsheet,
  Users,
  Receipt,
  Plus,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit3,
  Download,
  TrendingUp,
  Briefcase,
  ShieldCheck,
  Sparkles,
  FileCheck2,
  X,
  Database,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import type { Azienda, Scadenza, Cedolino } from "@/lib/db/schema";
import {
  initialAziende,
  initialScadenze,
  initialCedolini,
} from "@/lib/db/seed-data";

type ActiveTab = "dashboard" | "aziende" | "scadenzario" | "cedolini" | "import";

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

  // Modal states - Azienda CRUD
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

  // Modal states - Scadenza
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

  // Modal states - Cedolino
  const [isCedolinoModalOpen, setIsCedolinoModalOpen] = useState(false);
  const [cedolinoForm, setCedolinoForm] = useState({
    aziendaId: "1",
    dipendenteNome: "",
    qualifica: "Impiegato Amministrativo",
    meseCompetenza: "Novembre 2026",
    nettoBusta: "",
    costoAzienda: "",
    stato: "Elaborato",
  });

  // CSV / XLSX Import state
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for GSAP
  const headerRef = useRef<HTMLDivElement>(null);
  const kpiCardsRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Load initial data from API
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
        // Keep seed fallback
      }
    }
    fetchAll();
  }, []);

  // GSAP Entrance Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
        );
      }
      if (kpiCardsRef.current) {
        gsap.fromTo(
          kpiCardsRef.current.children,
          { y: 24, opacity: 0, scale: 0.98 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: "power3.out",
          }
        );
      }
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (mainContentRef.current) {
      gsap.fromTo(
        mainContentRef.current,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }
      );
    }
  }, [activeTab]);

  // Computed KPIs
  const kpis = useMemo(() => {
    const aziendeAttive = aziende.filter((a) => a.stato === "Attiva").length;
    const totaleDipendenti = aziende.reduce(
      (acc, a) => acc + (Number(a.numeroDipendenti) || 0),
      0
    );
    const scadenzePendenti = scadenze.filter((s) => !s.completata).length;
    const scadenzeUrgenti = scadenze.filter(
      (s) => !s.completata && (s.stato === "Urgente" || s.priorita === "Alta")
    ).length;
    const totaleVersamentiF24 = scadenze
      .filter((s) => !s.completata)
      .reduce((acc, s) => acc + ( parseFloat(String(s.importo || "0")) || 0 ), 0);
    const costoLavoroTotale = cedolini.reduce(
      (acc, c) => acc + (parseFloat(String(c.costoAzienda || "0")) || 0),
      0
    );

    return {
      aziendeAttive,
      totaleAziende: aziende.length,
      totaleDipendenti,
      scadenzePendenti,
      scadenzeUrgenti,
      totaleVersamentiF24,
      totaleCedolini: cedolini.length,
      costoLavoroTotale,
    };
  }, [aziende, scadenze, cedolini]);

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
      .sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza));
  }, [scadenze, scadenzaTipoFilter]);

  // Handlers - Azienda CRUD
  function openNewAziendaModal() {
    setEditingAzienda(null);
    setAziendaForm({
      ragioneSociale: "",
      partitaIva: "",
      codiceFiscale: "",
      ccnl: CCNL_OPTIONS[0],
      numeroDipendenti: 5,
      email: "",
      telefono: "",
      citta: "",
      stato: "Attiva",
      posizioneInps: "",
      patInail: "",
    });
    setIsAziendaModalOpen(true);
  }

  function openEditAziendaModal(azienda: Azienda) {
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

  async function handleDeleteAzienda(id: number) {
    setAziende((prev) => prev.filter((a) => a.id !== id));
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
      meseCompetenza: "Novembre 2026",
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
      "Caricati 3 record di esempio pronti per l'importazione massiva."
    );
  }

  function downloadCsvTemplate() {
    const csvContent =
      "ragioneSociale,partitaIva,ccnl,numeroDipendenti,email,telefono,citta,posizioneInps,patInail\n" +
      '" Rossi & Partners S.r.l.","01234567890","Studi Professionali",12,"info@rossipartners.it","+39 02 1234567","Milano (MI)","4900112233","12345678/90"\n' +
      '" Verde Bio Agricola S.r.l.","09876543210","Commercio e Terziario",24,"hr@verdebio.it","+39 051 9876543","Bologna (BO)","2099887766","87654321/01"';
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_aziende_consulenti.csv";
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
        `Importate con successo ${json.data.length} aziende nel CRM!`
      );
      setCsvPreview([]);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Subtle Ambient Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="absolute top-1/4 right-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Top Navigation Header */}
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">
                  StudioLavoro<span className="text-indigo-400">CRM</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300">
                  <Sparkles className="h-3 w-3" /> Consulenti del Lavoro
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestione Aziende, Elaborazione Cedolini & Scadenzario Fiscale
              </p>
            </div>
          </div>

          {/* Navigation Pills */}
          <nav className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
            {[
              { id: "dashboard", label: "Dashboard KPI", icon: TrendingUp },
              { id: "aziende", label: "Aziende Clienti", icon: Building2 },
              { id: "scadenzario", label: "Scadenzario", icon: CalendarClock },
              { id: "cedolini", label: "Cedolini", icon: Receipt },
              { id: "import", label: "Import CSV", icon: FileSpreadsheet },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ActiveTab)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* DB Status & Quick Action */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-300">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span>Drizzle ORM</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <button
              onClick={openNewAziendaModal}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 transition"
            >
              <Plus className="h-4 w-4" />
              Nuova Azienda
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Top KPI Cards Row (Always visible for instant executive overview) */}
        <section
          ref={kpiCardsRef}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* KPI 1 */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 backdrop-blur-md transition hover:border-indigo-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Aziende Gestite
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white">
                {kpis.totaleAziende}
              </span>
              <span className="text-xs font-medium text-emerald-400 flex items-center">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {kpis.aziendeAttive} attive
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Copertura multi-CCNL con deleghe INPS/INAIL
            </p>
          </div>

          {/* KPI 2 */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 backdrop-blur-md transition hover:border-violet-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Dipendenti & Cedolini
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white">
                {kpis.totaleDipendenti}
              </span>
              <span className="text-xs font-medium text-violet-300">
                LUL attivi
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {kpis.totaleCedolini} cedolini campione registrati a sistema
            </p>
          </div>

          {/* KPI 3 */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 backdrop-blur-md transition hover:border-amber-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Scadenze Fiscali
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <CalendarClock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white">
                {kpis.scadenzePendenti}
              </span>
              <span className="text-xs font-medium text-amber-400">
                {kpis.scadenzeUrgenti} ad alta priorità
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              F24, Flussi UNIEMENS, Autoliquidazione INAIL
            </p>
          </div>

          {/* KPI 4 */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 backdrop-blur-md transition hover:border-emerald-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Monte Deleghe F24
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-white">
                €{" "}
                {kpis.totaleVersamentiF24.toLocaleString("it-IT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Totale versamenti in scadenza nel periodo corrente
            </p>
          </div>
        </section>

        {/* Dynamic Tab Content */}
        <div ref={mainContentRef}>
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Aziende Overview */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div>
                      <h2 className="text-base font-semibold text-white flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-400" />
                        Portafoglio Aziende Clienti
                      </h2>
                      <p className="text-xs text-slate-400">
                        Accesso rapido alle anagrafiche aziendali, posizioni INPS e PAT INAIL
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab("import")}
                        className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition flex items-center gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5 text-indigo-400" />
                        Import CSV
                      </button>
                      <button
                        onClick={() => setActiveTab("aziende")}
                        className="rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-600/30 transition"
                      >
                        Gestisci tutte ({aziende.length})
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <th className="pb-3 pr-4">Ragione Sociale & P.IVA</th>
                          <th className="pb-3 px-3">CCNL Applicato</th>
                          <th className="pb-3 px-3 text-center">Organico</th>
                          <th className="pb-3 pl-3 text-right">Stato</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {aziende.slice(0, 5).map((az) => (
                          <tr
                            key={az.id}
                            className="group hover:bg-slate-800/30 transition"
                          >
                            <td className="py-3.5 pr-4">
                              <div className="font-medium text-slate-100">
                                {az.ragioneSociale}
                              </div>
                              <div className="text-xs text-slate-400 font-mono">
                                P.IVA {az.partitaIva} • {az.citta || "Italia"}
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="inline-flex rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">
                                {az.ccnl}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <span className="font-semibold text-white">
                                {az.numeroDipendenti}
                              </span>{" "}
                              <span className="text-xs text-slate-400">dip.</span>
                            </td>
                            <td className="py-3.5 pl-3 text-right">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  az.stato === "Attiva"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}
                              >
                                {az.stato}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Cedolini Box */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-semibold text-white flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-violet-400" />
                        Ultimi Cedolini Elaborati (LUL)
                      </h2>
                      <p className="text-xs text-slate-400">
                        Riepilogo netto in busta e costo azienda mensile
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCedolinoModalOpen(true)}
                      className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20 transition flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Nuovo Cedolino
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {cedolini.slice(0, 4).map((ced) => (
                      <div
                        key={ced.id}
                        className="rounded-xl border border-slate-800/90 bg-slate-950/60 p-3.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-white">
                              {ced.dipendenteNome}
                            </span>
                            <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                              {ced.meseCompetenza}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {ced.aziendaNome}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs">
                          <div>
                            <span className="text-slate-400">Netto: </span>
                            <span className="font-semibold text-emerald-400">
                              € {Number(ced.nettoBusta).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Costo: </span>
                            <span className="font-medium text-slate-200">
                              € {Number(ced.costoAzienda).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Scadenzario Timeline */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-base font-semibold text-white flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-amber-400" />
                          Scadenzario Fiscale & Contributivo
                        </h2>
                        <p className="text-xs text-slate-400">
                          Clicca sullo stato per contrassegnare l&apos;adempimento come evaso
                        </p>
                      </div>
                      <button
                        onClick={() => setIsScadenzaModalOpen(true)}
                        className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Scadenza
                      </button>
                    </div>

                    <div className="space-y-3">
                      {scadenze.slice(0, 6).map((sc) => (
                        <div
                          key={sc.id}
                          onClick={() => handleToggleScadenza(sc)}
                          className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                            sc.completata
                              ? "border-slate-800/60 bg-slate-950/40 opacity-60"
                              : sc.stato === "Urgente"
                              ? "border-rose-500/30 bg-rose-950/15 hover:border-rose-500/50"
                              : "border-slate-800 bg-slate-950/70 hover:border-indigo-500/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <button
                                type="button"
                                className="mt-0.5 text-slate-400 hover:text-emerald-400"
                              >
                                {sc.completata ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                ) : sc.stato === "Urgente" ? (
                                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-400" />
                                )}
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                                    {sc.tipo}
                                  </span>
                                  <span
                                    className={`text-sm font-medium ${
                                      sc.completata
                                        ? "line-through text-slate-400"
                                        : "text-slate-100"
                                    }`}
                                  >
                                    {sc.titolo}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {sc.aziendaNome}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono font-semibold text-slate-200">
                                {sc.dataScadenza}
                              </div>
                              {Number(sc.importo) > 0 && (
                                <div className="text-xs font-medium text-emerald-400 mt-0.5">
                                  €{" "}
                                  {Number(sc.importo).toLocaleString("it-IT", {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("scadenzario")}
                    className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800/70 transition"
                  >
                    Apri Calendario Fiscale Completo →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AZIENDE CRUD */}
          {activeTab === "aziende" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Anagrafica Aziende Clienti (CRUD Completo)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Gestisci ragioni sociali, matricole INPS, PAT INAIL, CCNL e organico dipendenti
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab("import")}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                  >
                    <Upload className="h-3.5 w-3.5 text-indigo-400" />
                    Importa da CSV / Excel
                  </button>
                  <button
                    onClick={openNewAziendaModal}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi Azienda
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca per Ragione Sociale, Partita IVA, CCNL o Città..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  {["Tutti", "Attiva", "In Onboarding", "Sospesa"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatoFilter(st)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                        statoFilter === st
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aziende Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-3 pr-4">Azienda & Sede</th>
                      <th className="py-3 px-3">P.IVA & Posizioni</th>
                      <th className="py-3 px-3">CCNL Applicato</th>
                      <th className="py-3 px-3 text-center">Dipendenti</th>
                      <th className="py-3 px-3">Contatti</th>
                      <th className="py-3 px-3">Stato</th>
                      <th className="py-3 pl-3 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {filteredAziende.map((az) => (
                      <tr
                        key={az.id}
                        className="hover:bg-slate-800/30 transition"
                      >
                        <td className="py-4 pr-4">
                          <div className="font-semibold text-white">
                            {az.ragioneSociale}
                          </div>
                          <div className="text-xs text-slate-400">
                            {az.citta || "Sede Principale"}
                          </div>
                        </td>
                        <td className="py-4 px-3 font-mono text-xs">
                          <div className="text-slate-200">P.IVA: {az.partitaIva}</div>
                          <div className="text-slate-400">
                            INPS: {az.posizioneInps || "N/D"} • INAIL:{" "}
                            {az.patInail || "N/D"}
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <span className="inline-flex rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-200">
                            {az.ccnl}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="inline-flex items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-300">
                            {az.numeroDipendenti}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-xs text-slate-300">
                          <div>{az.email || "—"}</div>
                          <div className="text-slate-400">{az.telefono || ""}</div>
                        </td>
                        <td className="py-4 px-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              az.stato === "Attiva"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : az.stato === "In Onboarding"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {az.stato}
                          </span>
                        </td>
                        <td className="py-4 pl-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openEditAziendaModal(az)}
                              title="Modifica azienda"
                              className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAzienda(az.id)}
                              title="Elimina azienda"
                              className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-300 hover:bg-rose-600 hover:text-white hover:border-rose-500 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAziende.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-8 text-center text-sm text-slate-400"
                        >
                          Nessuna azienda trovata con i filtri selezionati.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: SCADENZARIO VISIVO */}
          {activeTab === "scadenzario" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <CalendarClock className="h-5 w-5 text-amber-400" />
                      Scadenzario Fiscale e Previdenziale Visivo
                    </h2>
                    <p className="text-xs text-slate-400">
                      Monitoraggio scadenze Mod. F24, Flussi UNIEMENS, Autoliquidazione INAIL, CU e 770
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {["Tutti", "F24", "UNIEMENS", "INAIL", "Altro"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setScadenzaTipoFilter(t)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          scadenzaTipoFilter === t
                            ? "bg-amber-500 text-slate-950 font-semibold"
                            : "border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsScadenzaModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                    >
                      <Plus className="h-4 w-4" />
                      Nuova Scadenza
                    </button>
                  </div>
                </div>

                {/* Visual Kanban / Timeline Grid */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredScadenze.map((sc) => (
                    <div
                      key={sc.id}
                      className={`rounded-2xl border p-5 flex flex-col justify-between transition ${
                        sc.completata
                          ? "border-emerald-500/20 bg-emerald-950/10"
                          : sc.stato === "Urgente"
                          ? "border-rose-500/40 bg-rose-950/15"
                          : "border-slate-800 bg-slate-950/70"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-bold text-indigo-300">
                            {sc.tipo}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-semibold text-slate-300">
                              {sc.dataScadenza}
                            </span>
                            <button
                              onClick={() => handleDeleteScadenza(sc.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              title="Elimina scadenza"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <h3
                          className={`mt-3 font-semibold text-sm ${
                            sc.completata
                              ? "line-through text-slate-400"
                              : "text-white"
                          }`}
                        >
                          {sc.titolo}
                        </h3>
                        <p className="mt-1 text-xs text-indigo-300/90 font-medium">
                          {sc.aziendaNome}
                        </p>
                        {sc.note && (
                          <p className="mt-2 text-xs text-slate-400 bg-slate-900/80 rounded-lg p-2 border border-slate-800/80">
                            {sc.note}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] uppercase text-slate-400 block">
                            Importo Delega
                          </span>
                          <span className="text-sm font-bold text-white">
                            {Number(sc.importo) > 0
                              ? `€ ${Number(sc.importo).toLocaleString("it-IT", {
                                  minimumFractionDigits: 2,
                                })}`
                              : "Adempimento Telematico"}
                          </span>
                        </div>

                        <button
                          onClick={() => handleToggleScadenza(sc)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                            sc.completata
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-200 hover:bg-emerald-600 hover:text-white"
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {sc.completata ? "Evasa" : "Segna Evasa"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CEDOLINI */}
          {activeTab === "cedolini" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Gestione & Elaborazione Cedolini Paga
                  </h2>
                  <p className="text-xs text-slate-400">
                    Prospetti paga mensili, netto in busta, contributi e costo totale azienda
                  </p>
                </div>
                <button
                  onClick={() => setIsCedolinoModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                >
                  <Plus className="h-4 w-4" />
                  Registra Cedolino
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-3 pr-4">Dipendente & Qualifica</th>
                      <th className="py-3 px-3">Azienda Datrice</th>
                      <th className="py-3 px-3">Mese Competenza</th>
                      <th className="py-3 px-3 text-right">Netto in Busta</th>
                      <th className="py-3 px-3 text-right">Costo Azienda</th>
                      <th className="py-3 pl-3 text-right">Stato LUL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {cedolini.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 pr-4">
                          <div className="font-semibold text-white">
                            {c.dipendenteNome}
                          </div>
                          <div className="text-xs text-slate-400">{c.qualifica}</div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-200">
                          {c.aziendaNome}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                            {c.meseCompetenza}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-semibold text-emerald-400">
                          €{" "}
                          {Number(c.nettoBusta).toLocaleString("it-IT", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                          €{" "}
                          {Number(c.costoAzienda).toLocaleString("it-IT", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-3.5 pl-3 text-right">
                          <span className="inline-flex rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                            {c.stato}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: IMPORT MASSIVO CSV / XLSX */}
          {activeTab === "import" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                    Importazione Massiva Aziende (CSV / Excel)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Carica un file `.csv` o `.xlsx` per importare centinaia di anagrafiche clienti in un clic
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={downloadCsvTemplate}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-400" />
                    Scarica Template CSV
                  </button>
                  <button
                    onClick={loadSampleCsvData}
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Simula Dati CSV di Test
                  </button>
                </div>
              </div>

              {/* Dropzone */}
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
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-white">
                  Trascina qui il tuo file CSV o Excel (.xlsx) oppure selezionalo dal computer
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Colonne supportate: ragioneSociale, partitaIva, ccnl, numeroDipendenti, email, telefono, citta, posizioneInps, patInail
                </p>
                <label className="mt-4 cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition">
                  Sfoglia File CSV / XLSX
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
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
                  <FileCheck2 className="h-4 w-4 shrink-0" />
                  {importStatus}
                </div>
              )}

              {/* Preview Table */}
              {csvPreview.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                      Anteprima Record Pronti per l&apos;Importazione ({csvPreview.length} aziende)
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCsvPreview([])}
                        className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={confirmBulkImport}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/25"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Conferma Importazione ({csvPreview.length} Aziende)
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 uppercase">
                        <tr>
                          <th className="p-3">Ragione Sociale</th>
                          <th className="p-3">Partita IVA</th>
                          <th className="p-3">CCNL</th>
                          <th className="p-3">Dipendenti</th>
                          <th className="p-3">Città</th>
                          <th className="p-3">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {csvPreview.map((row, i) => (
                          <tr key={i} className="bg-slate-900/40">
                            <td className="p-3 font-medium text-white">
                              {row.ragioneSociale || row["Ragione Sociale"] || "—"}
                            </td>
                            <td className="p-3 font-mono text-slate-300">
                              {row.partitaIva || row["Partita IVA"] || "—"}
                            </td>
                            <td className="p-3 text-slate-300">
                              {row.ccnl || row.CCNL || "Commercio"}
                            </td>
                            <td className="p-3 text-slate-300">
                              {row.numeroDipendenti || row.dipendenti || "5"}
                            </td>
                            <td className="p-3 text-slate-300">
                              {row.citta || row["Città"] || "—"}
                            </td>
                            <td className="p-3 text-slate-400">
                              {row.email || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: CREATE / EDIT AZIENDA */}
      {isAziendaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-white">
                {editingAzienda
                  ? "Modifica Anagrafica Azienda"
                  : "Nuova Azienda Cliente"}
              </h3>
              <button
                onClick={() => setIsAziendaModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAzienda} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    CCNL Applicato
                  </label>
                  <select
                    value={aziendaForm.ccnl}
                    onChange={(e) =>
                      setAziendaForm({ ...aziendaForm, ccnl: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {CCNL_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    placeholder="Es. 4918273645"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    PAT INAIL
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
                    placeholder="Es. 91827364/12"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Amministrazione / HR
                  </label>
                  <input
                    type="email"
                    value={aziendaForm.email}
                    onChange={(e) =>
                      setAziendaForm({ ...aziendaForm, email: e.target.value })
                    }
                    placeholder="hr@azienda.it"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Città / Sede
                  </label>
                  <input
                    type="text"
                    value={aziendaForm.citta}
                    onChange={(e) =>
                      setAziendaForm({ ...aziendaForm, citta: e.target.value })
                    }
                    placeholder="Milano (MI)"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAziendaModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  {editingAzienda ? "Salva Modifiche" : "Crea Azienda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUOVA SCADENZA */}
      {isScadenzaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-white">
                Pianifica Nuova Scadenza Fiscale / Contributiva
              </h3>
              <button
                onClick={() => setIsScadenzaModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateScadenza} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Titolo Adempimento *
                </label>
                <input
                  type="text"
                  required
                  value={scadenzaForm.titolo}
                  onChange={(e) =>
                    setScadenzaForm({ ...scadenzaForm, titolo: e.target.value })
                  }
                  placeholder="Es. Versamento F24 Ritenute IRPEF e Contributi INPS"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tipologia
                  </label>
                  <select
                    value={scadenzaForm.tipo}
                    onChange={(e) =>
                      setScadenzaForm({ ...scadenzaForm, tipo: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                  >
                    <option value="F24">Modello F24</option>
                    <option value="UNIEMENS">Flusso UNIEMENS</option>
                    <option value="INAIL">Autoliquidazione INAIL</option>
                    <option value="CU">Certificazione Unica</option>
                    <option value="770">Modello 770</option>
                    <option value="Altro">Altro Adempimento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Azienda Associata
                  </label>
                  <select
                    value={scadenzaForm.aziendaId}
                    onChange={(e) =>
                      setScadenzaForm({
                        ...scadenzaForm,
                        aziendaId: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Importo (€) opzionale
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Note Operative
                </label>
                <input
                  type="text"
                  value={scadenzaForm.note}
                  onChange={(e) =>
                    setScadenzaForm({ ...scadenzaForm, note: e.target.value })
                  }
                  placeholder="Note per invio telematico Entratel / INPS..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScadenzaModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Salva Scadenza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUOVO CEDOLINO */}
      {isCedolinoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-semibold text-white">
                Elabora Nuovo Cedolino Paga
              </h3>
              <button
                onClick={() => setIsCedolinoModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCedolino} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Azienda Cliente *
                </label>
                <select
                  value={cedolinoForm.aziendaId}
                  onChange={(e) =>
                    setCedolinoForm({
                      ...cedolinoForm,
                      aziendaId: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                >
                  {aziende.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.ragioneSociale}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome e Cognome Dipendente *
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
                    placeholder="Es. Luca Verdi"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    placeholder="Impiegato 3° Liv."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Netto Busta (€) *
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
                    placeholder="1950.00"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    placeholder="3400.00"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCedolinoModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Salva Cedolino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
