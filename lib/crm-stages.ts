// Gemeinsame Funnel-Logik für Oberfläche, API und Cron (keine Server-Abhängigkeiten).

export const STAGES = ["Neu", "1. Kontakt", "2. Kontakt", "3. Kontakt", "Zugesagt", "Verloren"] as const;
export type Stage = (typeof STAGES)[number];

export const ACTIVE_STAGES: readonly string[] = ["Neu", "1. Kontakt", "2. Kontakt", "3. Kontakt"];
export const CLOSED_STAGES: readonly string[] = ["Zugesagt", "Verloren"];

export const RESULT_OPTIONS = ["positiv", "unsicher", "sonstiges"] as const;
export type ActivityResult = (typeof RESULT_OPTIONS)[number];

export const ACTIVITY_KINDS = ["Anruf", "Gespräch", "E-Mail", "Brief", "Notiz"] as const;

export const TASK_AFTER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

/** Bildet alte Stufen (bis Version 09/2026) auf die neuen sechs Stufen ab. */
export function normalizeStage(stage: string, outreachStep = 0): Stage {
  if (isStage(stage)) return stage;
  if (["Veranstaltung zugesagt", "Teilgenommen", "Angebot erstellt", "Auftrag abgeschlossen"].includes(stage)) return "Zugesagt";
  if (outreachStep >= 3) return "3. Kontakt";
  if (outreachStep === 2) return "2. Kontakt";
  if (outreachStep === 1) return "1. Kontakt";
  if (["Kontakt aufgenommen", "Gespräch geführt", "Interesse", "Unterlagen versendet"].includes(stage)) return "1. Kontakt";
  return "Neu";
}

export function stageIndex(stage: string) {
  return (STAGES as readonly string[]).indexOf(stage);
}

/** Stufe nach dem Versand von E-Mail 1–3: rückt vor, aber nie zurück und nie aus Zugesagt/Verloren heraus. */
export function stageAfterEmail(current: string, step: number): Stage {
  const normalized = isStage(current) ? current : "Neu";
  if (CLOSED_STAGES.includes(normalized)) return normalized;
  const target = `${Math.min(Math.max(step, 1), 3)}. Kontakt` as Stage;
  return stageIndex(target) > stageIndex(normalized) ? target : normalized;
}

export function nextStage(current: string): Stage {
  const i = stageIndex(current);
  if (i < 0) return "1. Kontakt";
  if (i >= 3) return "Zugesagt";
  return STAGES[i + 1];
}

export function nextActionFor(stage: string, outreachStep: number): { label: string; emailStep: number | null } {
  if (stage === "Zugesagt") return { label: "Teilnahme bestätigen", emailStep: null };
  if (stage === "Verloren") return { label: "Abgeschlossen", emailStep: null };
  if (stage === "3. Kontakt" || outreachStep >= 3) return { label: "Ergebnis klären: zugesagt oder verloren", emailStep: null };
  const step = Math.min(outreachStep + 1, 3);
  return { label: `E-Mail ${step} senden`, emailStep: step };
}

function validTime(value: string | null | undefined) {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

export type TaskCompany = {
  stage: string; outreachStep: number; lastOutreachAt: string | null; stageChangedAt?: string | null;
  lastActivityAt?: string | null; lastResult?: string; createdAt?: string; updatedAt?: string;
};

/** Zeitpunkt der letzten Bewegung (Status, E-Mail oder erfasste Aktivität). */
export function lastTouch(c: TaskCompany) {
  const t = Math.max(validTime(c.stageChangedAt), validTime(c.lastActivityAt), validTime(c.lastOutreachAt), validTime(c.createdAt));
  return t || validTime(c.updatedAt) || Date.now();
}

export function daysSince(time: number, now = Date.now()) {
  return Math.floor((now - time) / DAY_MS);
}

/** Priorität A: Abschluss möglich (positives Signal). B: unsicher oder letzter Kontakt. C: übrige. */
export function taskPriority(c: TaskCompany): "A" | "B" | "C" {
  if (c.lastResult === "positiv") return "A";
  if (c.lastResult === "unsicher" || c.stage === "3. Kontakt") return "B";
  return "C";
}

/** Aufgabe = aktive Firma, die seit 14 Tagen nicht weitergeführt wurde – oder ein positiver Kontakt (immer oben). */
export function isTask(c: TaskCompany, now = Date.now()) {
  if (!ACTIVE_STAGES.includes(c.stage)) return false;
  if (c.lastResult === "positiv") return true;
  return daysSince(lastTouch(c), now) >= TASK_AFTER_DAYS;
}

export function sortTasks<T extends TaskCompany>(list: T[]) {
  const rank = { A: 0, B: 1, C: 2 } as const;
  return [...list].sort((a, b) => rank[taskPriority(a)] - rank[taskPriority(b)] || lastTouch(a) - lastTouch(b));
}

/** Fälligkeitsdatum der Wiedervorlage (letzte Bewegung + 14 Tage). */
export function followUpDue(c: TaskCompany) {
  return new Date(lastTouch(c) + TASK_AFTER_DAYS * DAY_MS);
}
