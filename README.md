# IpadHub

Alltid-på infoskjerm for en iPad: stor norsk klokke i dag, og senere buss, vær, kalender og e-post som krever oppfølging. Vite + React-app servert av én Hono-Worker på Cloudflare, med D1 som database.

## Krav

- Node 22+

## Kjør lokalt

```sh
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Åpne http://localhost:5173. Appen viser en paringskode (XXXX-XXXX). Godkjenn den fra terminalen:

```sh
npm run pair:approve -- --local --code XXXX-XXXX --email du@example.com
```

Etter noen sekunder bytter skjermen til klokka. Valgfritt: `--name "Stue-iPad"`. `--remote` kjører mot produksjonsdatabasen (krever wrangler-innlogging) og er ment som nødløsning for paring.

## Tester

```sh
npm test
```

## Deploy

Live på https://ipadhub.fredrik-almnes.workers.dev (workers.dev, Cloudflare gratisplan, ekstern D1 `ipadhub`).

1. Når migrasjoner endres: `npm run db:migrate:remote` først.
2. Deretter `npm run deploy` (vite build + wrangler deploy).
3. Hemmeligheter settes med `npx wrangler secret put NAVN`.
4. Pare mot skyen: `npm run pair:approve -- --remote --code <kode> --email <epost> --name <navn>`.

Når D1 `database_id` byttes ut, er lokal tilstand ny: kjør `npm run db:migrate:local` på nytt.

## Hemmeligheter

Repoet er offentlig. Hemmeligheter skal kun ligge i `.dev.vars` (ignorert av git) eller som wrangler secrets, aldri i koden.
