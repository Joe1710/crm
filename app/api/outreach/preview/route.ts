import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { companies } from "../../../../db/schema";
import { renderOutreachHtml, renderTemplateHtml, SIGNUP_CONFIRMATION } from "../../../../lib/outreach-html";
import { getSessionUser } from "../../../../lib/session-auth";

/** HTML-Vorschau der Aussendung 1–3, optional mit der Anrede einer konkreten Firma. */
export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return Response.redirect(new URL("/login", request.url).toString(), 303);
  const params = new URL(request.url).searchParams;
  const step = Number(params.get("step") ?? "1");
  let salutation = "Frau Musterfrau";
  const companyId = Number(params.get("companyId") ?? "0");
  if (companyId) {
    const [company] = await getDb().select({ salutation: companies.salutation }).from(companies).where(eq(companies.id, companyId)).limit(1);
    if (company) salutation = company.salutation;
  }
  if (params.get("type") === "signup") return new Response(renderTemplateHtml(SIGNUP_CONFIRMATION, ""), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  return new Response(renderOutreachHtml(step, salutation), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
