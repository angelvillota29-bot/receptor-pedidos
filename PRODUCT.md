# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + React Router (SPA), same choice as the sibling rebuilds. Backend stays the existing PHP proxy API untouched (`api/*.php`). Work happens on branch `rediseno-react` of the real repo `angelvillota29-bot/receptor-pedidos` — same safety rule as the other two: never push to `main` or deploy to production without explicit approval.

## Users

Kitchen/counter staff at The Club Housse who need to see incoming orders in real time, print tickets, check the day's sales history, and (admin only) manage who else has access to this tool.

## Product Purpose

A standalone "order receiver" screen, separate from the customer-facing site and its own admin, that lets staff work the incoming-order queue without touching the restaurant's full admin panel. It never talks to the restaurant's data directly — it proxies through its own PHP endpoints using a server-side API key, so the browser never sees that key.

## Positioning

Purpose-built ticket queue (not a general admin panel): live orders as printable tickets, a permanent sales-history tab with CSV export, and its own independent login — it keeps working even if the site's data.json has an unrelated problem, because the fixed admin login and its own `usuarios_receptor.json` don't depend on the site at all.

## Operating Context

- Talks to The Club Housse's site (`RESTAURANTE_API_URL` + `RESTAURANTE_API_KEY` env vars) via four proxy endpoints: `proxy-orders.php` (GET live queue), `proxy-delete.php` (POST remove a ticket), `proxy-historial.php` (GET permanent sales log), `proxy-users.php` (GET the site's own `usersData`, used only as a login fallback).
- Has its OWN, separate user store for this tool specifically: `data/usuarios_receptor.json`, managed via `api/usuarios.php` (single endpoint, `accion: listar|crear|eliminar`, gated by a hardcoded `adminPassword` sent in every call body — not a real session).
- Login order: (1) hardcoded admin `angelvillota4@gmail.com` / `1234` — always works, no dependency on anything; (2) this tool's own users via `api/login.php`; (3) fallback to the site's own `usersData` via `proxy-users.php`, so a login created only on the restaurant's admin panel still works here.
- Session is just `localStorage` (`receptor_pedidos_sesion`, `{email}`) — no server session, no expiry, matches the fixed-admin-password security posture already established for this internal tool.
- Live queue polls `proxy-orders.php` every 20 seconds; no websockets.
- Printing opens a new tab with a minimal monospace ticket layout and calls `window.print()`; historial CSV export is a client-built CSV blob download.

## Capabilities and Constraints

- Pedidos tab: live queue as ticket cards (id, hora, tipo de entrega, cliente, items, total), print and delete per ticket.
- Historial tab: date-filtered table of the permanent sales log (hora, cliente, canal, pago, total), a running day total, print (browser print of the table) and CSV download.
- Usuarios tab (admin only): create/list/delete this tool's own users (not the site's).
- Must preserve the exact proxy contract and env vars (`RESTAURANTE_API_URL`, `RESTAURANTE_API_KEY`) — this is a frontend rebuild only.
- The visual identity should read as the same product family as the just-redesigned Club Housse site (same brand colors/type) since staff will recognize it as "their" tool, but this is an Operate-mode dashboard — density and scanability come first, not marketing polish.

## Brand Commitments

Inherits The Club Housse's real brand (orange/brown, Baloo 2 + Manrope) established in the sibling redesign — not a new identity, and not the full Persuade-mode treatment (no hero banners, no upsell chrome) since this is a working tool for staff, not a customer-facing page.

## Evidence on Hand

Existing implementation at `D:\Escritorio 2\Bots del restaurante\Receptor de pedidos` (`index.html`, `script.js`, `styles.css`, `api/*.php`) — functional ground truth, old look is evidence not the rendering target.

## Product Principles

1. Never touch the restaurant's own data or admin panel directly — always through the existing proxy contract.
2. Keep working even when the main site has problems: the fixed admin login and this tool's own user store must never depend on the site being up.
3. Operate-mode first: staff scanning a busy queue needs speed and clarity over decoration.
4. Stay on `rediseno-react`; never deploy to production without explicit approval.

## Accessibility & Inclusion

No specific standard mandated; keep it usable one-handed on a tablet at a counter — large tap targets on ticket actions (imprimir/eliminar), legible at a glance from a short distance.
