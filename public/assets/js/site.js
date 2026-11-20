/* Cyber Fitness — sends website forms to WhatsApp.
   The number is picked from the visitor's country where the form asks for it. */
(function () {
  'use strict';
  var NUMBERS = { uk: '447436491467', uae: '971568385499', pk: '923390022620' };

  function pickNumber(text) {
    var t = (text || '').toLowerCase();
    if (t.indexOf('united kingdom') !== -1 || t === 'uk' || t.indexOf('europe') !== -1) return NUMBERS.uk;
    if (t.indexOf('uae') !== -1 || t.indexOf('emirates') !== -1 || t.indexOf('saudi') !== -1 || t.indexOf('ksa') !== -1) return NUMBERS.uae;
    return NUMBERS.pk;
  }

  function clean(t) { return t.replace(/\(optional\)/i, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim(); }

  function labelFor(el) {
    if (el.id) {
      var l = document.querySelector('label[for="' + el.id + '"]');
      if (l) return clean(l.textContent);
    }
    var wrap = el.closest('label');
    if (wrap) {
      var c = wrap.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('input, select, textarea, option'), function (n) { n.remove(); });
      var t = clean(c.textContent);
      if (t) return t;
    }
    return el.getAttribute('aria-label') || el.name || el.placeholder || 'Field';
  }

  function collect(container, title) {
    var lines = [title];
    var country = '';
    var fields = container.querySelectorAll('input, select, textarea');
    Array.prototype.forEach.call(fields, function (el) {
      if (el.type === 'submit' || el.type === 'button' || el.type === 'password' || el.type === 'hidden') return;
      if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
      var value = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : el.value;
      if (!value || (el.type === 'checkbox' && value === 'on')) value = el.type === 'checkbox' ? 'Yes' : value;
      if (!value) return;
      var name = el.type === 'radio'
        ? ((el.closest('fieldset') && el.closest('fieldset').querySelector('legend')) || { textContent: 'Choice' }).textContent.trim()
        : labelFor(el);
      if (el.type === 'radio') value = labelFor(el);
      if (/country|location/i.test(name)) country = value;
      lines.push(name + ': ' + value);
    });
    return { text: lines.join('\n'), number: pickNumber(country) };
  }

  function send(container, title) {
    var msg = collect(container, title);
    window.open('https://wa.me/' + msg.number + '?text=' + encodeURIComponent(msg.text), '_blank', 'noopener');
  }

  window.cfSend = send;

  document.addEventListener('submit', function (e) {
    var form = e.target;
    e.preventDefault();
    var title = form.getAttribute('aria-label') || 'Website enquiry';
    send(form, 'Cyber Fitness website — ' + title);
    var btn = form.querySelector('[type="submit"]');
    if (btn) { btn.textContent = 'Opening WhatsApp…'; setTimeout(function () { btn.textContent = 'Sent — check WhatsApp'; }, 1200); }
  });
})();
