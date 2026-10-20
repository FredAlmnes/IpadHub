import { useDrift } from "../../hooks/useDrift";
import { useNow } from "../../hooks/useNow";
import { osloClock } from "../../../shared/oslo-time";

export function NightClock() {
  const now = useNow();
  const { x, y } = useDrift("night");
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg">
      <time
        dateTime={now.toISOString()}
        className="text-display-m font-normal tabular-nums text-night"
        style={{
          lineHeight: 1,
          transform: `translate(${x}px, ${y}px)`,
          transition: "transform 50s linear",
        }}
      >
        {osloClock(now)}
      </time>
    </div>
  );
}
