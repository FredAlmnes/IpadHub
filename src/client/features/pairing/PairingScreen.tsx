import { useEffect, useState } from "react";
import { pollPairing, startPairing } from "../../api";
import { CheckIcon } from "../../icons";

const RETRY_DELAYS_MS = [3000, 6000, 12000, 30000];
const POLL_INTERVAL_MS = 3000;
const STORAGE_KEY = "ipadhub.pairing";

type Stored = { code: string; pollSecret: string; expiresAt: number };

function readStored(): Stored | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Stored>;
    if (typeof v.code === "string" && typeof v.pollSecret === "string" && typeof v.expiresAt === "number") {
      return v.expiresAt > Date.now() ? (v as Stored) : null;
    }
  } catch {
    // ignore corrupt storage
  }
  return null;
}

function writeStored(v: Stored) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // storage unavailable: resume simply won't work
  }
}

function clearStored() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function PairingScreen({ onPaired }: { onPaired: () => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [approved, setApproved] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });

    const run = async () => {
      let failures = 0;
      let current: Stored | null = readStored();
      if (current) setCode(current.code);

      while (!cancelled) {
        try {
          if (!current) {
            const res = await startPairing();
            if (cancelled) return;
            current = { code: res.code, pollSecret: res.pollSecret, expiresAt: Date.now() + res.expiresIn * 1000 };
            writeStored(current);
            setCode(current.code);
            setFailed(false);
            failures = 0;
          }
          await sleep(POLL_INTERVAL_MS);
          if (cancelled) return;
          const { status } = await pollPairing(current.pollSecret);
          if (cancelled) return;
          setFailed(false);
          failures = 0;
          if (status === "approved") {
            clearStored();
            setApproved(true);
            await sleep(1500);
            if (cancelled) return;
            setFading(true);
            await sleep(600);
            if (cancelled) return;
            onPaired();
            return;
          }
          if (status === "expired" || status === "consumed") {
            // Silently swap in a new code.
            clearStored();
            current = null;
          }
        } catch {
          if (cancelled) return;
          setFailed(true);
          await sleep(RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)]!);
          failures += 1;
        }
      }
    };
    void run();

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
  }, [onPaired]);

  return (
    <main
      className="fixed inset-0 flex flex-col items-center justify-center bg-bg font-sans text-text"
      style={{ opacity: fading ? 0 : 1, transition: "opacity 600ms ease" }}
    >
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
        {approved ? (
          <>
            <CheckIcon size={24} className="text-accent" />
            <span>Koblet til</span>
          </>
        ) : failed ? (
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
