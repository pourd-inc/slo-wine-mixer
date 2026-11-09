/* SLO Wine Mixer · shared behavior
   1. Mobile nav
   2. Ticket on-sale switch (Dec 1) + My805Tix sales modal
   3. Email capture (Supabase signups table, insert-only publishable key)
   4. Copy-email buttons
   5. Lightbox (photos page)
   6. Hero slideshow (home page) + photo strip pause
   7. Sponsor inquiry form (posts to /api/sponsor-inquiry, falls back to email) */

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

  // ---- 2. Ticket on-sale switch + 805 Tix modal ---------------------------
  // Public sale (Early Bird) opens December 1, 2026. Before that, elements
  // marked data-before-onsale show; from then on, data-after-onsale shows.
  // To move the on-sale moment, change this one line.
  var ONSALE_AT = new Date('2026-12-01T00:00:00-08:00').getTime();
  var onSale = Date.now() >= ONSALE_AT;
  document.querySelectorAll('[data-before-onsale]').forEach(function (el) { el.hidden = onSale; });
  document.querySelectorAll('[data-after-onsale]').forEach(function (el) { el.hidden = !onSale; });

  // Current ticket tier, by date (Pacific). Drives the hero ticket card,
  // the mobile buy bar and the "Now" marker in the price list.
  var TIERS = [
    { key: 'early',   name: 'Early Bird',        price: '$65',  start: '2026-12-01T00:00:00-08:00', until: 'through December 31' },
    { key: 'advance', name: 'Advance Presale',   price: '$80',  start: '2027-01-01T00:00:00-08:00', until: 'through February 19' },
    { key: 'ga',      name: 'General Admission', price: '$95',  start: '2027-02-20T00:00:00-08:00', until: 'through April 2' },
    { key: 'door',    name: 'At the door',       price: '$105', start: '2027-04-03T00:00:00-07:00', until: 'April 3 only' }
  ];
  var nowMs = Date.now();
  var tier = null;
  TIERS.forEach(function (t) { if (nowMs >= new Date(t.start).getTime()) tier = t; });
  var tierPrice = tier ? tier.price : TIERS[0].price;
  var tierLabel = tier ? tier.name + ' · ' + tier.until : 'Early Bird opens December 1';
  document.querySelectorAll('[data-tier-price]').forEach(function (el) { el.textContent = tierPrice; });
  document.querySelectorAll('[data-tier-label]').forEach(function (el) { el.textContent = tierLabel; });
  if (tier) {
    var cur = document.querySelector('[data-tier="' + tier.key + '"]');
    if (cur) {
      cur.classList.add('is-current');
      var tag = document.createElement('span');
      tag.className = 'now-tag';
      tag.textContent = 'On sale now';
      var h = cur.querySelector('h3');
      if (h) h.appendChild(tag);
    }
  }

  // Mobile buy bar: appears once the main ticket button has scrolled away,
  // hides again over the footer so it never covers content at the end.
  var buyBar = document.getElementById('buyBar');
  if (buyBar && 'IntersectionObserver' in window) {
    var heroBuy = document.getElementById('heroBuy');
    var foot = document.querySelector('.foot');
    var heroVisible = !!heroBuy, footVisible = false, scrolled = false;
    var syncBar = function () {
      var show = scrolled && !heroVisible && !footVisible;
      buyBar.hidden = !show;
      document.body.classList.toggle('has-buy-bar', show);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target === heroBuy) heroVisible = en.isIntersecting;
        if (en.target === foot) footVisible = en.isIntersecting;
      });
      syncBar();
    });
    if (heroBuy) io.observe(heroBuy);
    if (foot) io.observe(foot);
    window.addEventListener('scroll', function () {
      var s = window.scrollY > window.innerHeight * 0.5;
      if (s !== scrolled) { scrolled = s; syncBar(); }
    }, { passive: true });
  }

  // Every [data-tix] button opens the My805Tix sales modal, so guests buy
  // without leaving the site. The modal script (loaded in each page's <head>)
  // is built once against a single hidden trigger; our buttons click it.
  // If the script failed to load, the buttons go to the 805 Tix page instead.
  var TIX_URL = 'https://www.my805tix.com/e/slowinemixer2/tickets';
  var tixButtons = document.querySelectorAll('[data-tix]');
  if (tixButtons.length) {
    var tixTrigger = null;
    if (window.TSModals && window.TSModals.buildModal) {
      tixTrigger = document.createElement('button');
      tixTrigger.type = 'button';
      tixTrigger.id = 'my805tix-trigger';
      tixTrigger.hidden = true;
      tixTrigger.setAttribute('aria-hidden', 'true');
      tixTrigger.tabIndex = -1;
      document.body.appendChild(tixTrigger);
      window.TSModals.buildModal({ url: TIX_URL, modalTriggerElementId: 'my805tix-trigger' });
    }
    tixButtons.forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        if (tixTrigger) tixTrigger.click();
        else window.location.href = TIX_URL;
      });
    });
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
          msg.textContent = onSale
            ? 'You are on the list. Event updates land in your inbox.'
            : 'You are on the list. We will email you when Early Bird opens December 1.';
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
        var section = a.closest('.photo-section') || a.closest('section');
        var h2 = section ? section.querySelector('h2') : null;
        lbGroups[slug] = { title: h2 ? h2.textContent.trim() : '', items: [] };
      }
      var img = a.querySelector('img');
      lbGroups[slug].items.push({ href: a.getAttribute('href'), alt: img ? img.getAttribute('alt') : '' });
    });

    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML =
      '<div class="lightbox-stage">' +
        '<button type="button" class="lightbox-close" aria-label="Close">&times;</button>' +
        '<button type="button" class="lightbox-prev" aria-label="Previous photo">&lsaquo;</button>' +
        '<img class="lightbox-img" alt="" />' +
        '<button type="button" class="lightbox-next" aria-label="Next photo">&rsaquo;</button>' +
        '<p class="lightbox-cap" aria-live="polite"></p>' +
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
      lbCap.textContent = (curIndex + 1) + ' of ' + g.items.length + (g.title ? ' · ' + g.title : '');
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
      if (e.key === 'Tab') {
        // Keep focus inside the viewer while it is open.
        var f = [lbClose, lbPrev, lbNext];
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
        return;
      }
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
      var slidePaused = false;
      var slideToggle = document.getElementById('slideToggle');
      if (slideToggle) {
        slideToggle.hidden = false;
        slideToggle.addEventListener('click', function () {
          slidePaused = !slidePaused;
          slideToggle.setAttribute('aria-pressed', slidePaused ? 'true' : 'false');
          slideToggle.textContent = slidePaused ? 'Play slideshow' : 'Pause slideshow';
        });
      }
      setInterval(function () {
        if (slidePaused || document.hidden) return;
        var prev = slideOrder[slideIndex];
        slideIndex = (slideIndex + 1) % slideOrder.length;
        var next = slideOrder[slideIndex];
        if (prev.hasAttribute('data-slide')) prev.classList.remove('is-active');
        if (next.hasAttribute('data-slide')) next.classList.add('is-active');
      }, 6000);
    }
  }

  // ---- 6b. Photo strip pause (WCAG 2.2.2) ----------------------------------
  var stripToggle = document.getElementById('stripToggle');
  if (stripToggle) {
    var band = stripToggle.closest('.strip-band');
    stripToggle.addEventListener('click', function () {
      var paused = band.classList.toggle('is-paused');
      stripToggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      stripToggle.textContent = paused ? 'Play photos' : 'Pause photos';
    });
  }

  // ---- 7. Sponsor inquiry --------------------------------------------------
  var sForm = document.getElementById('sponsorForm');
  if (sForm) {
    var sMsg = sForm.querySelector('.msg');
    var sBtn = sForm.querySelector('button[type="submit"]');
    var INBOX = 'hello@pourdhq.com';
    var mailtoFor = function (d) {
      var body = 'Name: ' + d.name + '\nBrand: ' + d.company + '\nEmail: ' + d.email +
        (d.phone ? '\nPhone: ' + d.phone : '') + '\nInterested in: ' + d.interest + '\n\n' + d.message;
      return 'mailto:' + INBOX + '?subject=' + encodeURIComponent('SLO Wine Mixer 2027 sponsorship: ' + d.company) +
        '&body=' + encodeURIComponent(body);
    };
    sForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = {};
      ['name', 'company', 'email', 'phone', 'interest', 'message', 'website'].forEach(function (k) {
        var el = sForm.elements[k];
        d[k] = el ? (el.value || '').trim() : '';
      });
      var bad = [];
      if (!d.name) bad.push('name');
      if (!d.company) bad.push('company');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) bad.push('email');
      ['name', 'company', 'email'].forEach(function (k) {
        sForm.elements[k].setAttribute('aria-invalid', bad.indexOf(k) > -1 ? 'true' : 'false');
      });
      if (bad.length) {
        sMsg.textContent = 'Add your name, brand and a valid email, then send.';
        sForm.elements[bad[0]].focus();
        return;
      }
      sBtn.disabled = true;
      sMsg.textContent = 'Sending...';
      fetch('/api/sponsor-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d)
      }).then(function (r) {
        if (!r.ok) throw new Error('status ' + r.status);
        sMsg.textContent = 'Thanks, ' + d.name.split(' ')[0] + '. We will reply within two business days with the sponsor deck.';
        sForm.reset();
      }).catch(function () {
        sMsg.textContent = 'That did not send. ';
        var a = document.createElement('a');
        a.href = mailtoFor(d);
        a.textContent = 'Email it to ' + INBOX + ' instead';
        sMsg.appendChild(a);
        sMsg.appendChild(document.createTextNode(' (your answers are filled in).'));
      }).finally(function () { sBtn.disabled = false; });
    });
  }
})();
