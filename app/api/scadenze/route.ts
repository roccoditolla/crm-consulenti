import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { scadenze } from "@/lib/db/schema";
import { initialScadenze } from "@/lib/db/seed-data";

let memoryScadenze = [...initialScadenze];

export async function GET() {
  try {
    const db = getDb();
    if (db) {
      const rows = await db
        .select()
        .from(scadenze)
        .orderBy(asc(scadenze.dataScadenza));
      return NextResponse.json({ source: "neon", data: rows });
    }
  } catch (err) {
    console.warn("Neon scadenze fallback:", err);
  }
  return NextResponse.json({ source: "memory", data: memoryScadenze });
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const db = getDb();
    if (db) {
      const [inserted] = await db
        .insert(scadenze)
        .values({
          titolo: body.titolo,
          tipo: body.tipo || "F24",
          dataScadenza: body.dataScadenza,
          aziendaId: body.aziendaId ? Number(body.aziendaId) : null,
          aziendaNome: body.aziendaNome || "Tutte le Aziende Clienti",
          importo: String(body.importo || "0.00"),
          stato: body.stato || "In Scadenza",
          priorita: body.priorita || "Media",
          note: body.note || "",
          completata: Boolean(body.completata),
        })
        .returning();
      return NextResponse.json({ source: "neon", data: inserted });
    }
  } catch (err) {
    console.warn("Neon scadenza insert fallback:", err);
  }

  const newScadenza = {
    id: Date.now(),
    titolo: body.titolo,
    tipo: body.tipo || "F24",
    dataScadenza: body.dataScadenza,
    aziendaId: body.aziendaId ? Number(body.aziendaId) : null,
    aziendaNome: body.aziendaNome || "Tutte le Aziende Clienti",
    importo: String(body.importo || "0.00"),
    stato: body.stato || "In Scadenza",
    priorita: body.priorita || "Media",
    note: body.note || "",
    completata: Boolean(body.completata),
    createdAt: new Date(),
  };
  memoryScadenze = [...memoryScadenze, newScadenza];
  return NextResponse.json({ source: "memory", data: newScadenza });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = Number(body.id);

  try {
    const db = getDb();
    if (db && id) {
      const [updated] = await db
        .update(scadenze)
        .set({
          completata: Boolean(body.completata),
          stato: body.completata ? "Completata" : body.stato || "In Scadenza",
        })
        .where(eq(scadenze.id, id))
        .returning();
      return NextResponse.json({ source: "neon", data: updated });
    }
  } catch (err) {
    console.warn("Neon scadenza patch fallback:", err);
  }

  memoryScadenze = memoryScadenze.map((s) =>
    s.id === id
      ? {
          ...s,
          completata: Boolean(body.completata),
          stato: body.completata ? "Completata" : "In Scadenza",
        }
      : s
  );
  return NextResponse.json({
    source: "memory",
    data: memoryScadenze.find((s) => s.id === id),
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));

  try {
    const db = getDb();
    if (db && id) {
      await db.delete(scadenze).where(eq(scadenze.id, id));
      return NextResponse.json({ source: "neon", ok: true });
    }
  } catch (err) {
    console.warn("Neon scadenza delete fallback:", err);
  }

  memoryScadenze = memoryScadenze.filter((s) => s.id !== id);
  return NextResponse.json({ source: "memory", ok: true });
}
