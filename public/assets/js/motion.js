/* Cyber Fitness — scroll reveals, counters, marquee and header shadow.
   Runs once after the page renders; respects "reduce motion". */
(function () {
  'use strict';

  function run() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (navigator.webdriver) return; // build-time pre-render: leave content static

    // Header shadow once the page scrolls
    var header = document.querySelector('.cf-header');
    if (header) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Close the phone menu after choosing a link
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.cf-links a, .cf-actions a');
      var btn = document.querySelector('.cf-burger[aria-expanded="true"]');
      if (a && btn) btn.click();
    });

    // Tagline band becomes a marquee
    var band = document.querySelector('section[aria-label="Cyber Fitness taglines"] > div');
    if (band && !reduce) {
      var items = band.innerHTML;
      band.innerHTML = '<div class="cf-marquee-track">' + items + items + items + items + '</div>';
      band.classList.add('cf-marquee');
    }

    if (reduce || !('IntersectionObserver' in window)) return;

    // Scroll reveal
    var root = document.getElementById('root');
    var targets = [];
    var seen = new Set();
    function mark(el, delay) {
      if (!el || seen.has(el) || el.closest('.cf-header') || el.closest('footer')) return;
      seen.add(el);
      el.setAttribute('data-reveal', '');
      if (delay) el.style.setProperty('--cf-delay', delay + 'ms');
      targets.push(el);
    }
    root.querySelectorAll('section').forEach(function (sec) {
      sec.querySelectorAll('h1, h2').forEach(function (h) { mark(h, 0); });
      sec.querySelectorAll('p[style*="text-transform: uppercase"]').forEach(function (p) { mark(p, 0); });
      sec.querySelectorAll('[style*="display: grid"]').forEach(function (g) {
        if (g.closest('[data-component="Schedule"]')) return;
        if (getComputedStyle(g).overflowX === 'auto') { mark(g, 0); return; }
        Array.prototype.forEach.call(g.children, function (c, i) { mark(c, Math.min(i, 5) * 80); });
      });
      sec.querySelectorAll('[style*="column-width"] > *').forEach(function (c, i) { mark(c, (i % 4) * 70); });
      sec.querySelectorAll('[style*="clip-path"]').forEach(function (c) { mark(c, 120); });
    });
    var sched = root.querySelector('[data-component="Schedule"]');
    if (sched) mark(sched.firstElementChild, 0);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (t) { io.observe(t); });

    // Count-up for headline numbers (16+, 400+, 100%, 11 …)
    var nums = [];
    root.querySelectorAll('div, p').forEach(function (el) {
      if (el.children.length) return;
      var t = el.textContent.trim();
      var m = t.match(/^(\d{1,4})(\+|%)?$/);
      var fs = el.style.fontFamily || '';
      if (m && fs.indexOf('Archivo') !== -1 && parseInt(el.style.fontSize, 10) >= 26) nums.push({ el: el, n: +m[1], suf: m[2] || '' });
    });
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var item = nums.filter(function (x) { return x.el === en.target; })[0];
        var start = performance.now(), dur = 1200;
        (function tick(now) {
          var p = Math.min(1, (now - start) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          item.el.textContent = Math.round(item.n * e) + item.suf;
          if (p < 1) requestAnimationFrame(tick);
        })(start);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (x) { x.el.textContent = '0' + x.suf; cio.observe(x.el); });
  }

  window.cfMotion = run;
})();
