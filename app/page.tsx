"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Company = {
  id: number; name: string; city: string; address: string; distance: number;
  industry: string; employees: string; phone: string; email: string; website: string;
  manager: string; stage: string; priority: string; owner: string; nextAction: string;
  nextDate: string; source: string; notes: string;
};

type EventItem = { id: number; title: string; date: string; location: string; capacity: number; invited: number; confirmed: number; attended: number };
type ResearchJob = { id: number; industry: string; radius: number; employees: string; legalForm: string; region: string; status: string };

const stages = ["Neu gefunden", "Qualifiziert", "Kontakt vorgesehen", "Kontakt aufgenommen", "Gespräch geführt", "Interesse", "Unterlagen versendet", "Veranstaltung zugesagt", "Teilgenommen", "Angebot erstellt", "Auftrag abgeschlossen"];

const stageShort: Record<string, string> = {
  "Neu gefunden": "Neu", Qualifiziert: "Qualifiziert", "Kontakt vorgesehen": "Vorgesehen",
  "Kontakt aufgenommen": "Kontaktiert", "Gespräch geführt": "Gespräch", Interesse: "Interesse",
  "Unterlagen versendet": "Unterlagen", "Veranstaltung zugesagt": "Zugesagt", Teilgenommen: "Teilnahme",
  "Angebot erstellt": "Angebot", "Auftrag abgeschlossen": "Abschluss"
};

const fallbackCompanies: Company[] = [
  { id: 1, name: "Franken Präzisionstechnik GmbH", city: "Nürnberg", address: "Fürther Straße 105, 90429 Nürnberg", distance: 3, industry: "Maschinenbau", employees: "50–99", phone: "+49 911 234 890", email: "info@franken-praezision.de", website: "franken-praezision.de", manager: "Dr. Martin Seidel", stage: "Interesse", priority: "A", owner: "Ivan", nextAction: "Termin für Erstgespräch bestätigen", nextDate: "2026-07-23", source: "Branchenverzeichnis", notes: "Interesse an KI für Qualitätssicherung." },
  { id: 2, name: "Metropol IT-Systemhaus GmbH", city: "Fürth", address: "Flößaustraße 22, 90763 Fürth", distance: 9, industry: "IT-Dienstleistungen", employees: "20–49", phone: "+49 911 765 432", email: "kontakt@metropol-it.de", website: "metropol-it.de", manager: "Sabine Krüger", stage: "Unterlagen versendet", priority: "A", owner: "Ivan", nextAction: "Nachfassen zur Einladung", nextDate: "2026-07-22", source: "Unternehmenswebsite", notes: "Unterlagen am 18.07. versendet." },
  { id: 3, name: "Erlanger Medizintechnik KG", city: "Erlangen", address: "Henkestraße 18, 91054 Erlangen", distance: 19, industry: "Medizintechnik", employees: "100–249", phone: "+49 9131 456 780", email: "office@em-technik.de", website: "em-technik.de", manager: "Thomas Brandt", stage: "Veranstaltung zugesagt", priority: "A", owner: "Ivan", nextAction: "Teilnehmernamen aufnehmen", nextDate: "2026-07-28", source: "Netzwerk", notes: "Zusage für zwei Führungskräfte." },
  { id: 4, name: "Hofmann Logistik & Service GmbH", city: "Schwabach", address: "Nördliche Ringstraße 8, 91126 Schwabach", distance: 16, industry: "Logistik", employees: "50–99", phone: "+49 9122 800 120", email: "info@hofmann-logistik.de", website: "hofmann-logistik.de", manager: "Katrin Hofmann", stage: "Kontakt aufgenommen", priority: "B", owner: "Ivan", nextAction: "Erneuter Anruf", nextDate: "2026-07-24", source: "Messekontakt", notes: "Assistenz bittet um Rückruf Donnerstag." },
  { id: 5, name: "Aischgrund Verpackungen GmbH", city: "Herzogenaurach", address: "Industriestraße 12, 91074 Herzogenaurach", distance: 21, industry: "Verpackung", employees: "20–49", phone: "+49 9132 612 330", email: "kontakt@aischgrund-pack.de", website: "aischgrund-pack.de", manager: "Jürgen Meier", stage: "Qualifiziert", priority: "B", owner: "Ivan", nextAction: "Entscheider direkt ansprechen", nextDate: "2026-07-25", source: "Branchenverzeichnis", notes: "Gute Passung, Produktion mit 38 Beschäftigten." },
  { id: 6, name: "Pegnitz Elektrotechnik GmbH", city: "Lauf a.d. Pegnitz", address: "Sichartstraße 7, 91207 Lauf", distance: 18, industry: "Elektrotechnik", employees: "10–19", phone: "+49 9123 987 450", email: "mail@pegnitz-elektro.de", website: "pegnitz-elektro.de", manager: "Andreas Wolf", stage: "Neu gefunden", priority: "C", owner: "Ivan", nextAction: "Daten prüfen", nextDate: "2026-07-29", source: "Import", notes: "Geschäftsführung noch verifizieren." },
  { id: 7, name: "Altmühl Kunststofftechnik GmbH", city: "Roth", address: "Gildestraße 4, 91154 Roth", distance: 27, industry: "Kunststofftechnik", employees: "50–99", phone: "+49 9171 220 890", email: "info@altmuehl-kunststoff.de", website: "altmuehl-kunststoff.de", manager: "Petra Lindner", stage: "Gespräch geführt", priority: "A", owner: "Ivan", nextAction: "Einladung personalisieren", nextDate: "2026-07-22", source: "Empfehlung", notes: "Geschäftsführerin möchte konkreten Praxisnutzen sehen." },
  { id: 8, name: "Jura Gebäudetechnik GmbH", city: "Neumarkt i.d.OPf.", address: "Regensburger Straße 31, 92318 Neumarkt", distance: 41, industry: "Gebäudetechnik", employees: "100–249", phone: "+49 9181 440 210", email: "zentrale@jura-gt.de", website: "jura-gt.de", manager: "Michael Schuster", stage: "Kontakt vorgesehen", priority: "B", owner: "Ivan", nextAction: "Kontakt über Empfehlung", nextDate: "2026-07-30", source: "Netzwerk", notes: "War Teilnehmer einer regionalen Wirtschaftsveranstaltung." }
];

