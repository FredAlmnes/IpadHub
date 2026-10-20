import { useEffect, useState } from "react";

// Re-renders at each wall-clock minute boundary; re-reads the clock every tick (no +60000 drift).
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60000 - (Date.now() % 60000) + 50);
    };
    setNow(new Date());
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return now;
}
