// Session_Record / Active_Session_State types and their stored text format. Pure.
// History is written in format v2 (with Post_Number, Purpose, Outcome). Format v1, written
// before the purpose-board feature, is still read (Req 8.3, 13.3).
import { durationBySeconds } from './config';
import { isStoredPurpose } from './purpose';

export type Label = 'YOUTUBE' | 'INSTAGRAM' | 'CUSTOM';
export type EndReason = 'TIME UP' | 'HANG UP';
export type Outcome = 'DONE' | 'DRIFTED' | 'NO ANSWER';

export const LABELS: readonly Label[] = ['YOUTUBE', 'INSTAGRAM', 'CUSTOM'];
export const END_REASONS: readonly EndReason[] = ['TIME UP', 'HANG UP'];
export const OUTCOMES: readonly Outcome[] = ['DONE', 'DRIFTED', 'NO ANSWER'];

/**
 * One finished Session. Contains no URL and no Message (Req 8.1, 8.2).
 * Timestamps are ms; durations are seconds. `no` is the Post_Number (Req 13).
 */
export interface SessionRecord {
  no: number;
  start: number;
  end: number;
  plannedSec: number;
  actualSec: number;
  fee: number;
  reason: EndReason;
  label: Label;
  /** null only for Legacy_Records and Sessions recovered from a legacy active state. */
  purpose: string | null;
  outcome: Outcome;
}

/** A record before it is appended: `endRecord` makes it, `appendRecord` numbers it. */
export type NewRecord = Omit<SessionRecord, 'no'>;

/** A Session in progress, stored so a reload can recover it (Req 11). Contains no URL. */
export interface ActiveSession {
  start: number;
  plannedSec: number;
  label: Label;
}

const HISTORY_VERSION = 2;
const LEGACY_HISTORY_VERSION = 1;
const ACTIVE_VERSION = 1;

type Json = Record<string, unknown>;
type Core = Omit<NewRecord, 'purpose' | 'outcome'>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isLabel = (v: unknown): v is Label => LABELS.includes(v as Label);
const isReason = (v: unknown): v is EndReason => END_REASONS.includes(v as EndReason);
const isOutcome = (v: unknown): v is Outcome => OUTCOMES.includes(v as Outcome);

/** The seven core fields, checked by the core rules (core Req 10.4). */
function toCore(v: unknown): Core | null {
  if (!isObject(v)) return null;
  const { start, end, plannedSec, actualSec, fee, reason, label } = v;
  if (!isFiniteNumber(start) || !isFiniteNumber(end) || !isFiniteNumber(plannedSec)) return null;
  if (!isFiniteNumber(actualSec) || !isFiniteNumber(fee)) return null;
  if (!isReason(reason) || !isLabel(label)) return null;
  if (end < start) return null;
  return { start, end, plannedSec, actualSec, fee, reason, label };
}

/** A v2 record: core rules plus Post_Number after `prevNo`, Purpose, and Outcome (Req 8.6, 13.6). */
function toRecordV2(v: unknown, prevNo: number): SessionRecord | null {
  const core = toCore(v);
  if (!core) return null;
  const { no, purpose, outcome } = v as Json;
  if (typeof no !== 'number' || !Number.isSafeInteger(no) || no < 1 || no <= prevNo) return null;
  if (purpose !== null && !isStoredPurpose(purpose)) return null;
  if (!isOutcome(outcome)) return null;
  return { no, ...core, purpose, outcome };
}

/** A Legacy_Record keeps its core values, has no Purpose, and counts as NO ANSWER (Req 8.3, 13.3). */
function fromLegacy(core: Core, index: number): SessionRecord {
  return { no: index + 1, ...core, purpose: null, outcome: 'NO ANSWER' };
}

/** Write only the listed fields, so nothing else (a URL or a Message) can reach storage. */
export function serializeHistory(records: readonly SessionRecord[]): string {
  return JSON.stringify({
    v: HISTORY_VERSION,
    records: records.map((r) => ({
      no: r.no, start: r.start, end: r.end, plannedSec: r.plannedSec, actualSec: r.actualSec,
      fee: r.fee, reason: r.reason, label: r.label, purpose: r.purpose, outcome: r.outcome,
    })),
  });
}

/** Parse stored history in format v2 or v1. Any bad record makes the whole text unreadable (Req 8.6). */
export function parseHistory(text: string): { ok: true; records: SessionRecord[] } | { ok: false } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!isObject(data) || !Array.isArray(data.records)) return { ok: false };
  const records: SessionRecord[] = [];
  if (data.v === LEGACY_HISTORY_VERSION) {
    for (const item of data.records) {
      const core = toCore(item);
      if (!core) return { ok: false };
      records.push(fromLegacy(core, records.length));
    }
    return { ok: true, records };
  }
  if (data.v !== HISTORY_VERSION) return { ok: false };
  let prevNo = 0;
  for (const item of data.records) {
    const r = toRecordV2(item, prevNo);
    if (!r) return { ok: false };
    records.push(r);
    prevNo = r.no;
  }
  return { ok: true, records };
}

export function serializeActive(a: ActiveSession): string {
  return JSON.stringify({ v: ACTIVE_VERSION, start: a.start, plannedSec: a.plannedSec, label: a.label });
}

/** Parse the stored active session; null if malformed (Req 11.5). The start > now check is in `recover`. */
export function parseActive(text: string): ActiveSession | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data) || data.v !== ACTIVE_VERSION) return null;
  const { start, plannedSec, label } = data;
  if (!isFiniteNumber(start) || !isFiniteNumber(plannedSec) || !isLabel(label)) return null;
  if (!durationBySeconds(plannedSec)) return null;
  return { start, plannedSec, label };
}
