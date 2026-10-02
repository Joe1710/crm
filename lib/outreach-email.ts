import { greetingLine, outreachSubject, renderOutreachText } from "./outreach-html";

export type OutreachCompany = {
  name: string;
  salutation: string;
};

export class OutreachApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "OutreachApiError";
  }
}

export const DEFAULT_CONFIRMATION = [
  "vielen Dank für Ihre Zusage zum Speed-Dating KI-Mittelstand am Mittwoch, 11. November 2026, 18:00–21:00 Uhr, in der Kainsbacher Mühle (Tagungsbereich), Mühlgasse 1, 91230 Kainsbach/Happurg. Ich freue mich sehr, Sie persönlich kennenzulernen!",
  "Bringen Sie gern eine wiederkehrende Aufgabe oder eine konkrete Frage aus Ihrem Unternehmen mit – dann können wir am Abend direkt daran anknüpfen.",
  "Sollte sich kurzfristig doch etwas ändern, lassen Sie es mich bitte kurz wissen."
].join("\n\n");

const SIGNATURE = [
  "Mit freundlichen Grüßen",
  "",
  "Jürgen Kullmann",
  "JK KI-MasterClass UG (haftungsbeschränkt)",
  "Koburger Straße 198 · 04416 Markkleeberg",
  "Telefon: +49 162 3456793 · E-Mail: jk@ki-masterclass.com · Web: www.ki-masterclass.com",
  "Amtsgericht Leipzig, HRB 43013"
].join("\n");

/** Die drei Aussendungen sind fest formuliert – hier wird nichts mehr frei erzeugt. */
export function draftOutreachEmail(company: OutreachCompany, step: number) {
  const clampedStep = Math.min(Math.max(step, 1), 3);
  return { subject: outreachSubject(clampedStep), body: renderOutreachText(clampedStep, company.salutation), step: clampedStep };
}

export function draftConfirmationEmail(company: OutreachCompany) {
  const body = `${greetingLine(company.salutation)}\n\n${DEFAULT_CONFIRMATION}\n\n${SIGNATURE}`;
  return { subject: "Bestätigung: Speed-Dating KI-Mittelstand am 11. November", body };
}
