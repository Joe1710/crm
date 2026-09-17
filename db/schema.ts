import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

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
  notionPageId: text("notion_page_id"), notionSyncedAt: text("notion_synced_at"), notionSyncError: text("notion_sync_error"),
  notionLastEditedAt: text("notion_last_edited_at"),
  originCity: text("origin_city").notNull().default("Nürnberg"),
  highlight: text("highlight").notNull().default(""),
  highlightSourceUrl: text("highlight_source_url").notNull().default(""),
  highlightGeneratedAt: text("highlight_generated_at"),
  email1Subject: text("email1_subject").notNull().default(""),
  email1Body: text("email1_body").notNull().default(""),
  email1GeneratedAt: text("email1_generated_at"),
  email2Subject: text("email2_subject").notNull().default(""),
  email2Body: text("email2_body").notNull().default(""),
  email2GeneratedAt: text("email2_generated_at"),
  email1SentAt: text("email1_sent_at"),
  email2SentAt: text("email2_sent_at"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP")
});

export const researchJobs = sqliteTable("research_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  industry: text("industry").notNull(),
  radius: integer("radius").notNull(),
  employees: text("employees").notNull(),
  legalForm: text("legal_form").notNull().default("Alle Rechtsformen"),
  region: text("region").notNull().default("Nürnberg, Fürth und Erlangen"),
  originCity: text("origin_city").notNull().default("Nürnberg"),
  resultLimit: integer("result_limit").notNull().default(10),
  status: text("status").notNull().default("Datenquelle ausstehend"),
  provider: text("provider").notNull().default("Nicht verbunden"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

export const notionSyncRuns = sqliteTable("notion_sync_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status").notNull(),
  processed: integer("processed").notNull().default(0),
  succeeded: integer("succeeded").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  message: text("message").notNull().default(""),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at")
});