const fallbackEvents: EventItem[] = [
  { id: 1, title: "KI-Abend Nürnberg", date: "2026-09-17T18:00", location: "Nürnberg · Tafelhof Palais", capacity: 60, invited: 34, confirmed: 18, attended: 0 },
  { id: 2, title: "KI-Werkstatt Erlangen", date: "2026-10-08T18:30", location: "Erlangen · Digitales Gründerzentrum", capacity: 45, invited: 16, confirmed: 7, attended: 0 },
  { id: 3, title: "Mittelstand trifft KI", date: "2026-06-25T18:00", location: "Fürth · Gewerbehof", capacity: 40, invited: 51, confirmed: 29, attended: 24 }
];

function initials(name: string) { return name.split(" ").slice(0, 2).map(x => x[0]).join(""); }
function fmtDate(value: string) { return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }

export default function Home() {
  const [view, setView] = useState("Übersicht");
  const [radius, setRadius] = useState(50);
  const [companies, setCompanies] = useState<Company[]>(fallbackCompanies);
  const [events] = useState<EventItem[]>(fallbackEvents);
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("Alle Branchen");
  const [selected, setSelected] = useState<Company | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [researching, setResearching] = useState(false);
  const [lastResearch, setLastResearch] = useState<ResearchJob | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/companies").then(r => r.ok ? r.json() : Promise.reject()).then(d => d.companies?.length && setCompanies(d.companies)).catch(() => {});
  }, []);

  const withinRadius = useMemo(() => companies.filter(c => c.distance <= radius), [companies, radius]);
  const industries = useMemo(() => ["Alle Branchen", ...Array.from(new Set(companies.map(c => c.industry)))], [companies]);
  const filtered = withinRadius.filter(c => (industry === "Alle Branchen" || c.industry === industry) && `${c.name} ${c.city} ${c.manager}`.toLowerCase().includes(query.toLowerCase()));
  const qualified = withinRadius.filter(c => stages.indexOf(c.stage) >= 1).length;
  const contacted = withinRadius.filter(c => stages.indexOf(c.stage) >= 3).length;
  const interested = withinRadius.filter(c => stages.indexOf(c.stage) >= 5).length;
  const confirmed = withinRadius.filter(c => stages.indexOf(c.stage) >= 7).length;
  const closed = withinRadius.filter(c => c.stage === "Auftrag abgeschlossen").length;

  async function updateStage(company: Company, stage: string) {
    const updated = { ...company, stage };
    setCompanies(old => old.map(c => c.id === company.id ? updated : c));
    setSelected(updated);
    fetch(`/api/companies/${company.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) }).catch(() => {});
    setNotice(`${company.name}: Status auf „${stageShort[stage]}“ gesetzt`);
    setTimeout(() => setNotice(""), 2800);
  }

  async function addCompany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next: Company = { id: Date.now(), name: String(data.get("name")), city: String(data.get("city")), address: String(data.get("address")), distance: Number(data.get("distance")), industry: String(data.get("industry")), employees: String(data.get("employees")), phone: String(data.get("phone")), email: String(data.get("email")), website: String(data.get("website")), manager: String(data.get("manager")), stage: "Neu gefunden", priority: "B", owner: "Ivan", nextAction: "Daten prüfen und qualifizieren", nextDate: "2026-07-28", source: "Manuell", notes: "" };
    setCompanies(old => [next, ...old]); setShowAdd(false); setNotice("Unternehmen wurde angelegt");
    try { const r = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }); if (r.ok) { const d = await r.json(); setCompanies(old => old.map(c => c.id === next.id ? d.company : c)); } } catch {}
    setTimeout(() => setNotice(""), 2800);
  }

  async function startResearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResearching(true);
    const data = new FormData(e.currentTarget);
    const criteria = {
      industry: String(data.get("industry")), radius: Number(data.get("radius")),
      employees: String(data.get("employees")), legalForm: String(data.get("legalForm")),
      region: String(data.get("region")), limit: 10
    };
    try {
      const response = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(criteria) });
      const result = await response.json() as { job?: ResearchJob; companies?: Company[]; message?: string };
      if (!response.ok) throw new Error(result.message || "Recherche konnte nicht gestartet werden");
      if (result.companies?.length) setCompanies(old => [...result.companies!, ...old]);
      if (result.job) setLastResearch(result.job);
      setShowResearch(false);
      setNotice(result.companies?.length ? `${result.companies.length} neue Unternehmen wurden gespeichert` : "Rechercheauftrag gespeichert – Datenquelle wird verbunden");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Recherche konnte nicht gestartet werden");
    } finally {
      setResearching(false); setTimeout(() => setNotice(""), 4200);
    }
  }

  function exportCsv() {
    const rows = [["Unternehmen", "Ort", "Branche", "Geschäftsführung", "Telefon", "E-Mail", "Entfernung", "Status"], ...filtered.map(c => [c.name, c.city, c.industry, c.manager, c.phone, c.email, String(c.distance), c.stage])];
    const blob = new Blob(["\ufeff" + rows.map(r => r.map(v => `"${v.replaceAll('"', '""')}"`).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `KI-Masterclass-Leads-${radius}km.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">KI</span><div><strong>MASTERCLASS</strong><small>REGION NÜRNBERG</small></div></div>
      <nav aria-label="Hauptnavigation">
        {["Übersicht", "Unternehmen", "Sales Funnel", "Aufgaben", "Veranstaltungen"].map((item, i) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}><span>{["⌂", "▦", "▽", "✓", "◇"][i]}</span>{item}{item === "Aufgaben" && <em>4</em>}</button>)}
      </nav>
      <div className="sidebar-foot"><div className="sync-dot" /> <div><strong>Synchronisiert</strong><small>Zuletzt gerade eben</small></div></div>
      <div className="user"><span>IK</span><div><strong>Ivan K.</strong><small>Akquisition</small></div><b>⋯</b></div>
    </aside>

    <main>
      <header className="topbar"><div><span className="live-dot" /> Expansion Nürnberg · Pilotphase</div><div className="top-actions"><button aria-label="Benachrichtigungen">♢<i /></button><span className="avatar">JK</span></div></header>

      <section className="content">
        {view === "Übersicht" && <>
          <div className="page-head"><div><p className="eyebrow">MARKTPOTENZIAL & AKQUISITION</p><h1>Guten Abend, Jürgen.</h1><p>Hier sehen Sie Marktpotenzial und aktuellen Akquisitionsfortschritt.</p></div><div className="head-actions"><button className="research-button" onClick={() => setShowResearch(true)}>✦ Neue Kunden suchen</button><button className="primary" onClick={() => setShowAdd(true)}>＋ Unternehmen hinzufügen</button></div></div>
          <div className="radius-card"><div><span className="location-pin">●</span><div><strong>Marktgebiet</strong><p>Ausgangspunkt Nürnberg · <b>{radius} km Umkreis</b></p></div></div><div className="range-wrap"><span>10</span><input aria-label="Marktradius" type="range" min="10" max="100" step="10" value={radius} onChange={e => setRadius(Number(e.target.value))}/><span>100 km</span><output>{radius} km</output></div></div>
          <div className="kpis">
            <article className="market-potential"><span className="kpi-icon blue">◎</span><div><small>MARKTPOTENZIAL</small><strong>{withinRadius.length * 137}</strong><p>geschätzte KMU im Gebiet</p></div><em>Radius {radius} km</em><button className="kpi-search" onClick={() => setShowResearch(true)}>✦ 10 neue finden</button></article>
            <article><span className="kpi-icon green">▣</span><div><small>IN DATENBANK</small><strong>{withinRadius.length}</strong><p>{qualified} davon qualifiziert</p></div><em className="up">↑ 12 %</em></article>
            <article><span className="kpi-icon amber">◫</span><div><small>IN BEARBEITUNG</small><strong>{contacted}</strong><p>{interested} mit Interesse</p></div><em>Ivan</em></article>
            <article><span className="kpi-icon violet">◆</span><div><small>ZUSAGEN</small><strong>{confirmed}</strong><p>{closed} Masterclass-Aufträge</p></div><em className="up">↑ aktiv</em></article>
          </div>
          <div className="overview-grid">
            <article className="panel funnel-panel"><div className="panel-head"><div><h2>Akquise-Funnel</h2><p>Fortschritt im ausgewählten Marktgebiet</p></div><button onClick={() => setView("Sales Funnel")}>Alle Stufen →</button></div>
              <div className="funnel-chart">
                {[{label:"Gefunden",n:withinRadius.length},{label:"Qualifiziert",n:qualified},{label:"Kontaktiert",n:contacted},{label:"Interesse",n:interested},{label:"Zugesagt",n:confirmed}].map((x,i,arr) => <div key={x.label} className="funnel-row"><span>{x.label}</span><div><i style={{width:`${Math.max(8, (x.n / Math.max(1, arr[0].n))*100)}%`}} /></div><strong>{x.n}</strong>{i > 0 && <small>{Math.round((x.n/Math.max(1,arr[i-1].n))*100)}%</small>}</div>)}
              </div><div className="funnel-note"><span>↗</span><p><strong>Nächster Engpass: Erstkontakte</strong><br/>Für das Wochenziel fehlen noch {Math.max(0, 10-contacted)} qualifizierte Gespräche.</p></div>
            </article>
            <article className="panel map-panel"><div className="panel-head"><div><h2>Marktgebiet</h2><p>{withinRadius.length} erfasste Unternehmen · {radius} km</p></div><button onClick={() => setView("Unternehmen")}>Liste →</button></div><div className="map-visual"><div className="map-ring r1"/><div className="map-ring r2"/><div className="map-ring r3"/><span className="city nu">NÜRNBERG</span><span className="city fu">FÜRTH</span><span className="city er">ERLANGEN</span>{withinRadius.slice(0,8).map((c,i)=><button key={c.id} title={c.name} className={`map-dot d${i+1}`} onClick={()=>setSelected(c)} />)}<div className="map-legend"><span><i className="a"/>A-Priorität</span><span><i/>Weitere Leads</span></div></div></article>
          </div>
          <article className="panel recent"><div className="panel-head"><div><h2>Aktuelle Unternehmen</h2><p>Zuletzt bearbeitet und nächste Schritte</p></div><button onClick={()=>setView("Unternehmen")}>Alle Unternehmen →</button></div><CompanyTable companies={withinRadius.slice(0,5)} onSelect={setSelected}/></article>
        </>}

        {view === "Unternehmen" && <>
          <div className="page-head"><div><p className="eyebrow">MARKTDATENBANK</p><h1>Unternehmen</h1><p>{filtered.length} Unternehmen im Radius von {radius} km.</p></div><div className="head-actions"><button className="secondary" onClick={exportCsv}>↓ CSV exportieren</button><button className="primary" onClick={()=>setShowAdd(true)}>＋ Unternehmen hinzufügen</button></div></div>
          <div className="toolbar"><label className="search">⌕<input placeholder="Unternehmen, Ort oder Geschäftsführer suchen" value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={industry} onChange={e=>setIndustry(e.target.value)}>{industries.map(i=><option key={i}>{i}</option>)}</select><select value={radius} onChange={e=>setRadius(Number(e.target.value))}>{[10,20,30,40,50,60,70,80,90,100].map(r=><option key={r} value={r}>{r} km Umkreis</option>)}</select></div>
          <article className="panel full-table"><CompanyTable companies={filtered} onSelect={setSelected}/></article>
        </>}

        {view === "Sales Funnel" && <>
          <div className="page-head"><div><p className="eyebrow">AKQUISITION</p><h1>Sales Funnel</h1><p>Von der Marktchance bis zum Masterclass-Auftrag.</p></div><button className="secondary" onClick={exportCsv}>↓ Bericht exportieren</button></div>
          <div className="kanban">{stages.map(stage => { const cards=withinRadius.filter(c=>c.stage===stage); return <section key={stage}><header><span>{stageShort[stage]}</span><b>{cards.length}</b></header>{cards.map(c=><button className="kanban-card" key={c.id} onClick={()=>setSelected(c)}><span className={`prio p${c.priority}`}>{c.priority}</span><strong>{c.name}</strong><small>{c.city} · {c.industry}</small><div><i>{initials(c.owner)}</i><time>{c.nextDate ? fmtDate(c.nextDate) : "–"}</time></div></button>)}{cards.length===0&&<div className="empty-stage">Noch keine Leads</div>}</section>})}</div>
        </>}

        {view === "Aufgaben" && <>
          <div className="page-head"><div><p className="eyebrow">WIEDERVORLAGEN</p><h1>Aufgaben</h1><p>Die nächsten konkreten Schritte für Ivan.</p></div></div>
          <div className="task-layout"><article className="panel"><div className="panel-head"><div><h2>Offene Aufgaben</h2><p>Nach Fälligkeit priorisiert</p></div></div><div className="task-list">{companies.filter(c=>c.nextAction).sort((a,b)=>a.nextDate.localeCompare(b.nextDate)).map((c,i)=><button key={c.id} onClick={()=>setSelected(c)}><span className={i<2?"task-check urgent":"task-check"}>✓</span><div><strong>{c.nextAction}</strong><p>{c.name} · {c.city}</p></div><time>{fmtDate(c.nextDate)}</time><em>{c.priority}</em></button>)}</div></article><aside className="focus-card"><p>HEUTIGER FOKUS</p><strong>4</strong><span>fällige Kontakte</span><hr/><b>Empfehlung</b><p>Zuerst die beiden A-Leads mit bereits bekundetem Interesse nachfassen.</p><button onClick={()=>setView("Unternehmen")}>Kontakte öffnen →</button></aside></div>
        </>}

        {view === "Veranstaltungen" && <>
          <div className="page-head"><div><p className="eyebrow">REGIONALE EVENTS</p><h1>Veranstaltungen</h1><p>Einladungen, Zusagen, Teilnahme und Folgegeschäft.</p></div><button className="primary">＋ Veranstaltung planen</button></div>
          <div className="event-grid">{events.map(e=><article className="event-card" key={e.id}><div className="event-date"><strong>{new Date(e.date).getDate()}</strong><span>{new Intl.DateTimeFormat("de-DE",{month:"short"}).format(new Date(e.date)).toUpperCase()}</span></div><div className="event-body"><small>{new Date(e.date)<new Date()?"ABGESCHLOSSEN":"GEPLANT"}</small><h2>{e.title}</h2><p>⌖ {e.location}</p><p>◷ {new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(new Date(e.date))} Uhr</p><div className="event-progress"><div><span>Zusagen</span><b>{e.confirmed} / {e.capacity}</b></div><i><span style={{width:`${Math.round(e.confirmed/e.capacity*100)}%`}}/></i></div><div className="event-stats"><span><strong>{e.invited}</strong> Eingeladen</span><span><strong>{e.confirmed}</strong> Zugesagt</span><span><strong>{e.attended||"–"}</strong> Erschienen</span></div><button>Veranstaltung öffnen →</button></div></article>)}</div>
        </>}
      </section>
    </main>

    {selected && <div className="modal-backdrop" onMouseDown={()=>setSelected(null)}><aside className="drawer" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}>×</button><div className="company-hero"><span>{initials(selected.name)}</span><div><small>{selected.industry}</small><h2>{selected.name}</h2><p>⌖ {selected.address}</p></div></div><div className="detail-grid"><div><small>GESCHÄFTSFÜHRUNG</small><strong>{selected.manager}</strong></div><div><small>GRÖSSE</small><strong>{selected.employees} Mitarbeiter</strong></div><div><small>TELEFON</small><a href={`tel:${selected.phone}`}>{selected.phone}</a></div><div><small>E-MAIL</small><a href={`mailto:${selected.email}`}>{selected.email}</a></div></div><hr/><label className="field"><span>Funnel-Stufe</span><select value={selected.stage} onChange={e=>updateStage(selected,e.target.value)}>{stages.map(s=><option key={s}>{s}</option>)}</select></label><div className="next-box"><small>NÄCHSTER SCHRITT · {fmtDate(selected.nextDate)}</small><strong>{selected.nextAction}</strong><span>Zuständig: {selected.owner}</span></div><div className="notes"><small>NOTIZEN</small><p>{selected.notes||"Noch keine Notizen vorhanden."}</p></div><div className="source">Datenquelle: {selected.source} · Entfernung {selected.distance} km</div><button className="primary wide" onClick={()=>updateStage(selected, stages[Math.min(stages.length-1,stages.indexOf(selected.stage)+1)])}>Als nächsten Schritt markieren →</button></aside></div>}

    {showAdd && <div className="modal-backdrop" onMouseDown={()=>setShowAdd(false)}><form className="add-modal" onSubmit={addCompany} onMouseDown={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setShowAdd(false)}>×</button><p className="eyebrow">NEUER MARKTKONTAKT</p><h2>Unternehmen hinzufügen</h2><div className="form-grid"><label><span>Unternehmensname *</span><input name="name" required/></label><label><span>Branche *</span><input name="industry" required/></label><label><span>Ort *</span><input name="city" required/></label><label><span>Entfernung in km *</span><input name="distance" type="number" min="0" required/></label><label className="span2"><span>Adresse</span><input name="address"/></label><label><span>Geschäftsführung</span><input name="manager"/></label><label><span>Mitarbeiter</span><select name="employees"><option>10–19</option><option>20–49</option><option>50–99</option><option>100–249</option></select></label><label><span>Telefon</span><input name="phone" type="tel"/></label><label><span>E-Mail</span><input name="email" type="email"/></label><label className="span2"><span>Website</span><input name="website"/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={()=>setShowAdd(false)}>Abbrechen</button><button className="primary">Unternehmen anlegen</button></div></form></div>}
    {showResearch && <div className="modal-backdrop centered" onMouseDown={()=>setShowResearch(false)}><form className="research-modal" onSubmit={startResearch} onMouseDown={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setShowResearch(false)}>×</button><div className="research-title"><span>✦</span><div><p className="eyebrow">DEEP SEARCH · 10 NEUE KONTAKTE</p><h2>Neue Unternehmen recherchieren</h2><p>Definieren Sie die Zielgruppe. Gefundene Unternehmen werden geprüft, gegen Dubletten abgeglichen und als „Neu gefunden“ gespeichert.</p></div></div><div className="form-grid"><label><span>Branche *</span><input name="industry" placeholder="z. B. Maschinenbau" required/></label><label><span>Umkreis ab Nürnberg *</span><select name="radius" defaultValue={radius}>{[10,20,30,40,50,60,70,80,90,100].map(r=><option key={r} value={r}>{r} km</option>)}</select></label><label><span>Unternehmensgröße *</span><select name="employees"><option>10–19 Mitarbeiter</option><option>20–49 Mitarbeiter</option><option>50–99 Mitarbeiter</option><option>100–249 Mitarbeiter</option><option>10–249 Mitarbeiter</option></select></label><label><span>Rechtsform / Firmierung</span><select name="legalForm"><option>Alle Rechtsformen</option><option>GmbH</option><option>GmbH & Co. KG</option><option>KG</option><option>AG</option><option>e.K.</option></select></label><label className="span2"><span>Regionaler Schwerpunkt</span><input name="region" defaultValue="Nürnberg, Fürth und Erlangen"/></label></div><div className="research-info"><strong>Was die Recherche übernimmt</strong><span>10 neue, möglichst vollständige Datensätze · Firmenname · Anschrift · Branche · Größe · Website · Telefon · Geschäftsführung · Quellenangabe</span></div>{lastResearch && <p className="last-research">Letzter Auftrag: {lastResearch.industry}, {lastResearch.radius} km · Status: {lastResearch.status}</p>}<div className="form-actions"><button type="button" className="secondary" onClick={()=>setShowResearch(false)}>Abbrechen</button><button className="primary" disabled={researching}>{researching ? "Recherche wird angelegt …" : "✦ Tiefensuche starten"}</button></div></form></div>}
    {notice && <div className="toast">✓ {notice}</div>}
  </div>
}

function CompanyTable({companies,onSelect}:{companies:Company[],onSelect:(c:Company)=>void}) {
  return <div className="table-wrap"><table><thead><tr><th>Unternehmen</th><th>Branche</th><th>Kontakt</th><th>Status</th><th>Nächster Schritt</th><th></th></tr></thead><tbody>{companies.map(c=><tr key={c.id} onClick={()=>onSelect(c)}><td><div className="company-cell"><span>{initials(c.name)}</span><div><strong>{c.name}</strong><small>{c.city} · {c.distance} km</small></div></div></td><td>{c.industry}<small className="block">{c.employees} MA</small></td><td><strong className="normal">{c.manager}</strong><small className="block">{c.phone}</small></td><td><span className={`status s${stages.indexOf(c.stage)}`}>{stageShort[c.stage]}</span></td><td><strong className="normal">{c.nextAction}</strong><small className="block">{fmtDate(c.nextDate)} · {c.owner}</small></td><td>→</td></tr>)}</tbody></table>{companies.length===0&&<div className="empty-table">Keine Unternehmen für diese Auswahl gefunden.</div>}</div>
}
