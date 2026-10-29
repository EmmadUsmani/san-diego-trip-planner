// Local stand-in for the Claude Design runtime, for previewing .dc.html
// artboards in a plain browser (Playwright audits). Not published to the
// canvas: the canvas serves its own support.js.
(function () {
  class DCLogic {
    constructor(props) {
      this.props = props || {};
      this.state = this.state || {};
    }
    setState(patch, cb) {
      const next = typeof patch === 'function' ? patch(this.state, this.props) : patch;
      this.state = Object.assign({}, this.state, next);
      scheduleRender();
      if (cb) setTimeout(cb, 0);
    }
    forceUpdate() { scheduleRender(); }
    renderVals() { return {}; }
  }
  window.DCLogic = DCLogic;

  let host, template, instance, pending = false;
  const errors = (window.__dcErrors = []);

  function scheduleRender() {
    if (pending) return;
    pending = true;
    Promise.resolve().then(() => { pending = false; render(); });
  }

  function literal(expr) {
    if (expr === 'true') return { ok: true, v: true };
    if (expr === 'false') return { ok: true, v: false };
    if (expr === 'null') return { ok: true, v: null };
    if (/^-?\d+(\.\d+)?$/.test(expr)) return { ok: true, v: Number(expr) };
    const m = /^(['"])(.*)\1$/.exec(expr);
    if (m) return { ok: true, v: m[2] };
    return { ok: false };
  }

  function lookup(expr, scopes) {
    expr = expr.trim();
    const lit = literal(expr);
    if (lit.ok) return lit.v;
    const parts = expr.split('.');
    for (let i = scopes.length - 1; i >= 0; i--) {
      const s = scopes[i];
      if (s && Object.prototype.hasOwnProperty.call(s, parts[0])) {
        let v = s[parts[0]];
        for (let j = 1; j < parts.length; j++) v = v == null ? undefined : v[parts[j]];
        return v;
      }
    }
    errors.push('unresolved hole: {{' + expr + '}}');
    return undefined;
  }

  const WHOLE = /^\s*\{\{([^}]+)\}\}\s*$/;
  const ANY = /\{\{([^}]+)\}\}/g;

  function interp(str, scopes) {
    const w = WHOLE.exec(str);
    if (w) return { whole: true, v: lookup(w[1], scopes) };
    return { whole: false, v: str.replace(ANY, (_, e) => { const v = lookup(e, scopes); return v == null ? '' : String(v); }) };
  }

  function renderChildren(tplParent, outParent, scopes) {
    for (const n of Array.from(tplParent.childNodes)) renderNode(n, outParent, scopes);
  }

  function renderNode(n, out, scopes) {
    if (n.nodeType === 3) {
      if (n.data.indexOf('{{') === -1) { out.appendChild(document.createTextNode(n.data)); return; }
      const r = interp(n.data, scopes);
      out.appendChild(document.createTextNode(r.v == null ? '' : String(r.v)));
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = n.localName;
    if (tag === 'helmet') return;
    if (tag === 'sc-for') {
      const list = interp(n.getAttribute('list') || '', scopes).v;
      const as = n.getAttribute('as') || 'item';
      if (!Array.isArray(list)) { errors.push('sc-for list is not an array: ' + n.getAttribute('list')); return; }
      list.forEach((item, i) => renderChildren(n, out, scopes.concat([{ [as]: item, $index: i }])));
      return;
    }
    if (tag === 'sc-if') {
      if (interp(n.getAttribute('value') || '', scopes).v) renderChildren(n, out, scopes);
      return;
    }
    if (tag === 'dc-import') {
      const ph = document.createElement('div');
      const [w, h] = (n.getAttribute('hint-size') || '100%,40px').split(',');
      ph.style.cssText = 'width:' + w + ';height:' + h + ';outline:1px dashed #c00;font:11px sans-serif;color:#c00';
      ph.textContent = 'dc-import ' + n.getAttribute('name') + ' (not rendered in local preview)';
      out.appendChild(ph);
      return;
    }
    const el = n.namespaceURI && n.namespaceURI !== 'http://www.w3.org/1999/xhtml'
      ? document.createElementNS(n.namespaceURI, n.tagName)
      : document.createElement(tag);
    for (const a of Array.from(n.attributes)) {
      let name = a.name;
      if (name.startsWith('hint-')) continue;
      const evt = /^on([a-z]+)$/i.exec(name);
      if (evt && a.value.indexOf('{{') !== -1) {
        const fn = interp(a.value, scopes).v;
        let ev = evt[1].toLowerCase();
        if (ev === 'doubleclick') ev = 'dblclick';
        if (typeof fn === 'function') el.addEventListener(ev, (e) => fn(e));
        else errors.push('handler not a function: ' + a.value);
        continue;
      }
      if (name === 'classname') name = 'class';
      if (name === 'htmlfor') name = 'for';
      const r = interp(a.value, scopes);
      if (r.whole && (r.v === false || r.v == null)) continue;
      const val = r.whole && r.v === true ? '' : String(r.v);
      if (name === 'value' && 'value' in el) el.value = val;
      if (name === 'checked' && 'checked' in el) el.checked = r.v !== false;
      try { a.namespaceURI ? el.setAttributeNS(a.namespaceURI, a.name, val) : el.setAttribute(name, val); }
      catch (e) { errors.push('bad attribute ' + name + ': ' + e.message); }
    }
    renderChildren(tag === 'template' ? n.content : n, el, scopes);
    out.appendChild(el);
  }

  function render() {
    let vals;
    try { vals = instance.renderVals() || {}; }
    catch (e) { errors.push('renderVals threw: ' + e.message); console.error(e); return; }
    const frag = document.createDocumentFragment();
    renderChildren(template, frag, [vals]);
    host.replaceChildren(frag);
  }

  function boot() {
    host = document.querySelector('x-dc');
    const script = document.querySelector('script[data-dc-script]');
    if (!host || !script) { errors.push('missing x-dc or data-dc-script'); return; }
    const helmet = host.querySelector('helmet');
    if (helmet) for (const c of Array.from(helmet.children)) document.head.appendChild(c.cloneNode(true));
    template = host.cloneNode(true);
    let propsDecl = {};
    try { propsDecl = JSON.parse(script.getAttribute('data-props') || '{}'); }
    catch (e) { errors.push('data-props is not valid JSON: ' + e.message); }
    const props = {};
    for (const k of Object.keys(propsDecl)) if (k[0] !== '$' && 'default' in propsDecl[k]) props[k] = propsDecl[k].default;
    let Component;
    try { Component = new Function('DCLogic', script.textContent + '\n;return Component;')(DCLogic); }
    catch (e) { errors.push('script error: ' + e.message); console.error(e); return; }
    instance = new Component(props);
    window.__dcInstance = instance;
    render();
    if (instance.componentDidMount) try { instance.componentDidMount(); } catch (e) { errors.push('componentDidMount threw: ' + e.message); }
    document.documentElement.setAttribute('data-dc-ready', '1');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
