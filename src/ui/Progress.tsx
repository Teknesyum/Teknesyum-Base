import type { CSSProperties } from 'react';
import { useSmoothPercent, type ProgressStatus } from '../../teknesyum-ui/ilerleme/ProgressBar';
import { useI18n } from '../i18n';

type Props = {
  percent: number;
  step: string;
  status?: ProgressStatus;
  label?: string;
  smooth?: boolean;
};

type ProgressStyle = CSSProperties & { '--tk-progress-value'?: number };

export function ProgressBar({ percent, step, status = 'running', label, smooth = true }: Props) {
  const { pct } = useI18n();
  const clamped = Math.min(100, Math.max(0, percent));
  const eased = useSmoothPercent(clamped);
  const shown = smooth ? eased : clamped;
  const style: ProgressStyle = { '--tk-progress-value': shown / 100 };

  return (
    <div className="tk-progress" data-status={status}>
      <span className="tk-progress__step">{step}</span>
      <div className="tk-progress__row">
        <div className="tk-progress__track" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
          <div className="tk-progress__fill" style={style} />
        </div>
        <span className="tk-progress__percent">{pct(shown / 100)}</span>
      </div>
    </div>
  );
}
