import { useNow } from "../../hooks/useNow";
import { osloClock } from "../../../shared/oslo-time";

export function Clock() {
  const now = useNow();
  return (
    <time
      dateTime={now.toISOString()}
      className="block whitespace-nowrap text-display-l font-normal tabular-nums text-text"
      style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
    >
      {osloClock(now)}
    </time>
  );
}
