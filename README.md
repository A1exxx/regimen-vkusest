# REGIMEN — event landing page

One-page site for **REGIMEN**, a free five-day healthy-lifestyle and training week hosted at
**Vkus Est** cafe, Chalong, Phuket, on **22–26 September 2026**. Built to be sent to
international partners so they can read the programme and register in one tap.

English only. Static HTML/CSS/JS, no build step, no dependencies, no framework.
Deployed on GitHub Pages.

**Live:** https://a1exxx.github.io/regimen-vkusest/

---

## Read this before the page goes to real guests

- [ ] **The organiser block in the footer is invented.** Company name, registration number, tax
      ID and street address are plausible-looking stand-ins, deliberately, so the page looks
      finished. They are **not** the real company record. Replace them before this page is
      attached to anything contractual, printed, or filed.
- [ ] **The four coaches are fictional.** Names, biographies and years of experience are all
      made up. Swap in the real team.
- [ ] **The programme content is a proposal, not a booking.** Times, session structure and the
      twenty-four-place cap have not been confirmed with anyone.
- [ ] **Check the street address.** Only the district (Chalong) is confirmed from public
      sources; the Google Maps link does point at the real venue.

Everything else on the page (opening hours, phone numbers, Instagram handle, the two venues) is
taken from the cafe's own public listings.

---

## Files

```
index.html              the whole page
assets/styles.css       design tokens and all styling
assets/app.js           countdown, scroll reveal, WhatsApp registration
assets/favicon.svg      tab icon
assets/og.png           1200×630 social preview
assets/img/*.webp       the four photographs
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

They are **not** colour-treated on disk. The red duotone is applied in CSS:

```css
.duo{ background: var(--red); isolation: isolate; }
.duo img{ mix-blend-mode: luminosity; filter: grayscale(1) contrast(1.06); }
```

`luminosity` keeps the photograph's tonal structure and takes its hue from the red underneath.
That means any replacement photo drops straight in and matches the rest of the page with no
editing. To swap one, overwrite the `.webp` at the same path and keep the aspect ratio at 3:2.

### Social preview

Edit `tools/og-source.html`, then:

```bash
powershell -ExecutionPolicy Bypass -File tools\build-og.ps1
```

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
- Contrast: red on paper 4.52:1, off-white on red 4.89:1, ink on paper 17.07:1. All clear
  WCAG AA for body text.
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
