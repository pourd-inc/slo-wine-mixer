/* SLO Wine Mixer · shared behavior
   1. Mobile nav
   2. Date embargo: countdown until REVEAL_AT, then swap in the date + venue + ticket slot
   3. Email capture (Supabase signups table, insert-only publishable key)
   4. Copy-email buttons */

(function () {
  // ---- 1. Mobile nav -------------------------------------------------------
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---- 2. Date embargo -----------------------------------------------------
  // The Year 2 date is announced Monday, October 12, 2026 at 9:00 AM Pacific.
  // Before that: countdown. After: the date, venue and ticket slot appear, and
  // every element marked data-after-reveal shows while data-before-reveal hides.
  // To move the announcement, change this one line.
  var REVEAL_AT = new Date('2026-10-12T09:00:00-07:00').getTime();

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // The date string itself is not written in the HTML, so a view-source or a
  // search crawler before October 12 does not find it. Decoded only on reveal.
  var FILLS = { date: 'U2F0dXJkYXksIEFwcmlsIDMsIDIwMjc=' };

  function applyReveal(revealed) {
    document.querySelectorAll('[data-before-reveal]').forEach(function (el) { el.hidden = revealed; });
    document.querySelectorAll('[data-after-reveal]').forEach(function (el) { el.hidden = !revealed; });
    if (revealed) {
      document.querySelectorAll('[data-fill]').forEach(function (el) {
        var key = el.getAttribute('data-fill');
        if (FILLS[key]) { try { el.textContent = atob(FILLS[key]); } catch (e) { /* leave empty */ } }
      });
    }
  }

  function tick() {
    var now = Date.now();
    var diff = REVEAL_AT - now;
    if (diff <= 0) {
      applyReveal(true);
      return false;
    }
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var line = document.getElementById('cd-line');
    if (line) line.textContent = d + 'd ' + pad(h) + 'h ' + pad(m) + 'm';
    return true;
  }

  applyReveal(Date.now() >= REVEAL_AT);
  if (tick()) {
    var timer = setInterval(function () { if (!tick()) clearInterval(timer); }, 30000);
  }

  // ---- 3. Email capture ----------------------------------------------------
  var SB_URL = 'https://yprdmlvgmieicvlwjeob.supabase.co';
  var SB_KEY = 'sb_publishable_PAUYQ9FDCwI85FfbjCLnFA_jhCfT1dR';

  document.querySelectorAll('form.capture').forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    var msg = form.querySelector('.msg');
    var btn = form.querySelector('button[type="submit"]');
    var source = form.getAttribute('data-source') || 'site';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = (input.value || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
        msg.textContent = 'That email looks off. Try again?';
        input.focus();
        return;
      }
      btn.disabled = true;
      msg.textContent = 'Adding you...';
      fetch(SB_URL + '/rest/v1/signups', {
        method: 'POST',
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ email: val, source: source })
      }).then(function (r) {
        if (r.status === 201) {
          msg.textContent = 'You are on the list. The date lands in your inbox October 12.';
          input.value = '';
        } else if (r.status === 409) {
          msg.textContent = 'You are already on the list. Sit tight.';
          input.value = '';
        } else {
          throw new Error('status ' + r.status);
        }
      }).catch(function () {
        msg.textContent = 'Something hiccuped. Try again in a second, or email hello@pourdhq.com.';
      }).finally(function () { btn.disabled = false; });
    });
  });

  // ---- 4. Copy email -------------------------------------------------------
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      var out = b.parentElement.querySelector('.copied');
      function done(ok) {
        if (out) out.textContent = ok ? 'Copied' : text;
        if (ok) setTimeout(function () { out.textContent = ''; }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
  });
})();
