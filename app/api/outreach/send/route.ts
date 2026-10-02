import { getSessionUser } from "../../../../lib/session-auth";
import { sendOutreachEmail, SendOutreachError } from "../../../../lib/send-outreach";

export async function POST(request: Request) {
  if (!(await getSessionUser())) return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  try {
    const body = await request.json() as { companyId?: number; step?: number };
    if (!body.companyId) return Response.json({ message: "Unternehmen fehlt." }, { status: 400 });
    const step = Number(body.step);
    if (!step || step < 1 || step > 4) return Response.json({ message: "Ungültige E-Mail-Nummer." }, { status: 400 });
    const result = await sendOutreachEmail({ companyId: Number(body.companyId), step, triggeredBy: "manual" });
    return Response.json(result);
  } catch (error) {
    const status = error instanceof SendOutreachError ? error.status : 500;
    return Response.json({ message: error instanceof Error ? error.message : "Versand fehlgeschlagen." }, { status });
  }
}
