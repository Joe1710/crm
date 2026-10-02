// Die drei festen Aussendungen zum Speed-Dating KI-Mittelstand (Wortlaut von Jürgen, Stand 01.10.2026)
// und ihr HTML-Layout. Reine Funktionen ohne Server-Abhängigkeiten.

export const ANMELDUNG_URL = "https://ki-masterclass.com/ki-speed-date/";

const EVENT = {
  dateLine: "Mittwoch, 11. November 2026 · 18:00–21:00 Uhr",
  pill: "Mittwoch, 11. November 2026 · Kainsbacher Mühle, Happurg",
  cardDate: "Mi., 11.11.2026<br>18:00–21:00 Uhr",
  cardPlace: "Kainsbacher Mühle (Tagungsbereich)<br>Mühlgasse 1, 91230 Kainsbach/Happurg",
  placeText: "Kainsbacher Mühle (Tagungsbereich)\nMühlgasse 1, 91230 Kainsbach/Happurg"
};

export type Template = {
  subject: string;
  eyebrow: string;
  headline: string;
  paragraphs: string[];
  quote: string;
  quoteSub: string;
  /** Satz direkt vor dem Anmelde-Button (optional) */
  beforeButton?: string;
  /** Beschriftung des Buttons (Standard: „Zum Ablauf und zur Anmeldung →“) */
  buttonLabel?: string;
  buttonUrl?: string;
  costLine: string;
  closing: string[];
};

