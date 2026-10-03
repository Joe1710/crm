import { inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { companies } from "../../../db/schema";
import { LETTER_CLOSING, LETTER_ENCLOSURE, LETTER_HEADLINE, LETTER_QR_TEXT, postalLetterBlocks } from "../../../lib/postal-letter";
import { requireSessionUser } from "../../../lib/session-auth";
import FitLetters from "./fit-letters";
import PrintButton from "./print-button";

function addressLines(address: string, city: string) {
  const lines = address.split(/[,;\n]/).map(p => p.trim()).filter(Boolean);
  return lines.length ? lines : [city];
}

function bold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part);
}

export default async function PostalPrintPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requireSessionUser("/postversand/druck");
  const { ids } = await searchParams;
  const idList = (ids ?? "").split(",").map(Number).filter(Number.isInteger);
  const rows = idList.length ? await getDb().select().from(companies).where(inArray(companies.id, idList)) : [];
  const today = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());

  return <div className="letters">
    <style>{`
      @page { size: A4; margin: 0; }
      html, body { background: #e9edf1; margin: 0; }
      /* Maße in mm, von der Oberkante des Blattes gerechnet (Briefbogen als Bild im Hintergrund; Logo, Firmenblock rechts bis ca. 12 cm und Fußzeile sind darin enthalten) */
      .letters {
        --left: 25mm;
        --sender-top: 55mm;     /* kleine Absenderzeile: beginnt exakt 5,5 cm von der Blattoberkante (Fensterumschlag) */
        --address-top: 62mm;    /* Anschrift des Empfängers, direkt unter der Absenderzeile */
        --headline-top: 106mm;  /* Überschrift – frühestens ab 10 cm */
        --headline-width: 114mm;/* neben dem Firmenblock des Briefbogens höchstens 11,5 cm breit */
        --date-left: 140mm; --date-top: 122mm;
        --body-top: 130mm;      /* ab 13 cm volle Breite */
        --body-width: 160mm; --body-height: 134mm;
        --cover-right: 25mm; --cover-bottom: 35mm; --cover-height: 64mm; /* Titelbild des Lehrbuchs unten rechts */
        font-family: Calibri, Carlito, Arial, Helvetica, sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .letters-bar { position: sticky; top: 0; background: #0b2239; color: #fff; padding: 12px 24px; display: flex; gap: 16px; align-items: center; font-size: 13px; z-index: 5; }
      .print-btn { background: #c9a227; color: #071a2e; border: 0; border-radius: 6px; padding: 9px 16px; font-weight: 700; cursor: pointer; }
      .letter { position: relative; width: 210mm; height: 296.5mm; margin: 16px auto; background: #fff; overflow: hidden; page-break-after: always; break-after: page; box-shadow: 0 2px 12px #0002; }
      .letter > img.paper { position: absolute; inset: 0; width: 210mm; height: 297mm; }
      .letter > img.cover { position: absolute; right: var(--cover-right); bottom: var(--cover-bottom); height: var(--cover-height); width: auto; box-shadow: 0 0.6mm 2mm #0003; }
      .sender-line { position: absolute; left: var(--left); top: var(--sender-top); font-size: 6.6pt; line-height: 1; color: #00589a; white-space: nowrap; }
      .recipient { position: absolute; left: var(--left); top: var(--address-top); width: 100mm; font-size: 11pt; line-height: 1.3; }
      .letter-date { position: absolute; left: var(--date-left); top: var(--date-top); font-size: 11pt; }
      .letter-headline { position: absolute; left: var(--left); top: var(--headline-top); width: var(--headline-width); margin: 0; font-weight: 700; line-height: 1.25; }
      .letter-headline span { display: block; white-space: nowrap; }
      .letter-body { position: absolute; left: var(--left); top: var(--body-top); width: var(--body-width); height: var(--body-height); line-height: 1.38; }
      .letter-body p { margin: 0 0 3.2mm; white-space: pre-line; }
      .qr-row { display: flex; align-items: center; gap: 5mm; margin: 0 0 4mm; }
      .qr-row img { width: 23mm; height: 23mm; flex: none; }
      .qr-row p { margin: 0; white-space: pre-line; }
      @media print { html, body { background: #fff; } .letters-bar { display: none; } .letter { margin: 0; box-shadow: none; } }
    `}</style>
    <div className="letters-bar"><PrintButton /><span>{rows.length} Brief{rows.length === 1 ? "" : "e"} · im Druckdialog „Ränder: Keine“, „Skalierung: 100 %“ und „Kopf-/Fußzeilen: aus“ wählen · Plakat beilegen</span></div>
    {rows.length === 0 && <p style={{ padding: 40 }}>Keine Unternehmen ausgewählt.</p>}
    {rows.map(c => <section className="letter" key={c.id}>
      <img className="paper" src="/briefbogen.png" alt="" />
      <img className="cover" src="/lehrbuch-cover.jpg" alt="" />
      <div className="sender-line">JK KI-MasterClass UG | Koburger Straße 198 | 04416 Markkleeberg</div>
      <div className="recipient">
        <strong>{c.name}</strong><br />
        {c.manager && <>z. Hd. {c.salutation || c.manager}<br /></>}
        {addressLines(c.address, c.city).map((line, i) => <span key={i}>{line}<br /></span>)}
      </div>
      <div className="letter-date">{today}</div>
      <h1 className="letter-headline">{LETTER_HEADLINE.map(line => <span key={line}>{line}</span>)}</h1>
      <div className="letter-body">
        {postalLetterBlocks(c.salutation).map((b, i) => <p key={i}>{bold(b)}</p>)}
        <div className="qr-row"><img src="/qr-anmeldung.svg" alt="QR-Code zur Anmeldung" /><p>{bold(LETTER_QR_TEXT.join("\n"))}</p></div>
        <p>{LETTER_CLOSING}</p>
        <p style={{ marginTop: "4mm" }}>Mit freundlichen Grüßen{"\n\n\n"}Jürgen Kullmann</p>
        <p style={{ fontSize: "0.85em", color: "#444", marginTop: "6mm" }}>{LETTER_ENCLOSURE}</p>
      </div>
    </section>)}
    <FitLetters />
  </div>;
}
