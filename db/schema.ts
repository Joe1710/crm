import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), city: text("city").notNull(), address: text("address").notNull().default(""),
  distance: real("distance").notNull().default(0), industry: text("industry").notNull().default("Sonstige"),
  employees: text("employees").notNull().default(""), phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""), website: text("website").notNull().default(""),
  manager: text("manager").notNull().default(""), stage: text("stage").notNull().default("Neu gefunden"),
  priority: text("priority").notNull().default("B"), owner: text("owner").notNull().default("Ivan"),
  nextAction: text("next_action").notNull().default(""), nextDate: text("next_date").notNull().default(""),
  source: text("source").notNull().default("Manuell"), notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

export const researchJobs = sqliteTable("research_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  industry: text("industry").notNull(),
  radius: integer("radius").notNull(),
  employees: text("employees").notNull(),
  legalForm: text("legal_form").notNull().default("Alle Rechtsformen"),
  region: text("region").notNull().default("Nürnberg, Fürth und Erlangen"),
  resultLimit: integer("result_limit").notNull().default(10),
  status: text("status").notNull().default("Datenquelle ausstehend"),
  provider: text("provider").notNull().default("Nicht verbunden"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});
