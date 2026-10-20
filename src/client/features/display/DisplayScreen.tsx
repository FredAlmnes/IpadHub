import type { UseQueryResult } from "@tanstack/react-query";
import type { Snapshot } from "../../../shared/contract";
import { Clock } from "./Clock";

// The query is consumed by modules in later plans; the clock works without it.
export function DisplayScreen(_props: { query: UseQueryResult<Snapshot, Error> }) {
  return (
    <main className="grid h-dvh w-screen grid-cols-12 gap-8 bg-bg p-12 font-sans text-text">
      <section className="col-span-5 flex flex-col justify-center">
        <Clock />
      </section>
      <section className="col-span-7" data-region="modules" />
    </main>
  );
}
