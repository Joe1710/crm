import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { companies, eventSignups, events } from "../../../db/schema";
import { getSessionUser } from "../../../lib/session-auth";

const CONFIRMED_STAGES = ["Zugesagt"];
// Teilnahme, Angebote und Aufträge werden im neuen Funnel nicht mehr als Stufe geführt.
const ATTENDED_STAGES: string[] = [];
const OFFER_STAGES: string[] = [];
const ORDER_STAGES: string[] = [];

export async function GET() {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  const db = getDb();
  const eventList = await db.select().from(events).orderBy(desc(events.startAt));
  const allCompanies = await db.select({ stage: companies.stage, outreachStep: companies.outreachStep }).from(companies);

  const invited = allCompanies.filter(c => c.outreachStep >= 1).length;
  const confirmed = allCompanies.filter(c => CONFIRMED_STAGES.includes(c.stage)).length;
  const attended = allCompanies.filter(c => ATTENDED_STAGES.includes(c.stage)).length;
  const offers = allCompanies.filter(c => OFFER_STAGES.includes(c.stage)).length;
  const orders = allCompanies.filter(c => ORDER_STAGES.includes(c.stage)).length;

  const signups = await db.select({ persons: eventSignups.persons }).from(eventSignups);
  const registered = signups.reduce((sum, s) => sum + (s.persons || 1), 0);
  const enriched = eventList.map(e => ({ ...e, invited, confirmed, registered, signupCount: signups.length, attended, offers, orders }));
  return Response.json({ events: enriched });
}

export async function POST(request: Request) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!String(body.title ?? "").trim()) return Response.json({ error: "Titel fehlt" }, { status: 400 });
    if (!String(body.startAt ?? "").trim()) return Response.json({ error: "Beginn fehlt" }, { status: 400 });

    const [event] = await getDb().insert(events).values({
      title: String(body.title).trim(),
      location: String(body.location ?? ""),
      address: String(body.address ?? ""),
      startAt: String(body.startAt),
      endAt: String(body.endAt ?? ""),
      capacity: Number(body.capacity ?? 0),
      status: String(body.status ?? "Planung"),
      notes: String(body.notes ?? ""),
      updatedAt: new Date().toISOString()
    }).returning();
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
