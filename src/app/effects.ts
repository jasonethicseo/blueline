// Runs the effects the core returns, by calling platform and audio wrappers.
import { appendRecord, setOutcome, type HistoryStatus } from '../core/history';
import type { Effect, Event } from '../core/session';
import * as modem from '../audio/modem';
import * as notify from '../platform/notify';
import * as open from '../platform/open';
import * as page from '../platform/page';
import * as storage from '../platform/storage';

export interface EffectHost {
  /** Queue a follow-up event; it runs in the same call stack (keeps the user gesture). */
  queue(e: Event): void;
  /** The handshake started; the controller schedules HANDSHAKE_DONE. */
  handshakeStarted(): void;
  /** History after the record was written, for the receipt. */
  historyWritten(h: HistoryStatus): void;
}

export function runEffect(fx: Effect, host: EffectHost): void {
  switch (fx.type) {
    case 'playHandshake':
      modem.handshake();
      host.handshakeStarted();
      return;
    case 'stopSound':
      modem.stop();
      return;
    case 'playNoCarrier':
      modem.noCarrier();
      return;
    case 'openDestination':
      // Synchronous inside the confirm key press or tap (Req 5.1).
      host.queue(open.openInNewTab(fx.url) ? { type: 'OPENED', now: Date.now() } : { type: 'POPUP_BLOCKED' });
      return;
    case 'requestNotifyPermission':
      // Synchronous inside the duration-pick key press or tap; not awaited (Req 7.4).
      notify.requestIfDefault();
      return;
    case 'saveActive':
      storage.saveActive(fx.active);
      return;
    case 'clearActive':
      storage.clearActive();
      return;
    case 'endSession': {
      // Written before NO CARRIER is shown (Req 9.1, 10.9). A failed write leaves stored history unchanged (Req 10.7).
      const loaded = storage.loadHistory();
      if (loaded.kind === 'unavailable') {
        host.historyWritten(loaded);
      } else {
        const records = appendRecord(loaded.records, fx.record);
        host.historyWritten(storage.saveHistory(records) ? { kind: loaded.kind, records } : { kind: 'unavailable' });
      }
      storage.clearActive();
      return;
    }
    case 'saveOutcome': {
      // Change only that record's Outcome (Req 8.9). A failed write keeps the stored NO ANSWER
      // and the receipt counts the answer from the current Session (Req 5.8).
      const loaded = storage.loadHistory();
      if (loaded.kind === 'unavailable') {
        host.historyWritten(loaded);
      } else {
        const records = setOutcome(loaded.records, fx.start, fx.outcome);
        host.historyWritten(storage.saveHistory(records) ? { kind: loaded.kind, records } : { kind: 'unavailable' });
      }
      return;
    }
    case 'loadBoard':
      // Read only; the Board never writes (Req 7.11). Queued, so it runs in this same dispatch.
      host.queue({ type: 'BOARD_LOADED', history: storage.loadHistory() });
      return;
    case 'notifyTimeUp':
      // Notification if permitted; otherwise flash the title while hidden (Req 7.3, 7.5).
      if (!notify.show('NO CARRIER', 'SESSION TIME IS UP.') && !page.isVisible()) page.startTitleFlash();
      return;
  }
}