export const OUTREACH_TEMPLATES: Record<1 | 2 | 3 | 4, Template> = {
  1: {
    subject: "Ihre größte Herausforderung im Betrieb? Bringen Sie sie zum KI-Mittelstandsabend mit",
    eyebrow: "Einladung · Speed-Dating KI-Mittelstand · Region Nürnberg",
    headline: "Bringen Sie Ihre größte Herausforderung mit.",
    paragraphs: [
      "welche wiederkehrende Aufgabe kostet in Ihrem Unternehmen Zeit – oder bindet Mitarbeitende, obwohl sie einfacher laufen könnte?",
      "Seit 2023 beschäftige ich mich intensiv mit den Möglichkeiten der KI. Als Unternehmer mit über 35 Jahren Berufserfahrung interessiert mich dabei vor allem eine Frage: Wo hilft KI im Betriebsalltag wirklich?",
      "Dazu lade ich Sie herzlich zum Speed-Dating KI-Mittelstand in der Region Nürnberg ein. An diesem Abend erleben Sie einen kurzen Impuls, eine Live-Demonstration an einem Mittelstandsprojekt und Austausch zu Ihrem eigenen Thema.",
      "Sie brauchen keine Vorkenntnisse. Bringen Sie einfach eine wiederkehrende Aufgabe oder eine konkrete Frage aus Ihrem Unternehmen mit. Ziel ist, dass Sie Ihr Thema besser einordnen und mit einem konkreten nächsten Umsetzungsschritt nach Hause gehen.",
      "Der Schwerpunkt liegt auf Praxis und Austausch. Zum Abschluss geben wir außerdem einen kurzen Einblick, wie die KI-MasterClass Teams bei der weiteren Umsetzung begleitet."
    ],
    quote: "„Rein mit Ihrer Frage. Raus mit einem klaren nächsten Schritt.“",
    quoteSub: "Impuls · Live-Demonstration an einem Mittelstandsprojekt · Austausch zu Ihrem Thema",
    costLine: "Teilnahme kostenfrei · maximal 50 Personen",
    closing: ["Ich freue mich darauf, Sie kennenzulernen."]
  },
  2: {
    subject: "E-Mail-Flut im Betrieb? Bringen Sie den Prozess zum KI-Mittelstandsabend mit",
    eyebrow: "Erinnerung · Speed-Dating KI-Mittelstand · Region Nürnberg",
    headline: "Bringen Sie Ihren Prozess mit.",
    paragraphs: [
      "vielleicht ist meine Einladung zum Speed-Dating KI-Mittelstand im hektischen Alltag untergegangen.",
      "Wenn die Bearbeitung Ihres Postfachs viel Zeit kostet, könnte das ein interessanter Anwendungsfall für KI sein. Ob sich E-Mails sortieren, priorisieren oder für eine Antwort vorbereiten lassen, hängt jedoch vom jeweiligen Ablauf und den nötigen Prüfschritten ab.",
      "Am Abend zeigen wir anhand eines Mittelstandsprojekts, wie sich ein KI-Anwendungsfall praktisch durchdenken lässt. Sie können auch Ihr eigenes Thema einbringen und klären, welcher nächste Schritt für Ihr Unternehmen sinnvoll wäre. Der Schwerpunkt liegt auf Praxis und Austausch; zum Abschluss geben wir einen kurzen Einblick in die KI-MasterClass."
    ],
    quote: "„Bringen Sie Ihr eigenes Thema mit.“",
    quoteSub: "Und klären Sie, welcher nächste Schritt für Ihr Unternehmen sinnvoll wäre.",
    costLine: "Teilnahme kostenfrei · maximal 50 Personen",
    closing: ["Ich freue mich, wenn Sie dabei sind."]
  },
  3: {
    subject: "Letzte Erinnerung: Speed-Dating KI-Mittelstand am 11. November",
    eyebrow: "Letzte Erinnerung · Speed-Dating KI-Mittelstand · Region Nürnberg",
    headline: "Ein Abend. Ihr Thema. Ihr nächster Schritt.",
    paragraphs: [
      "ich möchte Sie vor dem Termin noch einmal auf den Speed-Dating KI-Mittelstand in der Region Nürnberg aufmerksam machen.",
      "Am Mittwoch, 11. November 2026, zeigen wir von 18:00 bis 21:00 Uhr anhand eines Mittelstandsprojekts, wie sich ein konkreter KI-Anwendungsfall durchdenken lässt. Sie können auch eine eigene betriebliche Aufgabe oder Frage mitbringen. Ziel ist, mit einem klaren nächsten Schritt nach Hause zu gehen – nicht mit dem Versprechen, in drei Stunden eine fertige Unternehmenslösung zu bauen."
    ],
    quote: "„Mit einem klaren nächsten Schritt nach Hause gehen.“",
    quoteSub: "Eine eigene betriebliche Aufgabe oder Frage können Sie gern mitbringen.",
    beforeButton: "Wenn Sie dabei sein möchten, melden Sie sich bitte über die Veranstaltungsseite an:",
    costLine: "Kostenfreie Teilnahme · maximal 50 Personen",
    closing: ["Falls KI für Ihr Unternehmen derzeit keine Priorität hat, ist keine Antwort erforderlich."]
  },
  4: {
    subject: "Vielen Dank für Ihre Zusage – bitte noch kurz verbindlich anmelden",
    eyebrow: "Ihre Zusage · Speed-Dating KI-Mittelstand · Region Nürnberg",
    headline: "Schön, dass Sie dabei sind!",
    paragraphs: [
      "vielen Dank für Ihre Zusage zum Speed-Dating KI-Mittelstand – ich freue mich sehr, Sie persönlich kennenzulernen.",
      "Damit wir Ihren Platz fest einplanen können, bitte ich Sie um einen letzten kleinen Schritt: Melden Sie sich bitte über die Veranstaltungsseite verbindlich an und bestätigen Sie dabei die Datenschutzhinweise. Das dauert weniger als eine Minute. Erst mit dieser Anmeldung ist Ihr Platz reserviert.",
      "Gern können Sie bei der Anmeldung schon eine Aufgabe oder Frage aus Ihrem Unternehmen angeben – dann können wir am Abend direkt daran anknüpfen."
    ],
    quote: "„Ihr Platz ist vorgemerkt – mit der Anmeldung wird er fest.“",
    quoteSub: "Maximal 50 Plätze · Teilnahme kostenfrei",
    beforeButton: "Hier geht es zur verbindlichen Anmeldung:",
    buttonLabel: "Jetzt verbindlich anmelden →",
    buttonUrl: `${ANMELDUNG_URL}#anmeldung`,
    costLine: "Kostenfreie Teilnahme · Anmeldung mit Datenschutzbestätigung",
    closing: ["Bei Fragen erreichen Sie mich jederzeit per E-Mail oder unter +49 162 3456793."]
  }
};

