export type OutreachCompany = {
  name: string;
  city: string;
  industry: string;
  manager: string;
  distance: number;
  notes: string;
};

export type OutreachProfile = {
  senderName: string;
  bio: string;
  styleSamples: string[];
};

export class OutreachApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "OutreachApiError";
  }
}

function greeting(manager: string): string {
  const name = manager.trim();
  return name ? `Guten Tag ${name},` : "Guten Tag,";
}

function signature(senderName: string): string {
  return [
    "Mit freundlichen Grüßen",
    senderName,
    "",
    "JK KI-MasterClass.com (haftungsbeschränkt)",
    "Koburger Straße 198",
    "04416 Markkleeberg",
    "",
    "Telefon: +49 162 3456793",
    "E-Mail: jk@ki-masterclass.com",
    "Web: www.ki-masterclass.com",
    "",
    "Amtsgericht Leipzig, HRB 43013"
  ].join("\n");
}

export function draftOutreachEmail(company: OutreachCompany, profile: OutreachProfile) {
  const bio = profile.bio.trim();
  if (!bio) throw new OutreachApiError("Bitte zuerst unter „Profil & Stil“ deinen persönlichen Hintergrund hinterlegen.", 400);

  const body = `${greeting(company.manager)}\n\n${bio}\n\n${signature(profile.senderName)}`;
  const subject = `Einladung zur KI Masterclass – ${company.name}`;

  return { subject, body };
}
