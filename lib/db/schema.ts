import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";

export const aziende = pgTable("aziende", {
  id: serial("id").primaryKey(),
  ragioneSociale: text("ragione_sociale").notNull(),
  partitaIva: text("partita_iva").notNull().unique(),
  codiceFiscale: text("codice_fiscale"),
  ccnl: text("ccnl").notNull().default("Commercio e Terziario"),
  numeroDipendenti: integer("numero_dipendenti").notNull().default(0),
  email: text("email"),
  telefono: text("telefono"),
  citta: text("citta"),
  stato: text("stato").notNull().default("Attiva"), // Attiva | In Onboarding | Sospesa
  posizioneInps: text("posizione_inps"),
  patInail: text("pat_inail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scadenze = pgTable("scadenze", {
  id: serial("id").primaryKey(),
  titolo: text("titolo").notNull(),
  tipo: text("tipo").notNull(), // F24 | UNIEMENS | INAIL | CU | 770 | Altro
  dataScadenza: text("data_scadenza").notNull(), // YYYY-MM-DD
  aziendaId: integer("azienda_id").references(() => aziende.id, {
    onDelete: "cascade",
  }),
  aziendaNome: text("azienda_nome").notNull().default("Tutte le Aziende"),
  importo: numeric("importo", { precision: 10, scale: 2 }),
  stato: text("stato").notNull().default("In Scadenza"), // Completata | In Scadenza | Urgente
  priorita: text("priorita").notNull().default("Media"), // Alta | Media | Bassa
  note: text("note"),
  completata: boolean("completata").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cedolini = pgTable("cedolini", {
  id: serial("id").primaryKey(),
  aziendaId: integer("azienda_id")
    .references(() => aziende.id, { onDelete: "cascade" })
    .notNull(),
  aziendaNome: text("azienda_nome").notNull(),
  dipendenteNome: text("dipendente_nome").notNull(),
  qualifica: text("qualifica").notNull().default("Impiegato"),
  meseCompetenza: text("mese_competenza").notNull(), // es. "Novembre 2026"
  nettoBusta: numeric("netto_busta", { precision: 10, scale: 2 }).notNull(),
  costoAzienda: numeric("costo_azienda", { precision: 10, scale: 2 }).notNull(),
  stato: text("stato").notNull().default("Elaborato"), // Elaborato | In Verifica | Inviato
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Azienda = typeof aziende.$inferSelect;
export type NewAzienda = typeof aziende.$inferInsert;

export type Scadenza = typeof scadenze.$inferSelect;
export type NewScadenza = typeof scadenze.$inferInsert;

export type Cedolino = typeof cedolini.$inferSelect;
export type NewCedolino = typeof cedolini.$inferInsert;
