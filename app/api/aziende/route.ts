import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aziende } from "@/lib/db/schema";
import { initialAziende } from "@/lib/db/seed-data";

let memoryAziende = [...initialAziende];

export async function GET() {
  try {
    const db = getDb();
    if (db) {
      const rows = await db.select().from(aziende).orderBy(desc(aziende.id));
      return NextResponse.json({ source: "neon", data: rows });
    }
  } catch (err) {
    console.warn("Neon DB fallback to memory store:", err);
  }
  return NextResponse.json({ source: "memory", data: memoryAziende });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (Array.isArray(body.bulk)) {
    const items = body.bulk;
    try {
      const db = getDb();
      if (db) {
        const inserted = await db
          .insert(aziende)
          .values(
            items.map((item: Record<string, unknown>) => ({
              ragioneSociale: String(item.ragioneSociale || "").trim(),
              partitaIva: String(item.partitaIva || "").trim(),
              codiceFiscale: String(item.codiceFiscale || item.partitaIva || "").trim(),
              ccnl: String(item.ccnl || "Commercio e Terziario"),
              numeroDipendenti: Number(item.numeroDipendenti) || 0,
              email: String(item.email || ""),
              telefono: String(item.telefono || ""),
              citta: String(item.citta || ""),
              stato: String(item.stato || "Attiva"),
              posizioneInps: String(item.posizioneInps || ""),
              patInail: String(item.patInail || ""),
            }))
          )
          .returning();
        return NextResponse.json({ source: "neon", data: inserted });
      }
    } catch (err) {
      console.warn("Neon bulk insert fallback:", err);
    }

    const created = items.map((item: Record<string, unknown>, idx: number) => ({
      id: Date.now() + idx,
      ragioneSociale: String(item.ragioneSociale || "Azienda Importata"),
      partitaIva: String(item.partitaIva || `000000000${idx}`),
      codiceFiscale: String(item.codiceFiscale || item.partitaIva || ""),
      ccnl: String(item.ccnl || "Commercio e Terziario"),
      numeroDipendenti: Number(item.numeroDipendenti) || 0,
      email: String(item.email || ""),
      telefono: String(item.telefono || ""),
      citta: String(item.citta || ""),
      stato: String(item.stato || "Attiva"),
      posizioneInps: String(item.posizioneInps || ""),
      patInail: String(item.patInail || ""),
      createdAt: new Date(),
    }));
    memoryAziende = [...created, ...memoryAziende];
    return NextResponse.json({ source: "memory", data: created });
  }

  try {
    const db = getDb();
    if (db) {
      const [inserted] = await db
        .insert(aziende)
        .values({
          ragioneSociale: body.ragioneSociale,
          partitaIva: body.partitaIva,
          codiceFiscale: body.codiceFiscale || body.partitaIva,
          ccnl: body.ccnl || "Commercio e Terziario",
          numeroDipendenti: Number(body.numeroDipendenti) || 0,
          email: body.email || "",
          telefono: body.telefono || "",
          citta: body.citta || "",
          stato: body.stato || "Attiva",
          posizioneInps: body.posizioneInps || "",
          patInail: body.patInail || "",
        })
        .returning();
      return NextResponse.json({ source: "neon", data: inserted });
    }
  } catch (err) {
    console.warn("Neon insert fallback:", err);
  }

  const newAzienda = {
    id: Date.now(),
    ragioneSociale: body.ragioneSociale,
    partitaIva: body.partitaIva,
    codiceFiscale: body.codiceFiscale || body.partitaIva,
    ccnl: body.ccnl || "Commercio e Terziario",
    numeroDipendenti: Number(body.numeroDipendenti) || 0,
    email: body.email || "",
    telefono: body.telefono || "",
    citta: body.citta || "",
    stato: body.stato || "Attiva",
    posizioneInps: body.posizioneInps || "",
    patInail: body.patInail || "",
    createdAt: new Date(),
  };
  memoryAziende = [newAzienda, ...memoryAziende];
  return NextResponse.json({ source: "memory", data: newAzienda });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const id = Number(body.id);

  try {
    const db = getDb();
    if (db && id) {
      const [updated] = await db
        .update(aziende)
        .set({
          ragioneSociale: body.ragioneSociale,
          partitaIva: body.partitaIva,
          codiceFiscale: body.codiceFiscale,
          ccnl: body.ccnl,
          numeroDipendenti: Number(body.numeroDipendenti) || 0,
          email: body.email,
          telefono: body.telefono,
          citta: body.citta,
          stato: body.stato,
          posizioneInps: body.posizioneInps,
          patInail: body.patInail,
        })
        .where(eq(aziende.id, id))
        .returning();
      return NextResponse.json({ source: "neon", data: updated });
    }
  } catch (err) {
    console.warn("Neon update fallback:", err);
  }

  memoryAziende = memoryAziende.map((a) =>
    a.id === id ? { ...a, ...body, numeroDipendenti: Number(body.numeroDipendenti) || 0 } : a
  );
  return NextResponse.json({
    source: "memory",
    data: memoryAziende.find((a) => a.id === id),
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));

  try {
    const db = getDb();
    if (db && id) {
      await db.delete(aziende).where(eq(aziende.id, id));
      return NextResponse.json({ source: "neon", ok: true });
    }
  } catch (err) {
    console.warn("Neon delete fallback:", err);
  }

  memoryAziende = memoryAziende.filter((a) => a.id !== id);
  return NextResponse.json({ source: "memory", ok: true });
}
