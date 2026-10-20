import { html } from "hono/html";
import { formatLastSeen } from "../lib/last-seen";
import { checkIcon, logOutIcon } from "./icons";
import { page } from "./layout";

const title = "text-[24px] leading-[1.2] font-semibold";
const card = "bg-surface rounded-2xl p-4 flex flex-col gap-4";
const input =
  "h-12 w-full rounded-xl bg-bg border border-hairline px-4 text-[16px] text-text box-border";
const label = "text-[16px] text-muted";
const primaryBtn =
  "h-12 w-full rounded-xl bg-accent text-black font-semibold text-[16px] border-0 cursor-pointer";
const destructiveOutline =
  "min-h-12 w-full rounded-xl border border-destructive text-destructive text-[16px] flex items-center justify-center no-underline box-border";

export type Device = { id: string; name: string; lastSeenAt: number };

export function loginPage(error?: string) {
  const msg =
    error === "no_access"
      ? "Denne Google-kontoen har ikke tilgang."
      : error === "failed"
        ? "Innloggingen mislyktes. Prøv igjen."
        : null;
  return page(
    "Logg inn · IpadHub",
    html`<h1 class="${title} m-0">IpadHub</h1>
      <p class="m-0 text-muted">Logg inn for å koble til og administrere iPader.</p>
      ${msg ? html`<p class="m-0 text-destructive" role="alert">${msg}</p>` : ""}
      <a
        href="/auth/google/start"
        class="h-12 w-full rounded-xl bg-white text-[#1f1f1f] font-semibold text-[16px] flex items-center justify-center no-underline box-border"
        >Logg inn med Google</a
      >`,
  );
}

export function errorPage() {
  return page(
    "Feil · IpadHub",
    html`<h1 class="${title} m-0">IpadHub</h1>
      <p class="m-0 text-destructive" role="alert">Noe gikk galt. Prøv igjen om litt.</p>
      <a href="/admin" class="text-muted">Tilbake</a>`,
  );
}

export function homePage(opts: {
  devices: Device[];
  now: number;
  flash: { paired?: string; error?: string; revoked?: string };
}) {
  const { devices, now, flash } = opts;
  return page(
    "IpadHub",
    html`<header class="flex items-center justify-between">
        <h1 class="${title} m-0">IpadHub</h1>
        <form method="post" action="/admin/logout" class="m-0">
          <button
            type="submit"
            class="min-h-12 bg-transparent border-0 text-text text-[16px] flex items-center gap-1 cursor-pointer"
          >
            Logg ut ${logOutIcon()}
          </button>
        </form>
      </header>
      <a href="/admin/oppsett" class="text-[16px] text-muted min-h-12 flex items-center no-underline"
        >Oppsett av iPaden</a
      >
      <section class="${card}">
        <h2 class="${title} m-0">Koble til ny iPad</h2>
        <p class="m-0 text-muted">Skriv inn koden som vises på iPaden.</p>
        ${flash.paired
          ? html`<p class="m-0 flex items-center gap-1 text-accent" role="status">
              ${checkIcon()} Koblet til: ${flash.paired}
            </p>`
          : ""}
        ${flash.error === "code"
          ? html`<p class="m-0 text-destructive" role="alert">
              Koden stemmer ikke eller er utløpt. Sjekk koden på iPaden og prøv igjen.
            </p>`
          : ""}
        ${flash.error === "server"
          ? html`<p class="m-0 text-destructive" role="alert">Noe gikk galt. Prøv igjen om litt.</p>`
          : ""}
        <form method="post" action="/admin/pair/approve" class="m-0 flex flex-col gap-4">
          <label class="flex flex-col gap-2 ${label}"
            >Kode
            <input
              class="${input} tracking-[0.2em] uppercase"
              type="text"
              name="code"
              required
              autocapitalize="characters"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              maxlength="12"
            />
          </label>
          <label class="flex flex-col gap-2 ${label}"
            >Navn på enheten
            <input class="${input}" type="text" name="name" value="Stue-iPad" required maxlength="40" />
          </label>
          <button type="submit" class="${primaryBtn}">Godkjenn iPad</button>
        </form>
      </section>
      <section class="flex flex-col gap-4">
        <h2 class="${title} m-0">Enheter</h2>
        ${flash.revoked
          ? html`<p class="m-0 text-muted" role="status">«${flash.revoked}» er trukket tilbake.</p>`
          : ""}
        ${devices.length === 0
          ? html`<div class="${card}">
              <p class="m-0 font-semibold">Ingen iPader ennå</p>
              <p class="m-0 text-muted">Når du har koblet til en iPad, dukker den opp her.</p>
            </div>`
          : devices.map(
              (d) => html`<div class="${card}">
                <div>
                  <div class="font-semibold">${d.name}</div>
                  <div class="text-muted">${formatLastSeen(d.lastSeenAt, now)}</div>
                </div>
                <a href="/admin/devices/${d.id}/revoke" class="${destructiveOutline}">Trekk tilbake</a>
              </div>`,
            )}
      </section>`,
  );
}

export function revokePage(device: { id: string; name: string }) {
  return page(
    "Trekk tilbake · IpadHub",
    html`<h1 class="${title} m-0">IpadHub</h1>
      <section class="${card}">
        <p class="m-0">
          Trekk tilbake «${device.name}»? iPaden mister tilgangen med en gang og viser paringskoden igjen.
        </p>
        <form method="post" action="/admin/devices/${device.id}/revoke" class="m-0">
          <button
            type="submit"
            class="h-12 w-full rounded-xl bg-destructive text-black font-semibold text-[16px] border-0 cursor-pointer"
          >
            Trekk tilbake
          </button>
        </form>
        <a
          href="/admin"
          class="min-h-12 w-full rounded-xl border border-muted text-muted text-[16px] flex items-center justify-center no-underline box-border"
          >Behold iPaden</a
        >
      </section>`,
  );
}

export function setupPage(steps: { title: string; text: string }[]) {
  return page(
    "Oppsett av iPaden · IpadHub",
    html`<header class="flex flex-col gap-2">
        <a href="/admin" class="text-[16px] text-muted min-h-12 flex items-center no-underline">Tilbake</a>
        <h1 class="${title} m-0">Oppsett av iPaden</h1>
      </header>
      <section class="${card}">
        <ol class="m-0 pl-6 flex flex-col gap-4">
          ${steps.map(
            (s) => html`<li>
              <div class="font-semibold">${s.title}</div>
              <div class="text-muted">${s.text}</div>
            </li>`,
          )}
        </ol>
      </section>`,
  );
}
