// Briefversand: Kriterien und Status (reine Funktionen, in Oberfläche, API und Recherche gemeinsam genutzt).

export const POSTAL_STATUS = { marked: "vorgemerkt", sent: "versendet" } as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function hasValidEmail(email: string | null | undefined) {
  return EMAIL_PATTERN.test(String(email ?? "").trim());
}

/** Vollständige Postanschrift = Straße mit Hausnummer + fünfstellige PLZ (+ Ort steht ohnehin im Datensatz). */
export function hasCompletePostalAddress(address: string | null | undefined) {
  const text = String(address ?? "").trim();
  if (!/\b\d{5}\b/.test(text)) return false;
  const parts = text.split(/[,;\n]/).map(p => p.trim()).filter(Boolean);
  return parts.some(p => /\p{L}/u.test(p) && /\d/.test(p) && !/^\d{5}\b/.test(p));
}

type PostalCompany = { email?: string | null; address?: string | null; postalStatus?: string | null };

/** Brief-Kandidat: keine (bekannte) E-Mail-Adresse, aber vollständige Postanschrift. */
export function isPostalCandidate(company: PostalCompany) {
  return !hasValidEmail(company.email) && hasCompletePostalAddress(company.address);
}

export function postalLabel(company: PostalCompany) {
  if (company.postalStatus === POSTAL_STATUS.sent) return "Brief versendet";
  if (company.postalStatus === POSTAL_STATUS.marked) return "Brief vorgemerkt";
  return isPostalCandidate(company) ? "Brief möglich" : "";
}
