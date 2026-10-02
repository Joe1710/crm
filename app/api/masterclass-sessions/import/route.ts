import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { masterclassSessions } from "../../../../db/schema";
import { getSessionUser } from "../../../../lib/session-auth";

type ImportSession = {
  date: string; dayOfWeek?: string; startTime?: string; endTime?: string;
  group?: string; sessionType?: string; moduleNumber?: number; term?: string;
  chapterNumber?: number | null; topic?: string; channel?: string;
};

export async function POST(request: Request) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const body = await request.json() as { cohort?: string; sessions?: ImportSession[] };
    const cohort = String(body.cohort ?? "").trim();
    if (!cohort) return Response.json({ error: "Kohorte fehlt" }, { status: 400 });
    if (!Array.isArray(body.sessions) || body.sessions.length === 0) return Response.json({ error: "Keine Termine übergeben" }, { status: 400 });

    const db = getDb();
    await db.delete(masterclassSessions).where(eq(masterclassSessions.cohort, cohort));

    const now = new Date().toISOString();
    const rows = body.sessions.map(s => ({
      cohort,
      date: String(s.date),
      dayOfWeek: String(s.dayOfWeek ?? ""),
      startTime: String(s.startTime ?? ""),
      endTime: String(s.endTime ?? ""),
      group: String(s.group ?? "Alle"),
      sessionType: String(s.sessionType ?? "Webinar"),
      moduleNumber: Number(s.moduleNumber ?? 0),
      term: String(s.term ?? ""),
      chapterNumber: s.chapterNumber ?? null,
      topic: String(s.topic ?? ""),
      channel: String(s.channel ?? ""),
      updatedAt: now
    }));
    for (const row of rows) {
      await db.insert(masterclassSessions).values(row);
    }

    return Response.json({ cohort, imported: rows.length }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Import fehlgeschlagen" }, { status: 500 });
  }
}
