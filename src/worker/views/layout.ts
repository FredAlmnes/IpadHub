import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import adminCss from "../../admin/admin.css?inline";

// Admin pages are server-rendered with the compiled Tailwind CSS inlined (no extra request).
export function page(title: string, body: HtmlEscapedString | Promise<HtmlEscapedString>) {
  return html`<!doctype html>
    <html lang="nb">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="robots" content="noindex" />
        <title>${title}</title>
        <style>
          ${raw(adminCss)}
        </style>
      </head>
      <body class="bg-bg text-text font-sans">
        <main class="mx-auto max-w-[480px] px-4 pt-12 pb-12 flex flex-col gap-6">${body}</main>
      </body>
    </html>`;
}
