import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { companies } from "../../../db/schema";

export async function GET() {
  try { return Response.json({ companies: await getDb().select().from(companies).orderBy(desc(companies.id)) }); }
  catch { return Response.json({ companies: [] }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const [company] = await getDb().insert(companies).values({
      name: String(body.name ?? "").trim(), city: String(body.city ?? "").trim(), address: String(body.address ?? ""),
      distance: Number(body.distance ?? 0), industry: String(body.industry ?? "Sonstige"), employees: String(body.employees ?? ""),
      phone: String(body.phone ?? ""), email: String(body.email ?? ""), website: String(body.website ?? ""), manager: String(body.manager ?? ""),
      stage: String(body.stage ?? "Neu gefunden"), priority: String(body.priority ?? "B"), owner: String(body.owner ?? "Ivan"),
      nextAction: String(body.nextAction ?? "Daten prüfen und qualifizieren"), nextDate: String(body.nextDate ?? ""), source: String(body.source ?? "Manuell"), notes: String(body.notes ?? "")
    }).returning();
    return Response.json({ company }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Speichern fehlgeschlagen" }, { status: 500 }); }
}
