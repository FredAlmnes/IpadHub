import { useNow } from "../../hooks/useNow";
import { isoWeek, osloClock, osloDateLabel, osloYmd } from "../../../shared/oslo-time";

export function Clock() {
  const now = useNow();
  return (
    <div className="flex flex-col items-start" style={{ gap: 8 }}>
      <time
        dateTime={now.toISOString()}
        className="block whitespace-nowrap text-display-l font-normal tabular-nums text-text"
        style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
      >
        {osloClock(now)}
      </time>
      <div className="text-heading font-semibold text-text">{osloDateLabel(now)}</div>
      <div className="text-body text-muted">Uke {isoWeek(osloYmd(now))}</div>
    </div>
  );
}
