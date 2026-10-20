import { useEffect, useState } from "react";
import { dayDriftOffset, nightDriftOffset } from "../lib/drift";

// Night clock moves every 60 s, day layout every 5 min (burn-in protection).
export function useDrift(kind: "night" | "day"): { x: number; y: number } {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setStep((s) => s + 1), kind === "night" ? 60000 : 300000);
    return () => clearInterval(interval);
  }, [kind]);

  return kind === "night" ? nightDriftOffset(step) : dayDriftOffset(step);
}
