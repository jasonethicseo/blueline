// Session_Record / Active_Session_State types and their stored text format. Pure.
import { durationBySeconds } from './config';

export type Label = 'YOUTUBE' | 'INSTAGRAM' | 'CUSTOM';
export type EndReason = 'TIME UP' | 'HANG UP';

export const LABELS: readonly Label[] = ['YOUTUBE', 'INSTAGRAM', 'CUSTOM'];
export const END_REASONS: readonly EndReason[] = ['TIME UP', 'HANG UP'];

/** One finished Session. Contains no URL (Req 10.1). Timestamps are ms; durations are seconds. */
export interface SessionRecord {
  start: number;
  end: number;
  plannedSec: number;
  actualSec: number;
  fee: number;
  reason: EndReason;
  label: Label;
}

/** A Session in progress, stored so a reload can recover it (Req 11). Contains no URL. */
export interface ActiveSession {
  start: number;
  plannedSec: number;
  label: Label;
}

const VERSION = 1;

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isLabel = (v: unknown): v is Label => LABELS.includes(v as Label);
const isReason = (v: unknown): v is EndReason => END_REASONS.includes(v as EndReason);

function toRecord(v: unknown): SessionRecord | null {
  if (!isObject(v)) return null;
  const { start, end, plannedSec, actualSec, fee, reason, label } = v;
  if (![start, end, plannedSec, actualSec, fee].every(isFiniteNumber)) return null;
  if (!isReason(reason) || !isLabel(label)) return null;
  if ((end as number) < (start as number)) return null;
  return {
    start: start as number, end: end as number, plannedSec: plannedSec as number,
    actualSec: actualSec as number, fee: fee as number, reason, label,
  };
}

/** Write only the listed fields, so nothing else (such as a URL) can reach storage. */
export function serializeHistory(records: readonly SessionRecord[]): string {
  return JSON.stringify({
    v: VERSION,
    records: records.map((r) => ({
      start: r.start, end: r.end, plannedSec: r.plannedSec, actualSec: r.actualSec,
      fee: r.fee, reason: r.reason, label: r.label,
    })),
  });
}

/** Parse stored history. Any bad record makes the whole text unreadable (Req 10.4). */
export function parseHistory(text: string): { ok: true; records: SessionRecord[] } | { ok: false } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (!isObject(data) || data.v !== VERSION || !Array.isArray(data.records)) return { ok: false };
  const records: SessionRecord[] = [];
  for (const item of data.records) {
    const r = toRecord(item);
    if (!r) return { ok: false };
    records.push(r);
  }
  return { ok: true, records };
}

export function serializeActive(a: ActiveSession): string {
  return JSON.stringify({ v: VERSION, start: a.start, plannedSec: a.plannedSec, label: a.label });
}

/** Parse the stored active session; null if malformed (Req 11.5). The start > now check is in `recover`. */
export function parseActive(text: string): ActiveSession | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data) || data.v !== VERSION) return null;
  const { start, plannedSec, label } = data;
  if (!isFiniteNumber(start) || !isFiniteNumber(plannedSec) || !isLabel(label)) return null;
  if (!durationBySeconds(plannedSec)) return null;
  return { start, plannedSec, label };
}
