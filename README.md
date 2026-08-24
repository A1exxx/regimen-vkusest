# REGIMEN — event landing page

One-page site for **REGIMEN**, a free five-day healthy-lifestyle and training week hosted at
**Vkus Est** cafe in **Bangkok**, on **22–26 September 2026**. Built to be sent to
international partners so they can read the programme and register in one tap.

English only. Static HTML/CSS/JS, no build step, no dependencies, no framework.
Deployed on GitHub Pages.

**Live:** https://www.regimen.cc/  (apex `regimen.cc` redirects there)
**Mirror:** https://a1exxx.github.io/regimen-vkusest/

---

## Read this before the page goes to real guests

- [ ] **There is no legal-entity block on the page, on purpose.** An earlier draft carried an
      invented company name, registration number and tax ID as visual filler; those were removed
      rather than shipped, because a fabricated registration number is the kind of thing that
      causes real trouble if anyone acts on it. If the event needs an organiser block, add the
      genuine record.
- [ ] **The four coaches are fictional.** Names, biographies and years of experience are all
      made up. Swap in the real team.
- [ ] **The programme content is a proposal, not a booking.** Times, session structure and the
      twenty-four-place cap have not been confirmed with anyone.
- [ ] **The venue address says only "Bangkok, Thailand".** That is deliberate: the district and
      postcode in an earlier draft were guesses. The page tells the reader the exact address and
      meeting point arrive on confirmation. Put the real street address in when you have it.
- [ ] **Worth knowing:** the Vkus Est listed publicly is a *Phuket* business (Chalong and
      Ko Kaeo). No Bangkok branch appears in any public source. The site says Bangkok because
      that is where you said the event runs, but double-check the venue name is right.

The phone numbers and the Instagram handle are the cafe's real published ones. The morning
sessions point at Lumphini Park, which is real and links to a working Google Maps search.

---

## Files

```
index.html              the whole page
assets/styles.css       design tokens and all styling
assets/app.js           countdown, scroll reveal, WhatsApp registration
assets/favicon.svg      tab icon
assets/og.png           1200×630 social preview
assets/img/*.webp       four photographs, each at two widths for srcset
assets/img/CREDITS.csv  photographer and licence for each one
tools/og-source.html    the HTML the OG image is rendered from
tools/build-og.ps1      re-renders assets/og.png via headless Chrome
```

## Running it locally

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`. Opening `index.html` straight from disk works too, since
nothing depends on a server.

---

## Editing content

### Dates and the countdown

The countdown targets a hard-coded timestamp in `assets/app.js`:

```js
var START = new Date('2026-09-22T07:30:00+07:00').getTime();
var END   = new Date('2026-09-26T15:00:00+07:00').getTime();
```

The `+07:00` offset is explicit, so the counter is correct from any visitor's timezone. It has
three states: counting down, "the week is running right now", and "this run has finished."

Changing the dates means editing these two lines **and** the visible dates in `index.html`:
hero date card, marquee, programme list, final call to action, footer, and the JSON-LD block at
the bottom of the file.

### Registration

There is no backend. The form composes a WhatsApp message and opens `wa.me` in a new tab, so
nothing ever reports success that did not actually happen. The number lives near the bottom of
`assets/app.js`:

```js
var WA_NUMBER = '79247381765';
```

To move to a real form service later (Formspree, Google Forms, a Telegram bot), replace the
`form.addEventListener('submit', …)` handler and keep the validation above it.

### Photographs

Four images, all from Pexels under the Pexels License, which permits commercial use without
attribution. Photographer credits are recorded in `assets/img/CREDITS.csv` anyway.

Each one ships at two widths (`name@1x.webp` and `name.webp`) behind a `srcset`, so a phone
pulls roughly 330 KB instead of 1.3 MB.

They are **not** colour-treated on disk. The red duotone is applied in CSS:

```css
.duo{ background: var(--red); isolation: isolate; }
.duo img{ mix-blend-mode: luminosity; filter: grayscale(1) contrast(1.06); }
```

`luminosity` keeps the photograph's tonal structure and takes its hue from the red underneath.
That means any replacement photo drops straight in and matches the rest of the page with no
editing. To swap one, overwrite both widths at the same paths and keep the aspect ratio.

The food photograph behind the "On the plate" section is handled differently. It carries a
`brightness(.46)` ceiling rather than only a dark overlay, because an overlay alone could not
hold contrast: a white bowl rim measured near-white straight through a 74% wash and would have
erased any light text crossing it. Capping luminance on the image itself makes the guarantee
hold for whatever photo is dropped in later.

### Social preview

Edit `tools/og-source.html`, then:

```bash
powershell -ExecutionPolicy Bypass -File tools\build-og.ps1
```

## Hosting

The site runs in two places on purpose.

**GitHub Pages** — https://a1exxx.github.io/regimen-vkusest/ — free, on a CDN, nothing to
maintain. This is the fallback and it costs nothing to leave running.

**The Contabo VPS** — 84.247.148.135, Singapore — serves the same files from
`/var/www/regimen` behind nginx. Worth knowing: **that server is paid only until roughly
15 November 2026.** If the renewal is missed the VPS copy disappears; the Pages copy does not.

### Deploying to the VPS

```bash
bash tools/deploy-vps.sh
```

Packs `index.html` + `assets`, swaps `/var/www/regimen`, then checks the result over HTTP
before reporting success. nginx needs no reload for static files.

### What is configured on the server

| Host | Serves |
|---|---|
| `regimen.cc`, `www.regimen.cc` | the site, from `/var/www/regimen` |
| `panel.regimen.cc` | reverse proxy to `127.0.0.1:8090` (Marketing Autopilot) |
| `wa.regimen.cc` | reverse proxy to `127.0.0.1:3001` (WAHA) |
| the bare IP, any unknown host | `444`, connection closed |

Configs live in `/etc/nginx/sites-available/{regimen.cc,vps-services,000-catchall}`.
gzip is on for text, assets get a 30-day cache, HTML gets `no-cache`.

The two proxied services were previously reachable only as `http://IP:8090` and
`http://IP:3001` with Basic auth over **plain HTTP**, meaning credentials travelled in
cleartext. Putting them behind nginx and issuing certificates fixes that.

