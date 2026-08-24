# REGIMEN — event landing page

One-page site for **REGIMEN**, a five-day healthy-lifestyle and training week hosted at
**Vkus Est** café, Chalong, Phuket, on **22–26 September 2026**.

Static HTML/CSS/JS. No build step, no dependencies, no framework. Deployed on GitHub Pages.

---

## Files

```
index.html            the whole page
assets/styles.css     design tokens + all styling
assets/app.js         language toggle, countdown, scroll reveal, booking
assets/favicon.svg    tab icon
assets/og.png         1200×630 social preview
tools/og-source.html  the HTML the OG image is rendered from
tools/build-og.ps1    re-renders assets/og.png via headless Chrome
```

## Running it locally

Any static server works. From the repo root:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`. Opening `index.html` straight from disk also works —
nothing depends on a server.

---

## Editing content

### Text and translations

English is the default and lives directly in the markup. Russian sits next to it in a
`data-ru` attribute on the same element:

```html
<h3 data-ru="Сначала замер, потом план">Measure first, plan second</h3>
```

To change a string, edit both. There is no separate dictionary file and no build step —
`assets/app.js` swaps `textContent` when the EN/RU toggle is used, and remembers the choice
in `localStorage`.

Placeholder inputs use `data-ru-ph` on the same principle.

### Dates and the countdown

The countdown targets a hard-coded timestamp in `assets/app.js`:

```js
var START = new Date('2026-09-22T07:30:00+07:00').getTime();
var END   = new Date('2026-09-26T15:00:00+07:00').getTime();
```

The `+07:00` offset is explicit, so the counter is correct from any visitor's timezone.
It has three states: counting down, "the week is running right now", and "this run has
finished". Change the dates in these two lines, then update the visible dates in
`index.html` (hero date card, marquee, programme list, footer, and the JSON-LD block at the
bottom).

### Booking

There is no backend. The form composes a WhatsApp message and opens `wa.me` in a new tab —
nothing reports success that did not actually happen. The number lives at the top of the
booking section in `assets/app.js`:

```js
var WA_NUMBER = '79247381765';
```

To switch to a real form service later (Formspree, Google Forms, a Telegram bot), replace the
`form.addEventListener('submit', …)` handler. Keep the validation above it.

### Social preview

Edit `tools/og-source.html`, then:

```bash
powershell -ExecutionPolicy Bypass -File tools\build-og.ps1
```

---

## Before this goes to real traffic

- [ ] **Replace the organiser block in the footer.** It is filled with placeholders and is
      marked in red on the page. Company name, registration number, tax ID and street address
      are all zeros.
- [ ] **Confirm the coaches.** The four people listed are illustrative, not booked.
- [ ] **Confirm prices, capacity and the refund policy.** ฿690 / ฿2 450 / ฿4 200, 24 places,
      refunds until 18 September.
- [ ] **Confirm the menu figures.** Calorie and protein values are plausible estimates, not
      lab results.
- [ ] **Check the exact street address.** Only the district (Chalong) is confirmed from public
      sources; the Google Maps link points at the real venue.

---

## Design notes

Palette is white/red as requested, executed as a Soviet sports-poster grammar — which is what
the venue's own late-USSR interior already trades on, and what the subject (measured physical
load) historically looked like.

- Paper `#F7F4EF`, ink `#16110F`, one red `#D8262A`. No second accent colour.
- Barlow Condensed for display, Barlow for body.
- Red on paper is 4.53:1 and white on red is 4.97:1 — both clear WCAG AA for body text.
- Motion is `transform`/`opacity` only, driven by `IntersectionObserver`; there are no scroll
  listeners. `prefers-reduced-motion` disables all of it.
- The grain layer is `position: fixed` and `pointer-events: none`, so it never repaints
  during scroll.
