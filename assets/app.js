/* ============================================================
   REGIMEN — Vkus Est, Bangkok
   Vanilla, no dependencies. Three concerns:
   countdown, scroll reveal, WhatsApp registration.
   ============================================================ */
(function () {
  'use strict';

  var htmlEl = document.documentElement;

  /* ── 1. COUNTDOWN ────────────────────────────────────────
     First session: 22 Sep 2026, 07:30 Bangkok (UTC+7).
     The offset is explicit in the literal, so the counter is
     correct from any visitor's timezone.                     */

  var START = new Date('2026-09-22T07:30:00+07:00').getTime();
  var END   = new Date('2026-09-26T15:00:00+07:00').getTime();
  var cdEl    = document.getElementById('cdown');
  var noteEl  = document.getElementById('cdownNote');
  var cdTimer = null;

  var CD_COPY = {
    running: 'until the first session, 07:30 Bangkok time',
    live:    'the week is running right now',
    over:    'this run has finished. Write to us about the next one'
  };

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function setCell(key, value) {
    var el = cdEl && cdEl.querySelector('[data-cd="' + key + '"]');
    if (el) el.textContent = value;
  }

  function renderCountdown() {
    if (!cdEl || !noteEl) return;
    var now = Date.now();
    var left = START - now;

    /* Edge states matter as much as the happy path. */
    if (left <= 0) {
      cdEl.classList.add('is-done');
      cdEl.innerHTML = '';
      noteEl.textContent = now <= END ? CD_COPY.live : CD_COPY.over;
      if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
      return;
    }

    var s = Math.floor(left / 1000);
    setCell('d', String(Math.floor(s / 86400)));
    setCell('h', pad(Math.floor(s / 3600) % 24));
    setCell('m', pad(Math.floor(s / 60) % 60));
    setCell('s', pad(s % 60));
    noteEl.textContent = CD_COPY.running;
  }

  if (cdEl) {
    renderCountdown();
    cdTimer = setInterval(renderCountdown, 1000);
  }

  /* ── 2. SCROLL REVEAL ────────────────────────────────────
     IntersectionObserver only, never a scroll listener.
     Stagger comes from a CSS custom property rather than JS
     timers, so it stays on the compositor.                   */

  var revealables = document.querySelectorAll('.reveal');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduced && revealables.length) {
    /* Opt into hiding only now that we know we can un-hide.
       Without this class the CSS leaves everything visible, so a
       failed or blocked script degrades to a plain readable page. */
    htmlEl.classList.add('js-reveal');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    /* Index siblings so a group cascades instead of popping. */
    var groups = new Map();
    revealables.forEach(function (el) {
      var parent = el.parentElement;
      var n = groups.get(parent) || 0;
      el.style.setProperty('--i', String(Math.min(n, 5)));
      groups.set(parent, n + 1);
      io.observe(el);
    });

    /* Background and throttled tabs can hold IntersectionObserver
       callbacks indefinitely. Sweep once on load so anything already
       on screen is shown even if no callback ever arrives. */
    window.addEventListener('load', function () {
      revealables.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    });
  }

  /* ── 3. REGISTRATION → WHATSAPP ──────────────────────────
     The page is static, so there is no server to post to.
     Rather than faking a submit, the form composes a real
     WhatsApp message. Nothing reports success that did not
     actually happen.                                         */

  var WA_NUMBER = '79247381765';
  var form    = document.getElementById('bookForm');
  var status  = document.getElementById('formStatus');
  var daysSel = document.getElementById('fDays');

  var OPENING = 'Opening WhatsApp. If nothing happens, use the number below.';

  function fieldOf(input) { return input.closest('.field'); }

  function showError(input, errId, show) {
    var err  = document.getElementById(errId);
    var wrap = fieldOf(input);
    if (wrap) wrap.classList.toggle('is-bad', show);
    if (err) err.hidden = !show;
    input.setAttribute('aria-invalid', String(show));
  }

  function validName(v)  { return v.trim().length >= 2; }
  function validPhone(v) { return v.trim().length >= 6; }

  if (form) {
    var nameI  = document.getElementById('fName');
    var phoneI = document.getElementById('fPhone');
    var noteI  = document.getElementById('fNote');

    /* Validate on blur, not on every keystroke. */
    nameI.addEventListener('blur', function () {
      showError(nameI, 'errName', !validName(nameI.value));
    });
    phoneI.addEventListener('blur', function () {
      showError(phoneI, 'errPhone', !validPhone(phoneI.value));
    });
    [nameI, phoneI].forEach(function (i) {
      i.addEventListener('input', function () {
        if (fieldOf(i).classList.contains('is-bad')) {
          var ok = i === nameI ? validName(i.value) : validPhone(i.value);
          showError(i, i === nameI ? 'errName' : 'errPhone', !ok);
        }
      });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();

      var okName  = validName(nameI.value);
      var okPhone = validPhone(phoneI.value);
      showError(nameI,  'errName',  !okName);
      showError(phoneI, 'errPhone', !okPhone);

      if (!okName || !okPhone) {
        (okName ? phoneI : nameI).focus();   /* focus the first invalid field */
        return;
      }

      var lines = [
        'Registration for REGIMEN, 22-26 September',
        'Name: '    + nameI.value.trim(),
        'Contact: ' + phoneI.value.trim(),
        'Days: '    + daysSel.options[daysSel.selectedIndex].textContent.trim()
      ];
      if (noteI.value.trim()) lines.push('Notes: ' + noteI.value.trim());

      window.open(
        'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n')),
        '_blank',
        'noopener'
      );

      status.textContent = OPENING;
      status.classList.add('is-ok');
    });
  }
})();
