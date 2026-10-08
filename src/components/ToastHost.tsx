import { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, Coins, Sparkles, Flag } from 'lucide-react';
import { subscribeToasts, ToastItem, ToastKind } from '../utils/toast';

const STYLE: Record<ToastKind, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'border-emerald-500/60 bg-emerald-950/90 text-emerald-100' },
  info: { icon: Info, cls: 'border-sky-500/50 bg-zinc-900/95 text-zinc-100' },
  warn: { icon: AlertTriangle, cls: 'border-amber-500/70 bg-amber-950/90 text-amber-100' },
  error: { icon: XCircle, cls: 'border-rose-500/70 bg-rose-950/90 text-rose-100' },
  coin: { icon: Coins, cls: 'border-yellow-400/70 bg-yellow-950/90 text-yellow-100' },
  ability: { icon: Sparkles, cls: 'border-violet-400/70 bg-violet-950/90 text-violet-100' },
  round: { icon: Flag, cls: 'border-amber-300/70 bg-zinc-900/95 text-amber-200' },
};

/** Mount once near the app root. Shows up to 3 toasts at a time; tap one to dismiss it. */
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts(t => {
      setItems(prev => [...prev.slice(-2), t]);
      window.setTimeout(() => setItems(prev => prev.filter(x => x.id !== t.id)), t.ms);
    });
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-14 z-[200] flex flex-col items-center gap-2 px-3"
      aria-live="polite"
      role="status"
    >
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(-10px) scale(.96)}to{opacity:1;transform:none}}`}</style>
      {items.map(t => {
        const { icon: Icon, cls } = STYLE[t.kind];
        return (
          <button
            key={t.id}
            onClick={() => setItems(prev => prev.filter(x => x.id !== t.id))}
            className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold shadow-xl backdrop-blur-md cursor-pointer ${cls}`}
            style={{ animation: 'toast-in .22s ease-out' }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-left leading-snug">{t.message}</span>
          </button>
        );
      })}
    </div>
  );
}
