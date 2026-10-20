import { Component, type ReactNode } from "react";
import type { ModuleSnapshot } from "../../../shared/contract";
import { useNow } from "../../hooks/useNow";
import { formatFreshness, moduleState } from "../../lib/staleness";

function Unavailable() {
  return <div className="text-body text-muted">Utilgjengelig</div>;
}

// A render error inside one slot only blanks that slot (DISP-06).
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Unavailable /> : this.props.children;
  }
}

export function ModuleFrame(props: {
  label: string;
  module: ModuleSnapshot | undefined;
  serverTime: string | undefined;
  receivedAtLocal: number;
  children: ReactNode;
}) {
  const now = useNow(); // re-render each minute so staleness updates without new data
  const { label, module: m, serverTime, receivedAtLocal, children } = props;

  const view =
    m && serverTime
      ? moduleState({ module: m, serverTime, receivedAtLocal, nowLocal: Date.now() })
      : "not_configured";
  const freshness = formatFreshness(view, m?.fetchedAt ?? null, now);
  const stale = view === "stale";

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-hairline p-6">
      <div className="text-label text-muted">{label}</div>
      <div
        className="flex min-h-0 flex-1 items-center justify-center"
        style={{ opacity: stale ? 0.4 : 1 }}
      >
        {view === "error" ? (
          <Unavailable />
        ) : (
          <ErrorBoundary>{children}</ErrorBoundary>
        )}
      </div>
      <div className="flex items-center text-label text-muted">
        {stale && (
          <span
            className="mr-1 inline-block h-2 w-2 rounded-full"
            style={{ border: "1.5px solid currentColor", boxSizing: "border-box" }}
            aria-hidden="true"
          />
        )}
        {freshness}
      </div>
    </div>
  );
}