/** Bestätigung an Personen, die sich über die Website angemeldet haben. */
export const SIGNUP_CONFIRMATION: Template = {
  subject: "Ihre Anmeldung zum Speed-Dating KI-Mittelstand ist bestätigt",
  eyebrow: "Anmeldebestätigung · Speed-Dating KI-Mittelstand",
  headline: "Ihr Platz ist reserviert.",
  paragraphs: [
    "vielen Dank für Ihre Anmeldung zum Speed-Dating KI-Mittelstand. Ihr Platz ist fest für Sie reserviert.",
    "Bringen Sie gern eine wiederkehrende Aufgabe oder eine konkrete Frage aus Ihrem Unternehmen mit – dann können wir am Abend direkt daran arbeiten.",
    "Sollte Ihnen etwas dazwischenkommen, geben Sie mir bitte kurz per Antwort auf diese E-Mail Bescheid, damit ein anderes Unternehmen nachrücken kann."
  ],
  quote: "„Ich freue mich auf einen spannenden Abend mit Ihnen.“",
  quoteSub: "Impuls · Live-Demonstration · Austausch zu Ihrem Thema",
  buttonLabel: "Ablauf des Abends ansehen →",
  costLine: "Kostenfreie Teilnahme · Abendimbiss und Getränke inklusive",
  closing: ["Bis zum 11. November!"]
};

const SIGNATURE_LINES = [
  "Jürgen Kullmann",
  "JK KI-MasterClass UG (haftungsbeschränkt)",
  "Koburger Straße 198 · 04416 Markkleeberg",
  "Telefon: +49 162 3456793 · E-Mail: jk@ki-masterclass.com · Web: www.ki-masterclass.com",
  "Amtsgericht Leipzig, HRB 43013"
];

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function greetingLine(salutation: string) {
  const s = salutation.trim();
  return s ? `Guten Tag ${s},` : "Guten Tag,";
}

function clampStep(step: number): 1 | 2 | 3 | 4 {
  return (step <= 1 ? 1 : step >= 4 ? 4 : step) as 1 | 2 | 3 | 4;
}

export function outreachSubject(step: number) {
  return OUTREACH_TEMPLATES[clampStep(step)].subject;
}

export function renderOutreachText(step: number, salutation: string) {
  return renderTemplateText(OUTREACH_TEMPLATES[clampStep(step)], salutation);
}

export function renderTemplateText(t: Template, salutation: string) {
  const parts = [
    greetingLine(salutation),
    ...t.paragraphs,
    `${EVENT.dateLine}\n${EVENT.placeText}\n${t.costLine}`,
    ...(t.beforeButton ? [t.beforeButton] : []),
    `${(t.buttonLabel ?? "Zum Ablauf und zur Anmeldung").replace(" →", "")}: ${t.buttonUrl ?? ANMELDUNG_URL}`,
    ...t.closing,
    `Mit freundlichen Grüßen\n\n${SIGNATURE_LINES.join("\n")}`
  ];
  return parts.join("\n\n");
}

export function renderOutreachHtml(step: number, salutation: string, testNote?: string): string {
  return renderTemplateHtml(OUTREACH_TEMPLATES[clampStep(step)], salutation, testNote);
}

