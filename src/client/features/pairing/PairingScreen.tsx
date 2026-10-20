import { useEffect, useRef, useState } from "react";
import { startPairing } from "../../api";

const RETRY_DELAYS_MS = [3000, 6000, 12000, 30000];

export function PairingScreen() {
  const [code, setCode] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Held in state only for now; polling and resume come in plan 01-02.
  const [, setPollSecret] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invoke.
    if (started.current) return;
    started.current = true;

    let attempt = 0;

    const run = async () => {
      try {
        const res = await startPairing();
        setCode(res.code);
        setPollSecret(res.pollSecret);
        setFailed(false);
      } catch {
        setFailed(true);
        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]!;
        attempt += 1;
        setTimeout(run, delay);
      }
    };
    void run();
  }, []);

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center bg-bg font-sans text-text">
      <h1 className="text-heading font-semibold">Koble til denne iPaden</h1>

      <div
        className="mt-16 min-h-[96px] text-display-m font-normal uppercase leading-none tracking-[0.08em] tabular-nums"
        aria-live="polite"
      >
        {code}
      </div>

      <p className="mt-12 text-body text-muted">
        Åpne {window.location.host}/admin på mobilen og skriv inn koden.
      </p>

      <div className="absolute bottom-12 flex items-center gap-3 text-label text-muted">
        {failed ? (
          <span>Ingen kontakt med serveren. Prøver igjen …</span>
        ) : (
          <>
            <span
              className="inline-block h-2 w-2 rounded-full bg-accent"
              style={{ animation: "pairing-pulse 2s ease-in-out infinite" }}
            />
            <span>Venter på godkjenning</span>
          </>
        )}
      </div>
    </main>
  );
}
