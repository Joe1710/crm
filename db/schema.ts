import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  bio: text("bio"),
  outreachReminder1: text("outreach_reminder_1"),
  outreachReminder2: text("outreach_reminder_2"),
  outreachConfirmation: text("outreach_confirmation"),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: text("reset_token_expires_at"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

export const styleSamples = sqliteTable("style_samples", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), city: text("city").notNull(), address: text("address").notNull().default(""),
  distance: real("distance").notNull().default(0), industry: text("industry").notNull().default("Sonstige"),
  employees: text("employees").notNull().default(""), phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""), website: text("website").notNull().default(""),
  manager: text("manager").notNull().default(""), salutation: text("salutation").notNull().default(""),
  stage: text("stage").notNull().default("Neu gefunden"),
  priority: text("priority").notNull().default("B"), owner: text("owner").notNull().default("Ivan"),
  nextAction: text("next_action").notNull().default(""), nextDate: text("next_date").notNull().default(""),
  source: text("source").notNull().default("Manuell"), notes: text("notes").notNull().default(""),
  notionPageId: text("notion_page_id"), notionSyncedAt: text("notion_synced_at"), notionSyncError: text("notion_sync_error"),
  outreachStep: integer("outreach_step").notNull().default(0),
  lastOutreachAt: text("last_outreach_at"),
  awaitingReply: integer("awaiting_reply").notNull().default(0),
  originCity: text("origin_city").notNull().default("Nürnberg"),
  stageChangedAt: text("stage_changed_at"),
  lastActivityAt: text("last_activity_at"),
  lastResult: text("last_result").notNull().default(""),
  registeredAt: text("registered_at"),
  postalStatus: text("postal_status").notNull().default(""),
  postalMarkedAt: text("postal_marked_at"),
  postalSentAt: text("postal_sent_at"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP")
});

export const outreachEmails = sqliteTable("outreach_emails", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companies.id),
  stepNumber: integer("step_number").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentTo: text("sent_to").notNull(),
  triggeredBy: text("triggered_by").notNull().default("manual"),
  sentAt: text("sent_at").notNull().default("CURRENT_TIMESTAMP")
});

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companies.id),
  kind: text("kind").notNull().default("Notiz"),
  result: text("result").notNull().default(""),
  note: text("note").notNull().default(""),
  createdBy: text("created_by").notNull().default(""),
  createdAt: text("created_at").notNull()
});

export const eventSignups = sqliteTable("event_signups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  company: text("company").notNull().default(""),
  email: text("email").notNull(),
  persons: integer("persons").notNull().default(1),
  message: text("message").notNull().default(""),
  consent: text("consent").notNull().default(""),
  companyId: integer("company_id"),
  mailStatus: text("mail_status").notNull().default(""),
  createdAt: text("created_at").notNull()
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

export const inboxMessages = sqliteTable("inbox_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromAddress: text("from_address").notNull(),
  fromName: text("from_name").notNull().default(""),
  subject: text("subject").notNull().default(""),
  receivedAt: text("received_at").notNull(),
  bodyText: text("body_text").notNull().default(""),
  attachmentsDriveUrl: text("attachments_drive_url"),
  textPdfDriveUrl: text("text_pdf_drive_url"),
  replyDraft: text("reply_draft"),
  replyFinal: text("reply_final"),
  status: text("status").notNull().default("Neu"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP")
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  location: text("location").notNull().default(""),
  address: text("address").notNull().default(""),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull().default(""),
  capacity: integer("capacity").notNull().default(0),
  status: text("status").notNull().default("Planung"),
  notes: text("notes").notNull().default(""),
  notionPageId: text("notion_page_id"), notionSyncedAt: text("notion_synced_at"), notionSyncError: text("notion_sync_error"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP")
});

export const masterclassSessions = sqliteTable("masterclass_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cohort: text("cohort").notNull(),
  date: text("date").notNull(),
  dayOfWeek: text("day_of_week").notNull().default(""),
  startTime: text("start_time").notNull().default(""),
  endTime: text("end_time").notNull().default(""),
  group: text("group").notNull().default("Alle"),
  sessionType: text("session_type").notNull().default("Webinar"),
  moduleNumber: integer("module_number").notNull().default(0),
  term: text("term").notNull().default(""),
  chapterNumber: integer("chapter_number"),
  topic: text("topic").notNull().default(""),
  channel: text("channel").notNull().default(""),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP")
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
