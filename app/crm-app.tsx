"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ACTIVE_STAGES, ACTIVITY_KINDS, RESULT_OPTIONS, STAGES, TASK_AFTER_DAYS,
  daysSince, followUpDue, isTask, lastTouch, nextActionFor, sortTasks, stageIndex, taskPriority
} from "../lib/crm-stages";
import { DEFAULT_ORIGIN_CITY, GERMAN_CITIES, isValidOriginCity } from "../lib/german-cities";
import { OUTREACH_TEMPLATES } from "../lib/outreach-html";
import { isPostalCandidate, postalLabel, POSTAL_STATUS } from "../lib/postal";

type Company = {
  id: number; name: string; city: string; address: string; distance: number;
  industry: string; employees: string; phone: string; email: string; website: string;
  manager: string; salutation: string; stage: string; priority: string; owner: string; nextAction: string;
  nextDate: string; source: string; notes: string;
  notionPageId?: string | null; notionSyncedAt?: string | null; notionSyncError?: string | null;
  outreachStep: number; lastOutreachAt: string | null; awaitingReply: number;
  originCity: string; stageChangedAt: string | null; lastActivityAt: string | null; lastResult: string; registeredAt?: string | null;
  postalStatus?: string; postalMarkedAt?: string | null; postalSentAt?: string | null;
  createdAt?: string; updatedAt?: string;
};

type EventItem = {
  id: number; title: string; location: string; address: string; startAt: string; endAt: string;
  capacity: number; status: string; notes: string;
  invited: number; confirmed: number; registered?: number; signupCount?: number; attended: number; offers: number; orders: number;
  notionSyncedAt?: string | null;
};

const EVENT_STATUS_OPTIONS = ["Planung", "Einladung", "Anmeldungsphase", "Durchgeführt", "Nachbearbeitung", "Abgeschlossen", "Abgesagt"];

type MasterclassSession = {
  id: number; cohort: string; date: string; dayOfWeek: string; startTime: string; endTime: string;
  group: string; sessionType: string; moduleNumber: number; term: string; chapterNumber: number | null;
  topic: string; channel: string;
};
type ResearchJob = { id: number; industry: string; radius: number; employees: string; legalForm: string; region: string; status: string };
type SessionUser = { name: string; email: string };
type HistoryItem = { id: string; at: string; kind: string; result: string; text: string; by: string };
type ConfirmationDraft = { subject: string; body: string };
type Signup = { id: number; name: string; company: string; email: string; persons: number; message: string; companyId: number | null; mailStatus: string; createdAt: string };
type TimelineItem = { key: string; date: string; time: string; label: string; detail: string; kind: "webinar" | "workshop" | "event" | "followup"; companyId?: number };

