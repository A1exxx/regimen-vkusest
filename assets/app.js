/* ============================================================
   REGIMEN — Vkus Est, Chalong Phuket
   Vanilla, no dependencies. Four concerns:
   language toggle, countdown, scroll reveal, WhatsApp booking.
   ============================================================ */
(function () {
  'use strict';

  /* ── 1. LANGUAGE ─────────────────────────────────────────
     English lives in the markup, Russian in data-ru="".
     Both strings sit side by side so a non-developer can edit
     the page without touching a dictionary file.             */

  var LANG_KEY = 'regimen.lang';
  var htmlEl = document.documentElement;
  var langButtons = document.querySelectorAll('.langsw__b');

  function applyLang(lang) {
    var toRu = lang === 'ru';

    document.querySelectorAll('[data-ru]').forEach(function (el) {
      if (!el.hasAttribute('data-en')) el.setAttribute('data-en', el.textContent.trim());
      el.textContent = toRu ? el.getAttribute('data-ru') : el.getAttribute('data-en');
    });

    document.querySelectorAll('[data-ru-ph]').forEach(function (el) {
      if (!el.hasAttribute('data-en-ph')) el.setAttribute('data-en-ph', el.placeholder);
      el.placeholder = toRu ? el.getAttribute('data-ru-ph') : el.getAttribute('data-en-ph');
    });

    htmlEl.lang = lang;

    langButtons.forEach(function (b) {
      var on = b.dataset.lang === lang;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });

    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* private mode */ }
    renderCountdown();
  }

  langButtons.forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.dataset.lang); });
  });

  /* ── 2. COUNTDOWN ────────────────────────────────────────
     First session: 22 Sep 2026, 07:30 Phuket (UTC+7).
     Fixed offset in the literal, so it is correct from any
     visitor timezone.                                        */

  var START = new Date('2026-09-22T07:30:00+07:00').getTime();
  var END   = new Date('2026-09-26T15:00:00+07:00').getTime();
  var cdEl   = document.getElementById('cdown');
  var noteEl = document.getElementById('cdownNote');
  var cdTimer = null;

  var CD_COPY = {
    en: { running: 'until the first session, 07:30 Phuket time',
          live:    'the week is running right now',
          over:    'this run has finished. Write to us about the next one' },
    ru: { running: 'до первой сессии, 07:30 по Пхукету',
          live:    'неделя идёт прямо сейчас',
          over:    'этот поток закончился — напишите про следующий' }
  };

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function setCell(key, value) {
    var el = cdEl && cdEl.querySelector('[data-cd="' + key + '"]');
    if (el) el.textContent = value;
  }

  function renderCountdown() {
    if (!cdEl || !noteEl) return;
    var copy = CD_COPY[htmlEl.lang === 'ru' ? 'ru' : 'en'];
    var now = Date.now();
    var left = START - now;

    /* Edge states matter as much as the happy path. */
    if (left <= 0) {
      cdEl.classList.add('is-done');
      cdEl.innerHTML = '';
      noteEl.textContent = now <= END ? copy.live : copy.over;
      if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
      return;
    }

    var s = Math.floor(left / 1000);
    setCell('d', String(Math.floor(s / 86400)));
    setCell('h', pad(Math.floor(s / 3600) % 24));
    setCell('m', pad(Math.floor(s / 60) % 60));
    setCell('s', pad(s % 60));
    noteEl.textContent = copy.running;
  }

  if (cdEl) {
    renderCountdown();
    cdTimer = setInterval(renderCountdown, 1000);
  }

  /* ── 3. SCROLL REVEAL ────────────────────────────────────
     IntersectionObserver only — never a scroll listener.
     Stagger comes from a CSS custom property, not from JS
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

  /* ── 4. BOOKING → WHATSAPP ───────────────────────────────
     The page is static, so there is no server to post to.
     Instead of faking a submit, the form composes a real
     WhatsApp message. Nothing "succeeds" that did not happen. */

  var WA_NUMBER = '79247381765';
  var form   = document.getElementById('bookForm');
  var status = document.getElementById('formStatus');
  var tierSelect = document.getElementById('fTier');

  var FORM_COPY = {
    en: { opening: 'Opening WhatsApp… if nothing happens, use the number below.',
          waTitle: 'Booking for REGIMEN, 22-26 September',
          lName: 'Name', lPhone: 'Contact', lTier: 'Ticket', lNote: 'Notes' },
    ru: { opening: 'Открываем WhatsApp… если ничего не произошло — позвоните по номеру ниже.',
          waTitle: 'Запись на REGIMEN, 22-26 сентября',
          lName: 'Имя', lPhone: 'Связь', lTier: 'Билет', lNote: 'Комментарий' }
  };

  /* Tier buttons jump to the form with the right option chosen. */
  document.querySelectorAll('[data-tier]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (tierSelect) tierSelect.value = link.dataset.tier;
    });
  });

  function fieldOf(input) { return input.closest('.field'); }

  function showError(input, errId, show) {
    var err = document.getElementById(errId);
    var wrap = fieldOf(input);
    if (wrap) wrap.classList.toggle('is-bad', show);
    if (err) err.hidden = !show;
    input.setAttribute('aria-invalid', String(show));
  }

  function validName(v) { return v.trim().length >= 2; }
  function validPhone(v) { return v.trim().length >= 6; }

  if (form) {
    var nameI  = document.getElementById('fName');
    var phoneI = document.getElementById('fPhone');
    var noteI  = document.getElementById('fNote');

    /* Validate on blur, not on keystroke. */
    nameI.addEventListener('blur', function () {
      showError(nameI, 'errName', !validName(nameI.value));
    });
    phoneI.addEventListener('blur', function () {
      showError(phoneI, 'errPhone', !validPhone(phoneI.value));
    });
    [nameI, phoneI].forEach(function (i) {
      i.addEventListener('input', function () {
        if (fieldOf(i).classList.contains('is-bad')) {
          showError(i, i === nameI ? 'errName' : 'errPhone',
                    !(i === nameI ? validName : validPhone)(i.value));
        }
      });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();

      var okName  = validName(nameI.value);
      var okPhone = validPhone(phoneI.value);
      showError(nameI, 'errName', !okName);
      showError(phoneI, 'errPhone', !okPhone);

      if (!okName || !okPhone) {
        (okName ? phoneI : nameI).focus();   /* focus first invalid field */
        return;
      }

      var copy = FORM_COPY[htmlEl.lang === 'ru' ? 'ru' : 'en'];
      var tierText = tierSelect.options[tierSelect.selectedIndex].textContent.trim();

      var lines = [
        copy.waTitle,
        copy.lName + ': ' + nameI.value.trim(),
        copy.lPhone + ': ' + phoneI.value.trim(),
        copy.lTier + ': ' + tierText
      ];
      if (noteI.value.trim()) lines.push(copy.lNote + ': ' + noteI.value.trim());

      window.open(
        'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n')),
        '_blank',
        'noopener'
      );

      status.textContent = copy.opening;
      status.classList.add('is-ok');
    });
  }

  /* ── 5. BOOT ─────────────────────────────────────────────
     Restore a stored choice; otherwise stay on English, which
     is the language the markup ships in.                     */

  var stored = null;
  try { stored = localStorage.getItem(LANG_KEY); } catch (e) { /* private mode */ }
  if (stored === 'ru') applyLang('ru');
})();
