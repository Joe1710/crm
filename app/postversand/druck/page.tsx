import { inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { companies } from "../../../db/schema";
import { renderOutreachText, OUTREACH_TEMPLATES } from "../../../lib/outreach-html";
import { requireSessionUser } from "../../../lib/session-auth";
import PrintButton from "./print-button";

function addressLines(address: string, city: string) {
  const lines = address.split(/[,;\n]/).map(p => p.trim()).filter(Boolean);
  return lines.length ? lines : [city];
}

export default async function PostalPrintPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requireSessionUser("/postversand/druck");
  const { ids } = await searchParams;
  const idList = (ids ?? "").split(",").map(Number).filter(Number.isInteger);
  const rows = idList.length ? await getDb().select().from(companies).where(inArray(companies.id, idList)) : [];
  const today = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
  const subject = OUTREACH_TEMPLATES[1].subject;

  return <div className="letters">
    <style>{`
      @page { size: A4; margin: 0; }
      body { background: #e9edf1; }
      .letters { font-family: Calibri, Arial, Helvetica, sans-serif; color: #15293d; }
      .letters-bar { position: sticky; top: 0; background: #0b2239; color: #fff; padding: 12px 24px; display: flex; gap: 16px; align-items: center; font-size: 13px; z-index: 5; }
      .print-btn { background: #c9a227; color: #071a2e; border: 0; border-radius: 6px; padding: 9px 16px; font-weight: 700; cursor: pointer; }
      .letter { width: 210mm; min-height: 297mm; margin: 16px auto; background: #fff; padding: 20mm 22mm 18mm 25mm; box-sizing: border-box; page-break-after: always; box-shadow: 0 2px 12px #0002; font-size: 11pt; line-height: 1.5; }
      .sender-line { font-size: 8pt; color: #51677c; border-bottom: 1px solid #c8d2dc; padding-bottom: 2mm; margin-bottom: 4mm; width: 125mm; white-space: nowrap; }
      .recipient { min-height: 38mm; font-size: 11pt; line-height: 1.4; }
      .letter-date { text-align: right; margin: 6mm 0 8mm; }
      .letter h1 { font-size: 12pt; margin: 0 0 6mm; }
      .letter p { margin: 0 0 4.2mm; white-space: pre-line; }
      @media print { body { background: #fff; } .letters-bar { display: none; } .letter { margin: 0; box-shadow: none; } }
    `}</style>
    <div className="letters-bar"><PrintButton /><span>{rows.length} Brief{rows.length === 1 ? "" : "e"} · im Druckdialog „Ränder: Keine“ und „Kopf-/Fußzeilen: aus“ wählen</span></div>
    {rows.length === 0 && <p style={{ padding: 40 }}>Keine Unternehmen ausgewählt.</p>}
    {rows.map(c => {
      const blocks = renderOutreachText(1, c.salutation).split("\n\n");
      return <section className="letter" key={c.id}>
        <div className="sender-line">JK KI-MasterClass UG (haftungsbeschränkt) · Koburger Straße 198 · 04416 Markkleeberg</div>
        <div className="recipient">
          <strong>{c.name}</strong><br />
          {c.manager && <>z. Hd. {c.salutation || c.manager}<br /></>}
          {addressLines(c.address, c.city).map((line, i) => <span key={i}>{line}<br /></span>)}
        </div>
        <div className="letter-date">Markkleeberg, {today}</div>
        <h1>{subject}</h1>
        {blocks.map((b, i) => <p key={i}>{b}</p>)}
      </section>;
    })}
  </div>;
}