export function renderTemplateHtml(t: Template, salutation: string, testNote?: string): string {
  const p = (text: string, extra = "") => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;${extra}">${escapeHtml(text)}</p>`;
  const [name, ...rest] = SIGNATURE_LINES;

  return `<!doctype html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(t.subject)}</title></head>
<body style="margin:0;background:#e9edf1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9edf1;padding:32px 0">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:100%;background:#ffffff;border-radius:10px;overflow:hidden;font-family:Calibri,Arial,Helvetica,sans-serif;color:#15293d">
  ${testNote ? `<tr><td style="background:#fef3cd;color:#7a5c00;padding:10px 20px;text-align:center;font-size:12px;font-weight:bold">${escapeHtml(testNote)}</td></tr>` : ""}
  <tr><td style="background:#0b2239;padding:36px 44px;color:#ffffff">
    <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#e6c557;font-weight:bold">${escapeHtml(t.eyebrow)}</div>
    <div style="margin-top:14px;font-size:27px;line-height:1.25;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-weight:bold">${escapeHtml(t.headline)}</div>
    <div style="display:inline-block;margin-top:16px;background:#16324f;border:1px solid #c9a227;color:#e6c557;border-radius:20px;padding:6px 16px;font-size:12px;font-weight:bold">${escapeHtml(EVENT.pill)}</div>
  </td></tr>
  <tr><td style="padding:38px 44px 6px">
    ${p(greetingLine(salutation), "margin-bottom:18px")}
    ${t.paragraphs.map(x => p(x)).join("\n    ")}
  </td></tr>
  <tr><td style="padding:6px 44px 26px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#071a2e;border-radius:8px">
      <tr><td style="padding:26px 30px;text-align:center">
        <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;color:#e6c557;font-size:20px;line-height:1.4">${escapeHtml(t.quote)}</div>
        <div style="margin-top:10px;font-size:13px;line-height:1.5;color:#c7d6e4">${escapeHtml(t.quoteSub)}</div>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 44px 26px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="49%" valign="top" style="background:#f6f8fa;border-left:4px solid #3fa9a0;border-radius:6px;padding:16px 18px">
        <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#51677c;font-weight:bold">Termin</div>
        <div style="margin-top:4px;font-size:14px;line-height:1.5;color:#15293d">${EVENT.cardDate}</div>
      </td>
      <td width="2%"></td>
      <td width="49%" valign="top" style="background:#f6f8fa;border-left:4px solid #3fa9a0;border-radius:6px;padding:16px 18px">
        <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#51677c;font-weight:bold">Ort</div>
        <div style="margin-top:4px;font-size:14px;line-height:1.5;color:#15293d">${EVENT.cardPlace}</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:0 44px 32px;text-align:center">
    ${t.beforeButton ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;text-align:left">${escapeHtml(t.beforeButton)}</p>` : ""}
    <a href="${t.buttonUrl ?? ANMELDUNG_URL}" style="display:inline-block;background:#c9a227;color:#071a2e;font-weight:bold;font-size:15px;text-decoration:none;padding:14px 34px;border-radius:6px">${escapeHtml(t.buttonLabel ?? "Zum Ablauf und zur Anmeldung →")}</a>
    <div style="margin-top:10px;font-size:12px;color:#6f8396">${escapeHtml(t.costLine)}</div>
  </td></tr>
  <tr><td style="padding:0 44px 8px">
    ${t.closing.map(x => p(x)).join("\n    ")}
  </td></tr>
  <tr><td style="padding:22px 44px 36px;font-size:13.5px;line-height:1.7;color:#15293d;border-top:1px solid #d9e1e9">
    Mit freundlichen Grüßen<br><strong>${escapeHtml(name)}</strong>
    <div style="margin-top:12px;color:#51677c">${rest.map(escapeHtml).join("<br>")}</div>
  </td></tr>
  <tr><td style="background:#f6f8fa;padding:16px 44px;text-align:center;font-size:11px;color:#6f8396">
    Diese E-Mail wurde im Rahmen der Einladung zum Speed-Dating KI-Mittelstand der KI-MasterClass versendet.
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Einfache HTML-Hülle im gleichen Stil für frei formulierte Texte (z. B. Bestätigung). */
export function renderPlainHtml(body: string, testNote?: string) {
  const blocks = body.split(/\n{2,}/).map(b => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7">${escapeHtml(b).replaceAll("\n", "<br>")}</p>`).join("\n");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"></head><body style="margin:0;background:#e9edf1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9edf1;padding:32px 0"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:100%;background:#ffffff;border-radius:10px;overflow:hidden;font-family:Calibri,Arial,Helvetica,sans-serif;color:#15293d">
${testNote ? `<tr><td style="background:#fef3cd;color:#7a5c00;padding:10px 20px;text-align:center;font-size:12px;font-weight:bold">${escapeHtml(testNote)}</td></tr>` : ""}
<tr><td style="background:#0b2239;padding:26px 44px;color:#e6c557;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:bold">KI-MasterClass · Speed-Dating KI-Mittelstand</td></tr>
<tr><td style="padding:34px 44px 30px">${blocks}</td></tr>
</table></td></tr></table></body></html>`;
}
