import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cedolini } from "@/lib/db/schema";
import { initialCedolini } from "@/lib/db/seed-data";

let memoryCedolini = [...initialCedolini];

export async function GET() {
  try {
    const db = getDb();
    if (db) {
      const rows = await db.select().from(cedolini).orderBy(desc(cedolini.id));
      return NextResponse.json({ source: "neon", data: rows });
    }
  } catch (err) {
    console.warn("Neon cedolini fallback:", err);
  }
  return NextResponse.json({ source: "memory", data: memoryCedolini });
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const db = getDb();
    if (db) {
      const [inserted] = await db
        .insert(cedolini)
        .values({
          aziendaId: Number(body.aziendaId) || 1,
          aziendaNome: body.aziendaNome || "Azienda Cliente",
          dipendenteNome: body.dipendenteNome,
          qualifica: body.qualifica || "Impiegato",
          meseCompetenza: body.meseCompetenza || "Novembre 2026",
          nettoBusta: String(body.nettoBusta || "0.00"),
          costoAzienda: String(body.costoAzienda || "0.00"),
          stato: body.stato || "Elaborato",
        })
        .returning();
      return NextResponse.json({ source: "neon", data: inserted });
    }
  } catch (err) {
    console.warn("Neon cedolini insert fallback:", err);
  }

  const newCedolino = {
    id: Date.now(),
    aziendaId: Number(body.aziendaId) || 1,
    aziendaNome: body.aziendaNome || "Azienda Cliente",
    dipendenteNome: body.dipendenteNome,
    qualifica: body.qualifica || "Impiegato",
    meseCompetenza: body.meseCompetenza || "Novembre 2026",
    nettoBusta: String(body.nettoBusta || "0.00"),
    costoAzienda: String(body.costoAzienda || "0.00"),
    stato: body.stato || "Elaborato",
    createdAt: new Date(),
  };
  memoryCedolini = [newCedolino, ...memoryCedolini];
  return NextResponse.json({ source: "memory", data: newCedolino });
}