> **Do not firewall ports 3001 and 8090 yet.** WAHA is configured with
> `WAHA_BASE_URL=http://84.247.148.135:3001` and refers to itself by that address. Change the
> variable to `https://wa.regimen.cc` and restart the container first, then close the ports.

### Certificates

`certbot` and its auto-renew timer are installed and enabled. Once DNS resolves, issue with:

```bash
certbot --nginx -d regimen.cc -d www.regimen.cc -d panel.regimen.cc -d wa.regimen.cc         --agree-tos -m alexandr.egorov1199@gmail.com --redirect
```

Renewal is automatic from then on.

### DNS, as it now stands at Porkbun

| Type | Host | Value |
|---|---|---|
| A | `regimen.cc` | `84.247.148.135` |
| A | `www.regimen.cc` | `84.247.148.135` |
| A | `panel.regimen.cc` | `84.247.148.135` |
| A | `wa.regimen.cc` | `84.247.148.135` |
| CNAME | `*.regimen.cc` | `pixie.porkbun.com` (Porkbun default, harmless: explicit records win) |

**The trap that cost hours here.** A freshly registered Porkbun domain ships with
`ALIAS regimen.cc -> pixie.porkbun.com`. An ALIAS and an A record cannot coexist on the same
name, so every apex A record added on top of it was silently discarded: the panel reported
"A record created", the row appeared in the table, and the nameservers kept serving the parking
address. The fix was to *edit* the ALIAS row and change its type to A, not to add another record.

Two more things about that panel, worth knowing before touching it again:

- The classic editor at `/account/dns/<domain>` is a **staging** form. "Add Record" only queues
  a row locally; nothing is written until **Submit Records** at the bottom. Its record table
  also frequently renders empty even when the zone is populated, so it is not a source of truth.
- The newer editor, reached from the DNS tag in Domain Management, does list the real records
  and has per-row edit and delete. Use that one.

Verify from outside rather than trusting either UI:

```bash
dig @curitiba.ns.porkbun.com regimen.cc A +short
```

To move the site to GitHub Pages instead, point the four names at
`185.199.108.153 / .109.153 / .110.153 / .111.153` and run `tools/switch-domain.ps1`
(it refuses to run until it can actually see those records).

---

### Moving to a custom domain

Three tags in `index.html` hard-code the public origin, because Telegram, WhatsApp and Facebook
ignore a relative `og:image` and show a blank share preview:

```html
<link rel="canonical" href="https://…/">
<meta property="og:url"   content="https://…/">
<meta property="og:image" content="https://…/assets/og.png">
```

Update all three, add a `CNAME` file containing the bare domain, point the DNS at GitHub Pages,
then tick **Enforce HTTPS** in the repository's Pages settings.

---

## Design notes

White and red as requested, executed as a Soviet sports-poster grammar. That is not decoration:
the venue's own interior trades on a late-USSR look, and measured physical training is a subject
that historically looked exactly like this.

- Paper `#F7F4EF`, ink `#16110F`, one red `#D8262A`. No second accent colour anywhere.
- Barlow Condensed for display, Barlow for body text.
- Contrast, measured against rendered pixels rather than assumed: red on paper 4.52:1,
  off-white on red 4.89:1, ink on paper 17.07:1. On the dark food section, headings hit 9.36:1
  and body text 6.31:1 against the brightest pixel the background can reach.
- `--red-on-dark` (`#FF8A78`) exists because the brand red measures 1.9:1 on that section. It is
  a lifted tonal variant used there and nowhere else.
- Motion is `transform` and `opacity` only, driven by `IntersectionObserver`. There are no
  scroll listeners. `prefers-reduced-motion` disables all of it.
- The grain layer is `position: fixed` and `pointer-events: none`, so it never repaints during
  scroll.
- Content is visible by default. The reveal animation opts *into* hiding by adding `.js-reveal`
  to `<html>` once the script confirms it can run, so a blocked or failed script degrades to a
  plain readable page instead of a blank one.

Verified at 375px and 1440px: no horizontal scroll, no element wider than the viewport, every
standalone control at least 44px tall, form errors hidden until the field is left, and a clean
console.

One cascade trap worth knowing if you edit the CSS: the section numbers (`.tenet__n`,
`.rule__n`) are `<p>` elements, so a bare `.tenet p { }` rule outranks `.tenet__n { }` on
specificity and silently repaints them body-colour. Both are scoped with `:not()` for that
reason. The same trap already bit `[hidden]` and the footer logo.
