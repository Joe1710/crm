// Prüft vor dem Versand, ob die Domain einer E-Mail-Adresse überhaupt Post annimmt (MX- oder A-Eintrag).
// Bei technischen Problemen der Abfrage gilt die Adresse als „unbekannt“ und wird NICHT blockiert.

async function dnsAnswerCount(domain: string, type: "MX" | "A") {
  const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
    headers: { Accept: "application/dns-json" },
    signal: AbortSignal.timeout(4000)
  });
  const body = await response.json() as { Status?: number; Answer?: { type: number }[] };
  return { status: body.Status ?? 2, answers: (body.Answer ?? []).filter(a => a.type === (type === "MX" ? 15 : 1)).length };
}

export function emailDomain(email: string) {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export async function domainAcceptsMail(domain: string): Promise<boolean> {
  if (!domain) return false;
  try {
    const mx = await dnsAnswerCount(domain, "MX");
    if (mx.status === 3) return false; // NXDOMAIN: Domain existiert nicht
    if (mx.answers > 0) return true;
    const a = await dnsAnswerCount(domain, "A");
    return a.answers > 0;
  } catch {
    return true;
  }
}
