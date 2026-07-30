import { getDb } from "../../../db";
import { researchJobs } from "../../../db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const industry = String(body.industry ?? "").trim();
    const radius = Number(body.radius ?? 0);
    if (!industry || radius < 10 || radius > 100) {
      return Response.json({ message: "Bitte Branche und einen Umkreis zwischen 10 und 100 km angeben." }, { status: 400 });
    }

    const [job] = await getDb().insert(researchJobs).values({
      industry,
      radius,
      employees: String(body.employees ?? "10–249 Mitarbeiter"),
      legalForm: String(body.legalForm ?? "Alle Rechtsformen"),
      region: String(body.region ?? "Nürnberg, Fürth und Erlangen"),
      resultLimit: 10,
      status: "Datenquelle ausstehend",
      provider: "Nicht verbunden"
    }).returning();

    return Response.json({
      job,
      companies: [],
      message: "Der Rechercheauftrag ist gespeichert. Nach Anschluss einer lizenzierten Firmendatenquelle werden automatisch zehn geprüfte Unternehmen angelegt."
    }, { status: 202 });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Rechercheauftrag konnte nicht gespeichert werden." }, { status: 500 });
  }
}
