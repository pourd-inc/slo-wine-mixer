/* SLO Wine Mixer · shared behavior
   1. Mobile nav
   2. Date embargo: countdown until REVEAL_AT, then swap in the date + venue + ticket slot
   3. Email capture (Supabase signups table, insert-only publishable key)
   4. Copy-email buttons
   5. Lightbox (photos page)
   6. Hero slideshow (home page) */

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

  // ---- 5. Lightbox -----------------------------------------------------
  // Groups [data-lightbox] links by their group value (one per photo section).
  // No-ops entirely when a page (like the home page) has none.
  var lbLinks = document.querySelectorAll('[data-lightbox]');
  if (lbLinks.length) {
    var lbGroups = {};
    lbLinks.forEach(function (a) {
      var slug = a.getAttribute('data-lightbox');
      if (!lbGroups[slug]) {
        var section = a.closest('.photo-section');
        var h2 = section ? section.querySelector('h2') : null;
        lbGroups[slug] = { title: h2 ? h2.textContent.trim() : '', items: [] };
      }
      var img = a.querySelector('img');
      lbGroups[slug].items.push({ href: a.getAttribute('href'), alt: img ? img.getAttribute('alt') : '' });
    });

    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.hidden = true;
    lb.innerHTML =
      '<div class="lightbox-stage">' +
        '<button type="button" class="lightbox-close" aria-label="Close">&times;</button>' +
        '<button type="button" class="lightbox-prev" aria-label="Previous photo">&lsaquo;</button>' +
        '<img class="lightbox-img" alt="" />' +
        '<button type="button" class="lightbox-next" aria-label="Next photo">&rsaquo;</button>' +
        '<p class="lightbox-cap"></p>' +
      '</div>';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector('.lightbox-img');
    var lbCap = lb.querySelector('.lightbox-cap');
    var lbClose = lb.querySelector('.lightbox-close');
    var lbPrev = lb.querySelector('.lightbox-prev');
    var lbNext = lb.querySelector('.lightbox-next');

    var curSlug = null, curIndex = 0, lastFocus = null, touchStartX = null;

    function lbPreload(src) { var im = new window.Image(); im.src = src; }

    function lbRender() {
      var g = lbGroups[curSlug];
      var item = g.items[curIndex];
      lbImg.src = item.href;
      lbImg.alt = item.alt || '';
      lbCap.textContent = (curIndex + 1) + ' of ' + g.items.length + ' · ' + g.title;
      lbPreload(g.items[(curIndex - 1 + g.items.length) % g.items.length].href);
      lbPreload(g.items[(curIndex + 1) % g.items.length].href);
    }

    function lbOpen(slug, index) {
      curSlug = slug;
      curIndex = index;
      lastFocus = document.activeElement;
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      lbRender();
      lbClose.focus();
      document.addEventListener('keydown', lbOnKey);
    }

    function lbClose_() {
      lb.hidden = true;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', lbOnKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function lbStep(dir) {
      var g = lbGroups[curSlug];
      curIndex = (curIndex + dir + g.items.length) % g.items.length;
      lbRender();
    }

    function lbOnKey(e) {
      if (e.key === 'Escape') lbClose_();
      else if (e.key === 'ArrowLeft') lbStep(-1);
      else if (e.key === 'ArrowRight') lbStep(1);
    }

    lbLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var slug = a.getAttribute('data-lightbox');
        var href = a.getAttribute('href');
        var index = 0;
        lbGroups[slug].items.forEach(function (it, i) { if (it.href === href) index = i; });
        lbOpen(slug, index);
      });
    });

    lbClose.addEventListener('click', lbClose_);
    lbPrev.addEventListener('click', function () { lbStep(-1); });
    lbNext.addEventListener('click', function () { lbStep(1); });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lightbox-stage')) lbClose_();
    });
    lb.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (touchStartX === null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) lbStep(dx > 0 ? -1 : 1);
      touchStartX = null;
    }, { passive: true });
  }

  // ---- 6. Hero slideshow -------------------------------------------------
  // Slide 1 is the existing static hero-bg image (always visible, no change).
  // Extra slides carry data-slide + data-src; they lazy-load after window
  // load and crossfade in on a 6s interval. No-ops with one slide, or with
  // prefers-reduced-motion (only the first image ever shows).
  var heroSlides = document.querySelectorAll('.hero-bg');
  if (heroSlides.length > 1) {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      var extraSlides = document.querySelectorAll('.hero-bg[data-slide]');
      function loadSlides() {
        extraSlides.forEach(function (img) {
          var src = img.getAttribute('data-src');
          if (src) { img.src = src; img.removeAttribute('data-src'); }
        });
      }
      if (document.readyState === 'complete') loadSlides();
      else window.addEventListener('load', loadSlides);

      var slideOrder = Array.prototype.slice.call(heroSlides);
      var slideIndex = 0;
      setInterval(function () {
        var prev = slideOrder[slideIndex];
        slideIndex = (slideIndex + 1) % slideOrder.length;
        var next = slideOrder[slideIndex];
        if (prev.hasAttribute('data-slide')) prev.classList.remove('is-active');
        if (next.hasAttribute('data-slide')) next.classList.add('is-active');
      }, 6000);
    }
  }
})();