const ORIGIN_CITY_STORAGE_KEY = "ki-crm-origin-city";
const ALL_CITIES = "Alle Städte";
const NAV = [
  { key: "Übersicht", icon: "⌂" }, { key: "Unternehmen", icon: "▦" }, { key: "Sales Funnel", icon: "▽" },
  { key: "Aufgaben", icon: "✓" }, { key: "Veranstaltungen", icon: "◇" }, { key: "Terminmanagement", icon: "◷" }
];
const RESULT_LABEL: Record<string, string> = { positiv: "Positiv", unsicher: "Unsicher", sonstiges: "Sonstiges" };
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase(); }
function fmtDate(value: string | number | Date | null | undefined) {
  if (!value) return "–";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "–" : new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
function fmtDateTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}
function stageClass(stage: string) { return `stage-pill st${Math.max(0, stageIndex(stage))}`; }
function greeting() { const h = new Date().getHours(); return h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend"; }
function ymKey(date: string) { return date.slice(0, 7); }

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Nicht angemeldet");
  }
  return response;
}
const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function CrmApp({ user }: { user: SessionUser }) {
  const [view, setView] = useState("Übersicht");
  const [radius, setRadius] = useState(50);
  const [originCity, setOriginCity] = useState<string>(DEFAULT_ORIGIN_CITY);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showEventForm, setShowEventForm] = useState<EventItem | "new" | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [masterclassSessions, setMasterclassSessions] = useState<MasterclassSession[]>([]);
  const [importingSessions, setImportingSessions] = useState(false);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("Alle Branchen");
  const [stageFilter, setStageFilter] = useState("Alle Stufen");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [researching, setResearching] = useState(false);
  const [lastResearch, setLastResearch] = useState<ResearchJob | null>(null);
  const [notionSyncing, setNotionSyncing] = useState(false);
  const [notionConfigured, setNotionConfigured] = useState(false);
  const [notionPending, setNotionPending] = useState(0);
  const [notionErrors, setNotionErrors] = useState<{ id: number; name: string; error: string | null }[]>([]);
  const [notionLastMessage, setNotionLastMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [confirmSend, setConfirmSend] = useState<{ companyId: number; step: number } | null>(null);
  const [sendingStep, setSendingStep] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ step: number; companyId?: number } | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [activityKind, setActivityKind] = useState<string>("Anruf");
  const [activityResult, setActivityResult] = useState<string>("");
  const [activityNote, setActivityNote] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDraft | null>(null);
  const [confirmationBusy, setConfirmationBusy] = useState(false);
  const [zusageFor, setZusageFor] = useState<Company | null>(null);
  const [zusageWithMail, setZusageWithMail] = useState(true);
  const [zusageBusy, setZusageBusy] = useState(false);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [showPostal, setShowPostal] = useState(false);
  const [postalBusy, setPostalBusy] = useState(false);
  const [confirmPostalSent, setConfirmPostalSent] = useState(false);

  const firstName = user.name.split(" ")[0];
  const selected = companies.find(c => c.id === selectedId) ?? null;

  function flash(message: string, ms = 3200) { setNotice(message); setTimeout(() => setNotice(""), ms); }
  function patchLocal(company: Company) { setCompanies(old => old.map(c => c.id === company.id ? { ...c, ...company } : c)); }
  function refreshSyncStatus() {
    api("/api/sync/notion").then(r => r.ok ? r.json() : Promise.reject()).then(d => {
      setNotionConfigured(Boolean(d.configured)); setNotionPending(Number(d.pending || 0));
      setNotionErrors(Array.isArray(d.errors) ? d.errors : []); setNotionLastMessage(d.lastRun?.message ?? "");
    }).catch(() => {});
  }
  function syncOne(companyId: number) {
    if (notionConfigured) api("/api/sync/notion", json({ companyId })).then(() => refreshSyncStatus()).catch(() => {});
  }

  useEffect(() => {
    api("/api/companies").then(r => r.ok ? r.json() : Promise.reject()).then(d => setCompanies(Array.isArray(d.companies) ? d.companies : [])).catch(() => setCompanies([]));
    refreshSyncStatus();
    api("/api/events").then(r => r.ok ? r.json() : Promise.reject()).then(d => setEvents(Array.isArray(d.events) ? d.events : [])).catch(() => setEvents([]));
    api("/api/masterclass-sessions").then(r => r.ok ? r.json() : Promise.reject()).then(d => setMasterclassSessions(Array.isArray(d.sessions) ? d.sessions : [])).catch(() => setMasterclassSessions([]));
    api("/api/signups").then(r => r.ok ? r.json() : Promise.reject()).then(d => setSignups(Array.isArray(d.signups) ? d.signups : [])).catch(() => setSignups([]));
    try {
      const stored = window.localStorage.getItem(ORIGIN_CITY_STORAGE_KEY);
      if (stored && (stored === ALL_CITIES || isValidOriginCity(stored))) setOriginCity(stored);
    } catch { /* Speicher nicht verfügbar */ }
  }, []);

  useEffect(() => { try { window.localStorage.setItem(ORIGIN_CITY_STORAGE_KEY, originCity); } catch { /* egal */ } }, [originCity]);

  function loadHistory(companyId: number) {
    api(`/api/companies/${companyId}/activities`).then(r => r.ok ? r.json() : Promise.reject()).then(d => setHistory(Array.isArray(d.items) ? d.items : [])).catch(() => setHistory([]));
  }

  useEffect(() => {
    setNotesDraft(null); setActivityNote(""); setActivityResult(""); setConfirmation(null); setConfirmSend(null);
    if (selectedId) loadHistory(selectedId); else setHistory([]);
  }, [selectedId]);

  // ---------- Ableitungen ----------
  const inCity = useMemo(() => companies.filter(c => originCity === ALL_CITIES || (c.originCity || DEFAULT_ORIGIN_CITY) === originCity), [companies, originCity]);
  const withinRadius = useMemo(() => inCity.filter(c => c.distance <= radius), [inCity, radius]);
  const industries = useMemo(() => ["Alle Branchen", ...Array.from(new Set(companies.map(c => c.industry)))], [companies]);
  const filtered = withinRadius.filter(c =>
    (industry === "Alle Branchen" || c.industry === industry) &&
    (stageFilter === "Alle Stufen" || c.stage === stageFilter) &&
    `${c.name} ${c.city} ${c.manager}`.toLowerCase().includes(query.toLowerCase()));
  const countBy = (stage: string) => withinRadius.filter(c => c.stage === stage).length;
  const inProgress = withinRadius.filter(c => ["1. Kontakt", "2. Kontakt", "3. Kontakt"].includes(c.stage)).length;
  const confirmedCount = countBy("Zugesagt");
  const registeredCount = signups.length;
  const lostCount = countBy("Verloren");
  const tasks = useMemo(() => sortTasks(inCity.filter(c => isTask(c))), [inCity]);
  const postalOpen = useMemo(() => withinRadius.filter(c => c.postalStatus !== POSTAL_STATUS.sent && (isPostalCandidate(c) || c.postalStatus === POSTAL_STATUS.marked)), [withinRadius]);
  const postalMarked = postalOpen.filter(c => c.postalStatus === POSTAL_STATUS.marked);
  const postalSentCount = withinRadius.filter(c => c.postalStatus === POSTAL_STATUS.sent).length;
  const cityLabel = originCity === ALL_CITIES ? "alle Städte" : originCity;
  const mapCity = (originCity === ALL_CITIES ? DEFAULT_ORIGIN_CITY : originCity).toUpperCase();

  const timeline = useMemo<TimelineItem[]>(() => {
    const sessionItems: TimelineItem[] = masterclassSessions.map(s => ({
      key: `session-${s.id}`, date: s.date, time: s.startTime,
      label: `${s.sessionType === "Workshop" ? "Workshop" : "Webinar"} · Modul ${s.moduleNumber}${s.term ? ` (${s.term})` : ""}`,
      detail: [s.topic, s.group, s.startTime && s.endTime ? `${s.startTime}–${s.endTime}` : "", s.channel].filter(Boolean).join(" · "),
      kind: s.sessionType === "Workshop" ? "workshop" : "webinar"
    }));
    const eventItems: TimelineItem[] = events.map(e => ({
      key: `event-${e.id}`, date: e.startAt.slice(0, 10), time: e.startAt.slice(11, 16), label: e.title,
      detail: [e.location, e.status].filter(Boolean).join(" · "), kind: "event"
    }));
    const followUps: TimelineItem[] = companies.filter(c => ACTIVE_STAGES.includes(c.stage)).map(c => ({
      key: `follow-${c.id}`, date: followUpDue(c).toISOString().slice(0, 10), time: "", label: `Wiedervorlage: ${c.name}`,
      detail: `${c.stage} · ${nextActionFor(c.stage, c.outreachStep).label}`, kind: "followup", companyId: c.id
    }));
    return [...sessionItems, ...eventItems, ...followUps].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [masterclassSessions, events, companies]);

  const monthTiles = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const keys = new Set<string>();
    for (let i = 0; i < 9; i++) { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); keys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
    timeline.forEach(t => { if (t.kind !== "followup" && t.date >= `${now.getFullYear()}-01`) keys.add(ymKey(t.date)); });
    return [...keys].sort().map(key => {
      // überfällige Wiedervorlagen erscheinen im laufenden Monat
      const items = timeline.filter(t => ymKey(t.date) === key || (t.kind === "followup" && key === currentKey && ymKey(t.date) < key));
      return {
        key, label: `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`, items, past: key < currentKey,
        webinars: items.filter(t => t.kind === "webinar").length, workshops: items.filter(t => t.kind === "workshop").length,
        events: items.filter(t => t.kind === "event").length, followups: items.filter(t => t.kind === "followup").length
      };
    });
  }, [timeline]);

  // ---------- Aktionen ----------
  function requestStage(company: Company, stage: string) {
    if (stage === company.stage) return;
    if (stage === "Zugesagt") { setZusageWithMail(Boolean(company.email) && !company.registeredAt); setZusageFor(company); return; }
    updateStage(company, stage);
  }

  async function confirmZusage() {
    if (!zusageFor) return;
    const company = zusageFor;
    setZusageBusy(true);
    try {
      await updateStage(company, "Zugesagt");
      if (zusageWithMail) await sendEmail(company, 4);
    } finally { setZusageBusy(false); setZusageFor(null); }
  }

  async function updateStage(company: Company, stage: string) {
    if (stage === company.stage) return;
    patchLocal({ ...company, stage, stageChangedAt: new Date().toISOString() });
    try {
      const r = await api(`/api/companies/${company.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
      const d = await r.json() as { company?: Company; error?: string };
      if (!r.ok || !d.company) throw new Error(d.error || "Status konnte nicht gespeichert werden");
      patchLocal(d.company);
      if (selectedId === company.id) loadHistory(company.id);
      syncOne(company.id);
      flash(`${company.name}: Status „${stage}“`);
    } catch (error) { patchLocal(company); flash(error instanceof Error ? error.message : "Status konnte nicht gespeichert werden"); }
  }

  async function patchCompany(company: Company, patch: Partial<Pick<Company, "salutation" | "notes" | "originCity">>, message: string) {
    patchLocal({ ...company, ...patch });
    try {
      const r = await api(`/api/companies/${company.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const d = await r.json() as { company?: Company };
      if (r.ok && d.company) { patchLocal(d.company); syncOne(company.id); flash(message, 2200); }
    } catch { flash("Speichern fehlgeschlagen"); }
  }

  async function sendEmail(company: Company, step: number) {
    setConfirmSend(null); setSendingStep(step);
    try {
      const r = await api("/api/outreach/send", json({ companyId: company.id, step }));
      const d = await r.json() as { sentTo?: string; testMode?: boolean; message?: string; company?: Company };
      if (!r.ok) throw new Error(d.message || "Versand fehlgeschlagen");
      if (d.company) patchLocal(d.company);
      if (selectedId === company.id) loadHistory(company.id);
      syncOne(company.id);
      flash(`${step === 4 ? "Zusage-E-Mail" : `E-Mail ${step}`} gesendet an ${d.sentTo}${d.testMode ? " (Testmodus)" : ""}`, 4500);
    } catch (error) { flash(error instanceof Error ? error.message : "Versand fehlgeschlagen", 5000); }
    finally { setSendingStep(null); }
  }

  async function postalAction(action: "mark" | "unmark" | "sent", ids: number[], message?: string) {
    if (!ids.length) return;
    setPostalBusy(true);
    try {
      const r = await api("/api/postal", json({ action, companyIds: ids }));
      const d = await r.json() as { companies?: Company[]; message?: string };
      if (!r.ok) throw new Error(d.message || "Speichern fehlgeschlagen");
      (d.companies ?? []).forEach(patchLocal);
      if (action === "sent") { (d.companies ?? []).forEach(c => syncOne(c.id)); if (selectedId) loadHistory(selectedId); }
      if (message) flash(message, 4500);
    } catch (error) { flash(error instanceof Error ? error.message : "Speichern fehlgeschlagen", 5000); }
    finally { setPostalBusy(false); setConfirmPostalSent(false); }
  }

  function printLetters(ids: number[]) { window.open(`/postversand/druck?ids=${ids.join(",")}`, "_blank"); }

  async function saveActivity(company: Company, e?: FormEvent) {
    e?.preventDefault();
    if (!activityNote.trim() && !activityResult) { flash("Bitte Ergebnis wählen oder eine Notiz schreiben"); return; }
    setSavingActivity(true);
    try {
      const r = await api(`/api/companies/${company.id}/activities`, json({ kind: activityKind, result: activityResult, note: activityNote }));
      const d = await r.json() as { company?: Company; message?: string };
      if (!r.ok) throw new Error(d.message || "Speichern fehlgeschlagen");
      if (d.company) patchLocal(d.company);
      setActivityNote(""); setActivityResult("");
      loadHistory(company.id); syncOne(company.id);
      flash("Aktivität eingetragen");
    } catch (error) { flash(error instanceof Error ? error.message : "Speichern fehlgeschlagen"); }
    finally { setSavingActivity(false); }
  }

  async function loadConfirmation(company: Company) {
    setConfirmationBusy(true);
    try {
      const r = await api("/api/outreach/confirmation", json({ companyId: company.id }));
      const d = await r.json() as ConfirmationDraft & { message?: string };
      if (!r.ok) throw new Error(d.message || "Entwurf konnte nicht geladen werden");
      setConfirmation({ subject: d.subject, body: d.body });
    } catch (error) { flash(error instanceof Error ? error.message : "Entwurf konnte nicht geladen werden"); }
    finally { setConfirmationBusy(false); }
  }

  async function sendConfirmation(company: Company) {
    if (!confirmation) return;
    setConfirmationBusy(true);
    try {
      const r = await api("/api/outreach/confirmation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: company.id, ...confirmation }) });
      const d = await r.json() as { sentTo?: string; message?: string };
      if (!r.ok) throw new Error(d.message || "Versand fehlgeschlagen");
      setConfirmation(null); loadHistory(company.id);
      flash(`Bestätigung gesendet an ${d.sentTo}`, 4500);
    } catch (error) { flash(error instanceof Error ? error.message : "Versand fehlgeschlagen"); }
    finally { setConfirmationBusy(false); }
  }

  async function addCompany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = Object.fromEntries(["name", "city", "address", "distance", "industry", "employees", "phone", "email", "website", "manager", "salutation", "originCity"].map(k => [k, String(data.get(k) ?? "")]));
    try {
      const r = await api("/api/companies", json({ ...payload, distance: Number(payload.distance), owner: firstName }));
      const d = await r.json() as { company?: Company; error?: string };
      if (!r.ok || !d.company) throw new Error(d.error || "Speichern fehlgeschlagen");
      const created = d.company;
      setCompanies(old => [created, ...old]); setShowAdd(false);
      syncOne(created.id);
      flash("Unternehmen wurde angelegt");
    } catch (error) { flash(error instanceof Error ? error.message : "Speichern fehlgeschlagen"); }
  }

  async function syncNotion() {
    setNotionSyncing(true);
    let total = 0; let lastMessage = ""; let failedTotal = 0;
    try {
      // in Paketen übertragen, bis nichts mehr offen ist (max. 20 Durchläufe)
      for (let round = 0; round < 20; round++) {
        const response = await api("/api/sync/notion", json({}));
        const result = await response.json() as { message?: string; configured?: boolean; succeeded?: number; failed?: number; pending?: number };
        setNotionConfigured(Boolean(result.configured));
        if (!response.ok) throw new Error(result.message || "Notion-Synchronisation fehlgeschlagen");
        total += Number(result.succeeded || 0); failedTotal += Number(result.failed || 0);
        lastMessage = result.message || "";
        setNotice(`Notion: ${total} übertragen …`);
        if (!result.pending || (!result.succeeded && !result.failed)) break;
      }
      flash(failedTotal ? `Notion: ${total} übertragen, ${failedTotal} mit Fehlern. ${lastMessage}` : `Notion: ${total} Unternehmen übertragen – alles synchron.`, 7000);
    } catch (error) { flash(error instanceof Error ? error.message : "Notion-Synchronisation fehlgeschlagen", 7000); }
    finally { setNotionSyncing(false); refreshSyncStatus(); }
  }

  async function startResearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResearching(true);
    const data = new FormData(e.currentTarget);
    const criteria = {
      industry: String(data.get("industry")), radius: Number(data.get("radius")),
      employees: String(data.get("employees")), legalForm: String(data.get("legalForm")),
      region: String(data.get("region")), originCity: String(data.get("originCity")), limit: 10
    };
    try {
      const response = await api("/api/research", json(criteria));
      const result = await response.json() as { job?: ResearchJob; companies?: Company[]; message?: string };
      if (!response.ok) throw new Error(result.message || "Recherche konnte nicht gestartet werden");
      const serverMessage = result.message;
      const found = result.companies ?? [];
      if (found.length) setCompanies(old => [...found, ...old]);
      if (result.job) setLastResearch(result.job);
      if (isValidOriginCity(criteria.originCity)) setOriginCity(criteria.originCity);
      setShowResearch(false);
      flash(serverMessage || (found.length ? `${found.length} neue Unternehmen wurden gespeichert` : "Keine neuen Unternehmen gefunden"), 6000);
    } catch (error) { flash(error instanceof Error ? error.message : "Recherche konnte nicht gestartet werden", 5000); }
    finally { setResearching(false); }
  }

  async function saveEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!showEventForm) return;
    setSavingEvent(true);
    const data = new FormData(e.currentTarget);
    const payload = {
      title: String(data.get("title")), location: String(data.get("location")), address: String(data.get("address")),
      startAt: String(data.get("startAt")), endAt: String(data.get("endAt")), capacity: Number(data.get("capacity")),
      status: String(data.get("status")), notes: String(data.get("notes"))
    };
    try {
      const old = showEventForm === "new" ? null : showEventForm;
      const response = old
        ? await api(`/api/events/${old.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await api("/api/events", json(payload));
      const result = await response.json() as { event?: EventItem; error?: string };
      if (!response.ok || !result.event) throw new Error(result.error || "Speichern fehlgeschlagen");
      const stats = old ? { invited: old.invited, confirmed: old.confirmed, attended: old.attended, offers: old.offers, orders: old.orders } : { invited: 0, confirmed: 0, attended: 0, offers: 0, orders: 0 };
      const saved = { ...result.event, ...stats };
      setEvents(list => old ? list.map(ev => ev.id === saved.id ? saved : ev) : [saved, ...list]);
      setShowEventForm(null);
      flash(old ? "Veranstaltung wurde aktualisiert" : "Veranstaltung wurde angelegt");
    } catch (error) { flash(error instanceof Error ? error.message : "Speichern fehlgeschlagen"); }
    finally { setSavingEvent(false); }
  }

  async function importSessionsFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportingSessions(true);
    try {
      const text = await file.text();
      const response = await api("/api/masterclass-sessions/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: text });
      const result = await response.json() as { cohort?: string; imported?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "Import fehlgeschlagen");
      const refreshed = await api("/api/masterclass-sessions").then(r => r.json());
      setMasterclassSessions(Array.isArray(refreshed.sessions) ? refreshed.sessions : []);
      flash(`${result.imported ?? 0} Termine für Kohorte „${result.cohort}“ importiert`);
    } catch (error) { flash(error instanceof Error ? error.message : "Import fehlgeschlagen"); }
    finally { setImportingSessions(false); }
  }

  function exportCsv() {
    const rows = [["Unternehmen", "Ort", "Branche", "Ansprechpartner", "Telefon", "E-Mail", "Entfernung", "Status", "Ausgangsstadt", "Adresse", "Postversand"], ...filtered.map(c => [c.name, c.city, c.industry, c.manager, c.phone, c.email, String(c.distance), c.stage, c.originCity, c.address, postalLabel(c)])];
    const blob = new Blob(["﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `KI-Masterclass-Leads-${cityLabel}-${radius}km.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  function openCompany(c: Company) { setSelectedId(c.id); }

  // ---------- Bausteine ----------
  const citySelect = (className: string) => (
    <label className={className}>
      <span>Ausgangsstadt</span>
      <select value={originCity} onChange={e => setOriginCity(e.target.value)}>
        <option value={ALL_CITIES}>{ALL_CITIES}</option>
        {GERMAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </label>
  );

  const emailButton = (company: Company, step: number, compact = false) => {
    const pending = confirmSend !== null && confirmSend.companyId === company.id && confirmSend.step === step;
    if (!company.email) return <span className="muted-note">Keine E-Mail-Adresse hinterlegt</span>;
    if (pending) return <span className="confirm-inline"><span>An {company.email} senden?</span><button className="primary" disabled={sendingStep !== null} onClick={() => sendEmail(company, step)}>{sendingStep === step ? "Sendet …" : "Ja, senden"}</button><button className="secondary" onClick={() => setConfirmSend(null)}>Abbrechen</button></span>;
    return <button className="primary" disabled={sendingStep !== null} onClick={() => setConfirmSend({ companyId: company.id, step })}>✉ {compact ? `E-Mail ${step}` : `E-Mail ${step} senden`}</button>;
  };

  return <div className="app-shell v2">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">KI</span><div><strong>MASTERCLASS</strong><small>REGION {originCity === ALL_CITIES ? "DEUTSCHLAND" : originCity.toUpperCase()}</small></div></div>
      {citySelect("city-switch")}
      <nav aria-label="Hauptnavigation">
        {NAV.map(item => <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => { setView(item.key); setOpenMonth(null); }}><span>{item.icon}</span>{item.key}{item.key === "Aufgaben" && tasks.length > 0 && <em>{tasks.length}</em>}</button>)}
      </nav>
      <div className="sidebar-foot"><div className={notionConfigured ? (notionErrors.length ? "sync-dot error" : "sync-dot") : "sync-dot waiting"} /><div><strong>{notionConfigured ? "Notion verbunden" : "Notion nicht verbunden"}</strong><small>{notionConfigured ? (notionErrors.length ? `${notionErrors.length} Fehler · ${notionPending} offen` : `${notionPending} Änderungen offen`) : "NOTION_TOKEN fehlt"}</small></div></div>
      <div className="user"><span>{initials(user.name)}</span><div><strong>{user.name}</strong><small><a href="/change-password" className="user-link">Passwort ändern</a></small></div><form className="logout-form" method="POST" action="/api/auth/logout"><button type="submit" title="Abmelden">⏻</button></form></div>
    </aside>

    <main>
      <header className="topbar"><div><span className="live-dot" /> Ausgangsstadt {cityLabel} · Speed-Dating KI-Mittelstand am 11.11.2026</div><div className="top-actions"><button className="notion-sync" onClick={syncNotion} disabled={notionSyncing}>{notionSyncing ? "Notion wird aktualisiert …" : "↻ Mit Notion synchronisieren"}</button><span className="avatar">{initials(user.name)}</span></div></header>

      <section className="content">
        {notionErrors.length > 0 && view === "Übersicht" && <div className="sync-alert"><strong>Notion-Synchronisation: {notionErrors.length} Datensätze mit Fehler.</strong> {notionErrors[0].name}: {notionErrors[0].error}{notionLastMessage && <small>Letzter Lauf: {notionLastMessage}</small>}</div>}

        {view === "Übersicht" && <>
          <div className="page-head"><div><p className="eyebrow">MARKTPOTENZIAL & AKQUISITION</p><h1>{greeting()}, {firstName}.</h1><p>Marktgebiet, Akquise-Funnel und Fortschritt für {cityLabel}.</p></div><div className="head-actions"><button className="research-button" onClick={() => setShowResearch(true)}>✦ Neue Kunden suchen</button><button className="primary" onClick={() => setShowAdd(true)}>＋ Unternehmen hinzufügen</button></div></div>
          <div className="radius-card">
            {citySelect("city-inline")}
            <div className="radius-text"><strong>Marktgebiet</strong><p>Ausgangspunkt {cityLabel} · <b>{radius} km Umkreis</b></p></div>
            <div className="range-wrap"><span>10</span><input aria-label="Marktradius" type="range" min="10" max="100" step="10" value={radius} onChange={e => setRadius(Number(e.target.value))}/><span>100 km</span></div>
          </div>
          <div className="kpis">
            <article><span className="kpi-icon blue">◎</span><div><small>MARKTPOTENZIAL</small><strong>{withinRadius.length * 137}</strong><p>geschätzte KMU im Gebiet</p><button className="kpi-link" onClick={() => setShowResearch(true)}>✦ 10 neue finden</button></div></article>
            <article><span className="kpi-icon green">▣</span><div><small>IN DATENBANK</small><strong>{withinRadius.length}</strong><p>{countBy("Neu")} davon neu</p></div></article>
            <article><span className="kpi-icon amber">◫</span><div><small>IN BEARBEITUNG</small><strong>{inProgress}</strong><p>1. bis 3. Kontakt</p></div></article>
            <article><span className="kpi-icon violet">◆</span><div><small>ZUSAGEN</small><strong>{confirmedCount}</strong><p>{registeredCount} verbindlich angemeldet · {lostCount} verloren</p></div></article>
          </div>
          <div className="overview-grid">
            <article className="panel funnel-panel"><div className="panel-head"><div><h2>Akquise-Funnel</h2><p>Unternehmen je Stufe im Marktgebiet – Zeile anklicken für die Liste</p></div><button onClick={() => setView("Sales Funnel")}>Zum Sales Funnel →</button></div>
              <div className="funnel-chart">
                {STAGES.map(stage => { const n = countBy(stage); return <button key={stage} className="funnel-row" onClick={() => { setStageFilter(stage); setView("Unternehmen"); }}><span>{stage}</span><div><i className={stage === "Verloren" ? "lost" : stage === "Zugesagt" ? "won" : ""} style={{ width: `${Math.max(3, (n / Math.max(1, withinRadius.length)) * 100)}%` }} /></div><strong>{n}</strong></button>; })}
              </div>
              <div className="funnel-note"><span>✓</span><p><strong>{tasks.length} offene Aufgaben</strong><br/>Kontakte, die seit {TASK_AFTER_DAYS} Tagen nicht weitergeführt wurden, und positive Rückmeldungen. <button className="text-link" onClick={() => setView("Aufgaben")}>Jetzt abarbeiten →</button></p></div>
            </article>
            <article className="panel map-panel"><div className="panel-head"><div><h2>Marktgebiet</h2><p>{withinRadius.length} erfasste Unternehmen · {radius} km</p></div><button onClick={() => setView("Unternehmen")}>Liste →</button></div><div className="map-visual"><div className="map-ring r1"/><div className="map-ring r2"/><div className="map-ring r3"/><span className="city nu">{mapCity}</span>{withinRadius.slice(0, 8).map((c, i) => <button key={c.id} title={c.name} aria-label={c.name} className={`map-dot d${i + 1}${c.lastResult === "positiv" ? " hot" : ""}`} onClick={() => openCompany(c)} />)}<div className="map-legend"><span><i className="a"/>Positive Rückmeldung</span><span><i/>Weitere Unternehmen</span></div></div></article>
          </div>
        </>}

        {view === "Unternehmen" && <>
          <div className="page-head"><div><p className="eyebrow">MARKTDATENBANK · {cityLabel.toUpperCase()}</p><h1>Unternehmen</h1><p>{filtered.length} Unternehmen im Radius von {radius} km.</p></div><div className="head-actions"><button className="secondary postal-btn" onClick={() => setShowPostal(true)}>✉ Postalische Aussendung{postalOpen.length > 0 && <em>{postalOpen.length}</em>}</button><button className="secondary" onClick={exportCsv}>↓ CSV exportieren</button><button className="primary" onClick={() => setShowAdd(true)}>＋ Unternehmen hinzufügen</button></div></div>
          <div className="toolbar"><label className="search">⌕<input placeholder="Unternehmen, Ort oder Ansprechpartner suchen" value={query} onChange={e => setQuery(e.target.value)}/></label><select value={stageFilter} onChange={e => setStageFilter(e.target.value)}><option>Alle Stufen</option>{STAGES.map(s => <option key={s}>{s}</option>)}</select><select value={industry} onChange={e => setIndustry(e.target.value)}>{industries.map(i => <option key={i}>{i}</option>)}</select><select value={radius} onChange={e => setRadius(Number(e.target.value))}>{[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(r => <option key={r} value={r}>{r} km Umkreis</option>)}</select></div>
          <article className="panel full-table"><CompanyTable companies={filtered} onSelect={openCompany}/></article>
        </>}

        {view === "Sales Funnel" && <>
          <div className="page-head"><div><p className="eyebrow">AKQUISITION · {cityLabel.toUpperCase()}</p><h1>Sales Funnel</h1><p>Neu → 1. bis 3. Kontakt → Zugesagt oder Verloren. Von jeder Kontaktstufe ist „Zugesagt“ möglich.</p></div><button className="secondary" onClick={exportCsv}>↓ Bericht exportieren</button></div>
          <div className="kanban">{STAGES.map(stage => { const cards = withinRadius.filter(c => c.stage === stage); return <section key={stage} className={stage === "Zugesagt" ? "won" : stage === "Verloren" ? "lost" : ""}><header><span>{stage}</span><b>{cards.length}</b></header>{cards.map(c => <button className="kanban-card" key={c.id} onClick={() => openCompany(c)}>{c.lastResult && <span className={`result-chip r-${c.lastResult}`}>{RESULT_LABEL[c.lastResult]}</span>}<strong>{c.name}</strong><small>{c.city} · {c.industry}</small><time>seit {daysSince(lastTouch(c))} Tagen</time></button>)}{cards.length === 0 && <div className="empty-stage">Keine Unternehmen</div>}</section>; })}</div>
        </>}

        {view === "Aufgaben" && <>
          <div className="page-head"><div><p className="eyebrow">SYSTEMATISCH ABARBEITEN</p><h1>Aufgaben</h1><p>Alle Kontakte, die seit mehr als {TASK_AFTER_DAYS} Tagen in ihrer Stufe stehen – positive Rückmeldungen stehen immer ganz oben.</p></div></div>
          <div className="task-layout">
            <article className="panel">
              <div className="panel-head"><div><h2>Offene Aufgaben ({tasks.length})</h2><p>Priorität A: Abschluss möglich · B: unsicher oder letzter Kontakt · C: weitere</p></div></div>
              {tasks.length === 0 && <div className="empty-table">Alles erledigt – kein Kontakt wartet länger als {TASK_AFTER_DAYS} Tage.</div>}
              <div className="task-rows">{tasks.map(c => { const action = nextActionFor(c.stage, c.outreachStep); const prio = taskPriority(c); return <div className="task-row" key={c.id}>
                <span className={`prio-badge p${prio}`}>{prio}</span>
                <button className="task-company" onClick={() => openCompany(c)}><strong>{c.name}</strong><small>{c.manager || "Ansprechpartner unbekannt"}{c.phone ? ` · ${c.phone}` : ""}</small></button>
                <div className="task-state"><span className={stageClass(c.stage)}>{c.stage}</span>{c.lastResult && <span className={`result-chip r-${c.lastResult}`}>{RESULT_LABEL[c.lastResult]}</span>}<small>letzte Bewegung vor {daysSince(lastTouch(c))} Tagen</small></div>
                <div className="task-action"><small>NÄCHSTE AKTION</small><strong>{!c.email && isPostalCandidate(c) && action.emailStep === 1 ? "Brief per Post senden" : action.label}</strong></div>
                <div className="task-buttons">
                  {action.emailStep !== null && emailButton(c, action.emailStep, true)}
                  {c.phone && <a className="secondary" href={`tel:${c.phone}`}>☎ Anrufen</a>}
                  <button className="secondary" onClick={() => openCompany(c)}>Ergebnis eintragen</button>
                  <button className="won-btn" onClick={() => requestStage(c, "Zugesagt")}>Zugesagt</button>
                  <button className="lost-btn" onClick={() => updateStage(c, "Verloren")}>Verloren</button>
                </div>
              </div>; })}</div>
            </article>
            <aside className="focus-card"><p>HEUTIGER FOKUS</p><strong>{tasks.length}</strong><span>offene Kontakte</span><hr/><div className="focus-split"><div><b>{tasks.filter(t => taskPriority(t) === "A").length}</b><small>Priorität A</small></div><div><b>{tasks.filter(t => taskPriority(t) === "B").length}</b><small>Priorität B</small></div><div><b>{tasks.filter(t => taskPriority(t) === "C").length}</b><small>Priorität C</small></div></div><hr/><b>So funktioniert es</b><p>Jede Aktion wird sofort in der Historie der Firma protokolliert. Eine gesendete E-Mail schiebt die Firma automatisch in die nächste Kontaktstufe. Ein Ergebnis „Positiv“ holt die Firma dauerhaft nach oben.</p></aside>
          </div>
        </>}

        {view === "Veranstaltungen" && <>
          <div className="page-head"><div><p className="eyebrow">REGIONALE EVENTS</p><h1>Veranstaltungen</h1><p>Einladungen, Zusagen und Teilnahme.</p></div><button className="primary" onClick={() => setShowEventForm("new")}>＋ Veranstaltung planen</button></div>
          {events.length === 0 && <div className="empty-table">Noch keine Veranstaltung angelegt.</div>}
          <div className="event-grid">{events.map(e => <article className="event-card" key={e.id}><div className="event-date"><strong>{new Date(e.startAt).getDate()}</strong><span>{new Intl.DateTimeFormat("de-DE", { month: "short" }).format(new Date(e.startAt)).toUpperCase()}</span></div><div className="event-body"><small>{e.status.toUpperCase()}</small><h2>{e.title}</h2><p>⌖ {e.location}</p><p>◷ {new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(e.startAt))} Uhr</p><div className="event-progress"><div><span>Verbindlich angemeldet (Personen)</span><b>{e.registered ?? 0} / {e.capacity || "–"}</b></div><i><span style={{ width: `${e.capacity ? Math.min(100, Math.round((e.registered ?? 0) / e.capacity * 100)) : 0}%` }}/></i></div><div className="event-stats"><span><strong>{e.invited}</strong> Eingeladen</span><span><strong>{e.confirmed}</strong> Zugesagt</span><span><strong>{e.signupCount ?? 0}</strong> Anmeldungen</span></div><button onClick={() => setShowEventForm(e)}>Veranstaltung öffnen →</button></div></article>)}</div>
          <article className="panel signup-panel"><div className="panel-head"><div><h2>Verbindliche Anmeldungen über die Website ({signups.length})</h2><p>Jede Anmeldung auf ki-masterclass.com/ki-speed-date erscheint hier sofort – mit Zuordnung zur Firma im CRM.</p></div></div>
            {signups.length === 0 ? <div className="empty-table">Noch keine Anmeldungen.</div> : <div className="table-wrap"><table><thead><tr><th>Eingegangen</th><th>Name</th><th>Unternehmen</th><th>Personen</th><th>Thema</th><th>Im CRM</th></tr></thead><tbody>{signups.map(sg => { const co = sg.companyId ? companies.find(c => c.id === sg.companyId) : undefined; return <tr key={sg.id} className={co ? "clickable" : ""} onClick={() => { if (co) openCompany(co); }}><td>{fmtDateTime(sg.createdAt)}</td><td><strong className="normal">{sg.name}</strong><small className="block">{sg.email}</small></td><td>{sg.company}</td><td>{sg.persons}</td><td>{sg.message || "–"}</td><td>{co ? <span className="stage-pill st4">{co.name}</span> : <span className="muted-note">nicht zugeordnet</span>}<small className="block">{sg.mailStatus}</small></td></tr>; })}</tbody></table></div>}
          </article>
        </>}

        {view === "Terminmanagement" && <>
          <div className="page-head"><div><p className="eyebrow">ZENTRALE ÜBERSICHT</p><h1>Terminmanagement</h1><p>{openMonth ? "Alle Termine des Monats nach Datum." : "Masterclass-Termine, Veranstaltungen und Wiedervorlagen nach Monaten – Kachel anklicken für Details."}</p></div><div className="head-actions">{openMonth && <button className="secondary" onClick={() => setOpenMonth(null)}>← Alle Monate</button>}<label className="primary file-button">{importingSessions ? "Importiert …" : "⇪ Kohorte importieren (sessions.json)"}<input type="file" accept="application/json" onChange={importSessionsFile} disabled={importingSessions}/></label></div></div>
          {!openMonth && <div className="month-grid">{monthTiles.map(m => <button key={m.key} className={`month-tile${m.past ? " past" : ""}`} onClick={() => setOpenMonth(m.key)}>
            <span className="month-name">{m.label}</span>
            <strong>{m.items.length}</strong><small>Einträge</small>
            <span className="month-counts">{m.webinars > 0 && <i className="k-webinar">{m.webinars} Webinar{m.webinars > 1 ? "e" : ""}</i>}{m.workshops > 0 && <i className="k-workshop">{m.workshops} Workshop{m.workshops > 1 ? "s" : ""}</i>}{m.events > 0 && <i className="k-event">{m.events} Veranstaltung{m.events > 1 ? "en" : ""}</i>}{m.followups > 0 && <i className="k-followup">{m.followups} Wiedervorlage{m.followups > 1 ? "n" : ""}</i>}{m.items.length === 0 && <i>keine Termine</i>}</span>
          </button>)}</div>}
          {openMonth && (() => { const m = monthTiles.find(x => x.key === openMonth); const items = m?.items ?? []; return <article className="panel"><div className="panel-head"><div><h2>{m?.label}</h2><p>{items.length} Einträge</p></div></div>
            {items.length === 0 && <div className="empty-table">Keine Termine in diesem Monat.</div>}
            {items.length > 0 && <div className="table-wrap"><table><thead><tr><th>Datum</th><th>Uhrzeit</th><th>Art</th><th>Was</th><th>Details</th></tr></thead><tbody>{items.map(t => { const co = t.companyId ? companies.find(c => c.id === t.companyId) : undefined; return <tr key={t.key} onClick={() => { if (co) openCompany(co); }} className={co ? "clickable" : ""}><td><strong className="normal">{fmtDate(t.date)}</strong></td><td>{t.time || "–"}</td><td><span className={`kind-pill k-${t.kind}`}>{t.kind === "workshop" ? "Workshop" : t.kind === "event" ? "Veranstaltung" : t.kind === "followup" ? "Wiedervorlage" : "Webinar"}</span></td><td><strong className="normal">{t.label}</strong></td><td>{t.detail}</td></tr>; })}</tbody></table></div>}
          </article>; })()}
        </>}
      </section>
    </main>

    {selected && <div className="modal-backdrop" onMouseDown={() => setSelectedId(null)}><aside className="drawer wide-drawer" onMouseDown={e => e.stopPropagation()}>
      <button className="close" onClick={() => setSelectedId(null)} aria-label="Schließen">×</button>
      <div className="company-hero"><span>{initials(selected.name)}</span><div><small>{selected.industry} · Ausgangsstadt {selected.originCity}</small><h2>{selected.name}</h2><p>⌖ {selected.address || selected.city} · {selected.distance} km</p></div></div>

      <div className="drawer-grid">
        <div className="drawer-col">
          <section className="drawer-section">
            <h3>Unternehmen & Ansprechpartner</h3>
            <div className="detail-grid">
              <div><small>ANSPRECHPARTNER</small><strong>{selected.manager || "–"}</strong></div>
              <div><small>GRÖSSE</small><strong>{selected.employees || "–"}</strong></div>
              <div><small>TELEFON</small>{selected.phone ? <a href={`tel:${selected.phone}`}>{selected.phone}</a> : <strong>–</strong>}</div>
              <div><small>E-MAIL</small>{selected.email ? <a href={`mailto:${selected.email}`}>{selected.email}</a> : <strong>–</strong>}</div>
              <div className="span2"><small>WEBSITE</small>{selected.website ? <a href={selected.website.startsWith("http") ? selected.website : `https://${selected.website}`} target="_blank" rel="noreferrer">{selected.website}</a> : <strong>–</strong>}</div>
            </div>
            <label className="field"><span>Anrede in den E-Mails (z. B. „Herr Drösel“, „Frau Michels“)</span><input key={`sal-${selected.id}`} defaultValue={selected.salutation} placeholder="Herr/Frau Nachname – leer = „Guten Tag,“" onBlur={e => { const v = e.target.value.trim(); if (v !== selected.salutation) patchCompany(selected, { salutation: v }, "Anrede gespeichert"); }}/></label>
          </section>

          <section className="drawer-section">
            <h3>Status</h3>
            <div className="stage-chips">{STAGES.map(s => <button key={s} className={`stage-chip${selected.stage === s ? " active" : ""}${s === "Zugesagt" ? " won" : s === "Verloren" ? " lost" : ""}`} onClick={() => requestStage(selected, s)}>{s}</button>)}</div>
            <p className="muted-note">Nächste Aktion: <b>{nextActionFor(selected.stage, selected.outreachStep).label}</b> · letzte Bewegung vor {daysSince(lastTouch(selected))} Tagen</p>
          </section>

          <section className="drawer-section">
            <h3>Notizen zum Kunden</h3>
            <textarea className="notes-area" rows={5} value={notesDraft ?? selected.notes} onChange={e => setNotesDraft(e.target.value)} placeholder="Freie Notizen zum Unternehmen …"/>
            {notesDraft !== null && notesDraft !== selected.notes && <div className="row-actions"><button className="primary" onClick={() => { patchCompany(selected, { notes: notesDraft }, "Notizen gespeichert"); setNotesDraft(null); }}>Notizen speichern</button><button className="secondary" onClick={() => setNotesDraft(null)}>Verwerfen</button></div>}
          </section>
        </div>

        <div className="drawer-col">
          <section className="drawer-section">
            <h3>Einladungs-E-Mails</h3>
            {([1, 2, 3] as const).map(step => { const sent = selected.outreachStep >= step; return <div key={step} className={`mail-row${sent ? " sent" : ""}`}>
              <div><small>{step}. AUSSENDUNG{sent ? " · GESENDET" : ""}</small><strong>{OUTREACH_TEMPLATES[step].subject}</strong></div>
              <div className="row-actions"><button className="secondary" onClick={() => setPreview({ step, companyId: selected.id })}>Vorschau</button>{sent ? <span className="sent-badge">✓ gesendet</span> : emailButton(selected, step)}</div>
            </div>; })}
            <div className={`mail-row${selected.registeredAt ? " sent" : ""}`}>
              <div><small>ZUSAGE · BITTE UM VERBINDLICHE ANMELDUNG{selected.registeredAt ? ` · ANGEMELDET AM ${fmtDate(selected.registeredAt)}` : ""}</small><strong>{OUTREACH_TEMPLATES[4].subject}</strong></div>
              <div className="row-actions"><button className="secondary" onClick={() => setPreview({ step: 4, companyId: selected.id })}>Vorschau</button>{selected.registeredAt ? <span className="sent-badge">✓ verbindlich angemeldet</span> : selected.stage === "Zugesagt" ? emailButton(selected, 4) : <span className="muted-note">wird mit „Zugesagt“ gesendet</span>}</div>
            </div>
            {confirmation && <div className="confirmation-box"><label className="field"><span>Betreff</span><input value={confirmation.subject} onChange={e => setConfirmation({ ...confirmation, subject: e.target.value })}/></label><label className="field"><span>Text</span><textarea rows={9} value={confirmation.body} onChange={e => setConfirmation({ ...confirmation, body: e.target.value })}/></label><div className="row-actions"><button className="primary" disabled={confirmationBusy} onClick={() => sendConfirmation(selected)}>{confirmationBusy ? "Sendet …" : "✉ Bestätigung senden"}</button><button className="secondary" onClick={() => setConfirmation(null)}>Abbrechen</button></div></div>}
          </section>

          {(isPostalCandidate(selected) || selected.postalStatus) && <section className="drawer-section postal-section">
            <h3>Postversand</h3>
            <div className={`mail-row${selected.postalStatus === POSTAL_STATUS.sent ? " sent" : ""}`}>
              <div><small>{selected.postalStatus === POSTAL_STATUS.sent ? `PER POST VERSENDET AM ${fmtDate(selected.postalSentAt)}` : selected.postalStatus === POSTAL_STATUS.marked ? "FÜR POSTVERSAND VORGEMERKT" : "KEINE E-MAIL – BRIEF MÖGLICH"}</small><strong>{selected.address}</strong></div>
              <div className="row-actions">
                {selected.postalStatus === POSTAL_STATUS.sent ? <span className="sent-badge">✓ Brief versendet</span> : <>
                  <button className="secondary" onClick={() => printLetters([selected.id])}>Brief ansehen / drucken</button>
                  {selected.postalStatus === POSTAL_STATUS.marked
                    ? <><button className="secondary" disabled={postalBusy} onClick={() => postalAction("unmark", [selected.id])}>Vormerkung aufheben</button><button className="primary" disabled={postalBusy} onClick={() => postalAction("sent", [selected.id], `${selected.name}: als per Post versendet markiert`)}>Als versendet markieren</button></>
                    : <button className="primary" disabled={postalBusy} onClick={() => postalAction("mark", [selected.id])}>Für Postversand vormerken</button>}
                </>}
              </div>
            </div>
          </section>}

          <section className="drawer-section">
            <h3>Aktivität eintragen</h3>
            <form className="activity-form" onSubmit={e => saveActivity(selected, e)}>
              <div className="seg">{ACTIVITY_KINDS.map(k => <button type="button" key={k} className={activityKind === k ? "active" : ""} onClick={() => setActivityKind(k)}>{k}</button>)}</div>
              <div className="seg results"><span>Ergebnis:</span>{RESULT_OPTIONS.map(r => <button type="button" key={r} className={`r-${r}${activityResult === r ? " active" : ""}`} onClick={() => setActivityResult(activityResult === r ? "" : r)}>{RESULT_LABEL[r]}</button>)}</div>
              <textarea rows={3} value={activityNote} onChange={e => setActivityNote(e.target.value)} placeholder="Was wurde besprochen? z. B. „Angerufen – will mit Partner sprechen, Rückruf Freitag“"/>
              <button className="primary" disabled={savingActivity}>{savingActivity ? "Speichert …" : "In Historie eintragen"}</button>
            </form>
          </section>

          <section className="drawer-section">
            <h3>Historie</h3>
            {history.length === 0 && <p className="muted-note">Noch keine Aktivitäten.</p>}
            <ol className="history">{history.map(h => <li key={h.id}><time>{fmtDateTime(h.at)}</time><div><b>{h.kind}</b>{h.result && <span className={`result-chip r-${h.result}`}>{RESULT_LABEL[h.result] ?? h.result}</span>}<p>{h.text}</p>{h.by && <small>{h.by}</small>}</div></li>)}</ol>
          </section>
        </div>
      </div>
      <div className="source">Datenquelle: {selected.source || "–"}</div>
    </aside></div>}

    {zusageFor && <div className="modal-backdrop centered" onMouseDown={() => !zusageBusy && setZusageFor(null)}><div className="add-modal zusage-modal" onMouseDown={e => e.stopPropagation()}>
      <p className="eyebrow">ZUSAGE ERFASSEN</p><h2>{zusageFor.name} hat zugesagt</h2>
      <p className="muted-note">Der Status wird auf „Zugesagt“ gesetzt. Gezählt wird der Teilnehmer erst, wenn er sich über die Veranstaltungsseite verbindlich angemeldet und den Datenschutz bestätigt hat.</p>
      {zusageFor.email ? <label className="check-line"><input type="checkbox" checked={zusageWithMail} onChange={e => setZusageWithMail(e.target.checked)}/> <span>Dankes-E-Mail mit Bitte um verbindliche Anmeldung an <b>{zusageFor.email}</b> senden</span></label> : <p className="muted-note">Keine E-Mail-Adresse hinterlegt – es wird keine E-Mail gesendet.</p>}
      <div className="form-actions"><button className="secondary" onClick={() => setPreview({ step: 4, companyId: zusageFor.id })}>Vorschau der E-Mail</button><button className="secondary" disabled={zusageBusy} onClick={() => setZusageFor(null)}>Abbrechen</button><button className="primary" disabled={zusageBusy} onClick={confirmZusage}>{zusageBusy ? "Wird gespeichert …" : zusageWithMail && zusageFor.email ? "Zugesagt + E-Mail senden" : "Als zugesagt speichern"}</button></div>
    </div></div>}

    {preview && <div className="modal-backdrop centered" onMouseDown={() => setPreview(null)}><div className="preview-modal" onMouseDown={e => e.stopPropagation()}><div className="preview-head"><strong>Vorschau · {preview.step === 4 ? "Zusage-E-Mail" : `${preview.step}. Aussendung`}</strong><button className="close static" onClick={() => setPreview(null)} aria-label="Schließen">×</button></div><iframe title="E-Mail-Vorschau" src={`/api/outreach/preview?step=${preview.step}${preview.companyId ? `&companyId=${preview.companyId}` : ""}`}/></div></div>}

    {showEventForm && <div className="modal-backdrop centered" onMouseDown={() => setShowEventForm(null)}><form className="add-modal" onSubmit={saveEvent} onMouseDown={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setShowEventForm(null)}>×</button><p className="eyebrow">{showEventForm === "new" ? "NEUE VERANSTALTUNG" : "VERANSTALTUNG BEARBEITEN"}</p><h2>{showEventForm === "new" ? "Veranstaltung planen" : showEventForm.title}</h2><div className="form-grid"><label className="span2"><span>Titel *</span><input name="title" required defaultValue={showEventForm === "new" ? "" : showEventForm.title}/></label><label><span>Ort</span><input name="location" defaultValue={showEventForm === "new" ? "" : showEventForm.location}/></label><label><span>Adresse</span><input name="address" defaultValue={showEventForm === "new" ? "" : showEventForm.address}/></label><label><span>Beginn *</span><input name="startAt" type="datetime-local" required defaultValue={showEventForm === "new" ? "" : showEventForm.startAt.slice(0, 16)}/></label><label><span>Ende</span><input name="endAt" type="datetime-local" defaultValue={showEventForm === "new" ? "" : showEventForm.endAt.slice(0, 16)}/></label><label><span>Kapazität</span><input name="capacity" type="number" min="0" defaultValue={showEventForm === "new" ? 50 : showEventForm.capacity}/></label><label><span>Status</span><select name="status" defaultValue={showEventForm === "new" ? "Planung" : showEventForm.status}>{EVENT_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></label><label className="span2"><span>Notizen</span><textarea name="notes" rows={3} defaultValue={showEventForm === "new" ? "" : showEventForm.notes}/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={() => setShowEventForm(null)}>Abbrechen</button><button className="primary" disabled={savingEvent}>{savingEvent ? "Speichert …" : "Speichern"}</button></div></form></div>}

    {showAdd && <div className="modal-backdrop centered" onMouseDown={() => setShowAdd(false)}><form className="add-modal" onSubmit={addCompany} onMouseDown={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setShowAdd(false)}>×</button><p className="eyebrow">NEUER MARKTKONTAKT</p><h2>Unternehmen hinzufügen</h2><div className="form-grid"><label><span>Unternehmensname *</span><input name="name" required/></label><label><span>Branche *</span><input name="industry" required/></label><label><span>Ort *</span><input name="city" required/></label><label><span>Entfernung in km *</span><input name="distance" type="number" min="0" required/></label><label><span>Ausgangsstadt *</span><select name="originCity" defaultValue={originCity === ALL_CITIES ? DEFAULT_ORIGIN_CITY : originCity}>{GERMAN_CITIES.map(c => <option key={c}>{c}</option>)}</select></label><label><span>Adresse</span><input name="address"/></label><label><span>Ansprechpartner</span><input name="manager"/></label><label><span>Anrede (z. B. „Herr Drösel“)</span><input name="salutation" placeholder="Herr/Frau Nachname"/></label><label><span>Mitarbeiter</span><select name="employees"><option>10–19</option><option>20–49</option><option>50–99</option><option>100–249</option></select></label><label><span>Telefon</span><input name="phone" type="tel"/></label><label><span>E-Mail</span><input name="email" type="email"/></label><label><span>Website</span><input name="website"/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={() => setShowAdd(false)}>Abbrechen</button><button className="primary">Unternehmen anlegen</button></div></form></div>}

    {showResearch && <div className="modal-backdrop centered" onMouseDown={() => setShowResearch(false)}><form className="research-modal" onSubmit={startResearch} onMouseDown={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setShowResearch(false)}>×</button><div className="research-title"><span>✦</span><div><p className="eyebrow">DEEP SEARCH · 10 NEUE KONTAKTE</p><h2>Neue Unternehmen recherchieren</h2><p>Gefundene Unternehmen werden geprüft, gegen Dubletten abgeglichen und als „Neu“ gespeichert.</p></div></div><div className="form-grid"><label><span>Branche *</span><input name="industry" placeholder="z. B. Maschinenbau" required/></label><label><span>Ausgangsstadt *</span><select name="originCity" defaultValue={originCity === ALL_CITIES ? DEFAULT_ORIGIN_CITY : originCity}>{GERMAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label><label><span>Umkreis *</span><select name="radius" defaultValue={radius}>{[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(r => <option key={r} value={r}>{r} km</option>)}</select></label><label><span>Unternehmensgröße *</span><select name="employees"><option>10–19 Mitarbeiter</option><option>20–49 Mitarbeiter</option><option>50–99 Mitarbeiter</option><option>100–249 Mitarbeiter</option><option>10–249 Mitarbeiter</option></select></label><label><span>Rechtsform / Firmierung</span><select name="legalForm"><option>Alle Rechtsformen</option><option>GmbH</option><option>GmbH & Co. KG</option><option>KG</option><option>AG</option><option>e.K.</option></select></label><label><span>Regionaler Schwerpunkt</span><input name="region" key={originCity} defaultValue={originCity === ALL_CITIES || originCity === DEFAULT_ORIGIN_CITY ? "Nürnberg, Fürth und Erlangen" : `${originCity} und Umgebung`}/></label></div><div className="research-info"><strong>Was die Recherche übernimmt</strong><span>10 neue, möglichst vollständige Datensätze · Firmenname · Anschrift · Branche · Größe · Website · Telefon · Ansprechpartner · Quellenangabe. Firmen ohne E-Mail, aber mit vollständiger Postanschrift, werden für den Briefversand übernommen und gekennzeichnet.</span></div>{lastResearch && <p className="last-research">Letzter Auftrag: {lastResearch.industry}, {lastResearch.radius} km · Status: {lastResearch.status}</p>}<div className="form-actions"><button type="button" className="secondary" onClick={() => setShowResearch(false)}>Abbrechen</button><button className="primary" disabled={researching}>{researching ? "Recherche läuft …" : "✦ Tiefensuche starten"}</button></div></form></div>}

    {showPostal && <div className="modal-backdrop centered" onMouseDown={() => setShowPostal(false)}><div className="research-modal postal-modal" onMouseDown={e => e.stopPropagation()}>
      <button type="button" className="close" onClick={() => setShowPostal(false)}>×</button>
      <p className="eyebrow">POSTALISCHE AUSSENDUNG · {cityLabel.toUpperCase()}</p>
      <h2>Wen schreiben wir per Brief an?</h2>
      <p className="muted-note">Vorgeschlagen werden Unternehmen ohne E-Mail-Adresse, bei denen die vollständige Postanschrift vorliegt. Anklicken = für den Postversand vormerken.</p>
      {postalOpen.length === 0 ? <div className="empty-table">Keine Brief-Kandidaten im aktuellen Marktgebiet.</div> : <>
        <div className="postal-tools"><button className="secondary" disabled={postalBusy} onClick={() => postalAction("mark", postalOpen.filter(c => c.postalStatus !== POSTAL_STATUS.marked).map(c => c.id))}>Alle vormerken</button><button className="secondary" disabled={postalBusy || postalMarked.length === 0} onClick={() => postalAction("unmark", postalMarked.map(c => c.id))}>Alle abwählen</button></div>
        <div className="postal-list">{postalOpen.map(c => <label key={c.id} className={`postal-row${c.postalStatus === POSTAL_STATUS.marked ? " marked" : ""}`}><input type="checkbox" checked={c.postalStatus === POSTAL_STATUS.marked} disabled={postalBusy} onChange={e => postalAction(e.target.checked ? "mark" : "unmark", [c.id])}/><div><strong>{c.name}</strong><small>{c.manager ? `${c.manager} · ` : ""}{c.address}</small></div><span className={stageClass(c.stage)}>{c.stage}</span></label>)}</div>
      </>}
      <div className="postal-foot">
        <small>{postalMarked.length} vorgemerkt{postalSentCount ? ` · ${postalSentCount} bereits per Post versendet` : ""}</small>
        <div className="form-actions">
          <button className="secondary" disabled={postalMarked.length === 0} onClick={() => printLetters(postalMarked.map(c => c.id))}>Briefe drucken ({postalMarked.length})</button>
          {confirmPostalSent
            ? <span className="confirm-inline"><span>{postalMarked.length} Briefe wurden verschickt?</span><button className="primary" disabled={postalBusy} onClick={() => postalAction("sent", postalMarked.map(c => c.id), `${postalMarked.length} Unternehmen als per Post versendet markiert`)}>Ja, versendet</button><button className="secondary" onClick={() => setConfirmPostalSent(false)}>Abbrechen</button></span>
            : <button className="primary" disabled={postalMarked.length === 0 || postalBusy} onClick={() => setConfirmPostalSent(true)}>Als versendet markieren</button>}
        </div>
      </div>
    </div></div>}

    {notice && <div className="toast">✓ {notice}</div>}
  </div>;
}

function CompanyTable({ companies, onSelect }: { companies: Company[]; onSelect: (c: Company) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>Unternehmen</th><th>Branche</th><th>Ansprechpartner</th><th>Status</th><th></th></tr></thead><tbody>{companies.map(c => <tr key={c.id} onClick={() => onSelect(c)} className="clickable"><td><div className="company-cell"><span>{initials(c.name)}</span><div><strong>{c.name}</strong><small>{c.city} · {c.distance} km</small></div></div></td><td>{c.industry}<small className="block">{c.employees}</small></td><td><strong className="normal">{c.manager || "–"}</strong><small className="block">{c.phone}</small></td><td><span className={stageClass(c.stage)}>{c.stage}</span>{c.lastResult && <span className={`result-chip r-${c.lastResult}`}>{RESULT_LABEL[c.lastResult]}</span>}{postalLabel(c) && <span className={`postal-chip${c.postalStatus ? " active" : ""}`}>✉ {postalLabel(c)}</span>}</td><td className="arrow">→</td></tr>)}</tbody></table>{companies.length === 0 && <div className="empty-table">Keine Unternehmen für diese Auswahl gefunden.</div>}</div>;
}
