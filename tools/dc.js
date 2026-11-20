/* Cyber Fitness — tiny component runtime.
   Renders the page templates (holes, sc-for, sc-if, dc-import, event bindings)
   and re-renders a component when its state changes. */
(function () {
  'use strict';
  var defs = {};

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (s) {
    if (typeof s === 'function') s = s(this.state, this.props);
    this.state = Object.assign({}, this.state, s);
    if (this.__render) this.__render();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__render) this.__render(); };
  window.DCLogic = DCLogic;

  function klass(name) {
    var d = defs[name];
    if (!d) throw new Error('Unknown component ' + name);
    if (!d.K) d.K = new Function('DCLogic', d.script + '\nreturn Component;')(DCLogic);
    return d.K;
  }

  function lookup(expr, scope) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return +expr;
    if (/^'.*'$/.test(expr)) return expr.slice(1, -1);
    return expr.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, scope);
  }

  function interp(str, scope) {
    var whole = str.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/);
    if (whole) return lookup(whole[1], scope);
    return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (_, e) {
      var v = lookup(e, scope);
      return v == null ? '' : String(v);
    });
  }

  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }

  function walk(node, scope) {
    var kids = Array.prototype.slice.call(node.childNodes);
    for (var i = 0; i < kids.length; i++) {
      var ch = kids[i];
      if (ch.nodeType === 3) {
        if (ch.data.indexOf('{{') !== -1) { var t = interp(ch.data, scope); ch.data = t == null ? '' : String(t); }
        continue;
      }
      if (ch.nodeType !== 1) continue;
      var tag = ch.tagName.toLowerCase();

      if (tag === 'sc-for') {
        var list = interp(ch.getAttribute('list') || '', scope) || [];
        var as = ch.getAttribute('as') || 'item';
        var tpl = ch.innerHTML;
        var frag = document.createDocumentFragment();
        list.forEach(function (item, idx) {
          var w = document.createElement('div');
          w.innerHTML = tpl;
          var sub = Object.assign({}, scope); sub[as] = item; sub.$index = idx;
          walk(w, sub);
          while (w.firstChild) frag.appendChild(w.firstChild);
        });
        ch.parentNode.replaceChild(frag, ch);
        continue;
      }

      if (tag === 'sc-if') {
        if (interp(ch.getAttribute('value') || '', scope)) {
          walk(ch, scope);
          var f = document.createDocumentFragment();
          while (ch.firstChild) f.appendChild(ch.firstChild);
          ch.parentNode.replaceChild(f, ch);
        } else ch.parentNode.removeChild(ch);
        continue;
      }

      if (tag === 'dc-import') {
        var props = {};
        Array.prototype.forEach.call(ch.attributes, function (a) {
          if (a.name === 'name' || a.name.indexOf('hint-') === 0) return;
          props[camel(a.name)] = interp(a.value, scope);
        });
        var host = document.createElement('div');
        host.style.display = 'contents';
        host.setAttribute('data-component', ch.getAttribute('name'));
        ch.parentNode.replaceChild(host, ch);
        mount(ch.getAttribute('name'), props, host);
        continue;
      }

      var attrs = Array.prototype.slice.call(ch.attributes);
      for (var j = 0; j < attrs.length; j++) {
        var a = attrs[j];
        if (/^on[a-z]+$/i.test(a.name) && a.value.indexOf('{{') !== -1) {
          var fn = interp(a.value, scope);
          ch.removeAttribute(a.name);
          if (typeof fn === 'function') ch.addEventListener(a.name.slice(2).toLowerCase(), fn);
          continue;
        }
        if (a.value.indexOf('{{') !== -1) {
          var v = interp(a.value, scope);
          if (v === false || v == null) ch.removeAttribute(a.name);
          else ch.setAttribute(a.name, v === true ? '' : String(v));
        }
      }
      walk(ch, scope);
    }
  }

  function mount(name, props, host) {
    var K = klass(name);
    var inst = new K(props || {});
    if (!inst.state) inst.state = {};
    inst.__render = function () {
      host.innerHTML = defs[name].tpl;
      walk(host, inst.renderVals() || {});
    };
    inst.__render();
    if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
    return inst;
  }

  window.DC = {
    boot: function (components, page) {
      Object.assign(defs, components);
      var root = document.getElementById('root');
      mount(page, {}, root);
      document.documentElement.setAttribute('data-ready', '');
      if (location.hash) {
        var el = document.getElementById(location.hash.slice(1));
        if (el) setTimeout(function () { el.scrollIntoView(); }, 0);
      }
    }
  };
})();
