import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './progressbar.css';

export type ProgressStatus = 'running' | 'done' | 'error';

type Props = {
  percent: number;
  step: string;
  status?: ProgressStatus;
  label?: string;
};

type ProgressStyle = CSSProperties & { '--tk-progress-value'?: number };

const oneDecimal = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function slowMs(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--tk-t-slow').trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 360;
  return raw.endsWith('ms') ? n : n * 1000;
}

export function useSmoothPercent(target: number): number {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const tau = slowMs() / 2;
    let last = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const dt = Math.min(64, Math.max(0, now - last));
      last = now;
      const gap = target - shownRef.current;
      const next = Math.abs(gap) < 0.05 ? target : shownRef.current + gap * (1 - Math.exp(-dt / tau));
      shownRef.current = next;
      setShown(next);
      if (next !== target) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return shown;
}

export function ProgressBar({ percent, step, status = 'running', label }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const shown = useSmoothPercent(clamped);
  const style: ProgressStyle = { '--tk-progress-value': shown / 100 };

  return (
    <div className="tk-progress" data-status={status}>
      <span className="tk-progress__step">{step}</span>
      <div className="tk-progress__row">
        <div
          className="tk-progress__track"
          role="progressbar"
          aria-valuenow={Math.round(clamped)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div className="tk-progress__fill" style={style} />
        </div>
        <span className="tk-progress__percent">{oneDecimal.format(shown)}%</span>
      </div>
    </div>
  );
}
