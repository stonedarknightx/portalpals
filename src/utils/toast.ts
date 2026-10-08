// Tiny pub/sub so any file can show a toast without prop drilling.
export type ToastKind = 'success' | 'info' | 'warn' | 'error' | 'coin' | 'ability' | 'round';
export interface ToastItem { id: number; message: string; kind: ToastKind; ms: number }

type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();
let nextId = 1;
let last = { message: '', at: 0 };

const HAPTICS: Partial<Record<ToastKind, number | number[]>> = {
  success: 15, coin: [10, 40, 10], warn: [30, 40, 30], error: [60], ability: 20,
};

export function toast(message: string, kind: ToastKind = 'info', ms = kind === 'warn' || kind === 'error' ? 3600 : 2600) {
  const now = Date.now();
  if (message === last.message && now - last.at < 600) return; // drop duplicate bursts
  last = { message, at: now };
  const h = HAPTICS[kind];
  if (h && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(h); } catch { /* not supported */ }
  }
  const item: ToastItem = { id: nextId++, message, kind, ms };
  listeners.forEach(l => l(item));
}

export function subscribeToasts(l: Listener) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
