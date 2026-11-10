/* TEST harness for a11y-gate (M4 evidence).
 * Read-only against the app: only GET requests; no writes.
 * Writes only under test-results/a11y-gate/.
 */
const { chromium } = require('/home/miky/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = '/home/miky/Documentos/finanzasMikyGoRef'
const LIVE = !!process.env.LIVE
const OUT = path.join(ROOT, LIVE ? 'test-results/deploy' : 'test-results/a11y-gate')
const SHOTS = path.join(OUT, 'screenshots')
const WEB = path.join(ROOT, 'web')
const BASE = process.env.BASE_URL || (LIVE ? 'https://test3.mikylab.com' : 'http://localhost:5178')
const API = process.env.API_URL || (LIVE ? BASE + '/api/v1' : 'http://localhost:18082/api/v1')
const BASELINE = path.join(ROOT, 'test-results/a11y-gate/metrics-before.json')
const EXPECTED_HEAD = process.env.EXPECTED_HEAD || (LIVE ? '7030e4c' : null)
const THEME_KEY = 'abys-ui'
const SMOKE = !!process.env.SMOKE

fs.mkdirSync(SHOTS, { recursive: true })

const ROUTES = [
  { path: '/', name: 'dashboard' },
  { path: '/ingresos', name: 'ingresos' },
  { path: '/splits', name: 'splits' },
  { path: '/registrar', name: 'registrar' },
  { path: '/configuracion', name: 'configuracion' },
]
const THEMES = ['light', 'dark']
const VIEWPORTS = {
  m360: { name: 'm360', width: 360, height: 800, label: '360x800', mobile: true },
  m390: { name: 'm390', width: 390, height: 844, label: '390x844', mobile: true },
  desktop: { name: 'desktop', width: 1440, height: 900, label: '1440x900', mobile: false },
}

/* ------------------------------------------------------------------ */
/* Page library (injected before app scripts on every navigation)      */
/* ------------------------------------------------------------------ */
const PAGE_LIB = String.raw`
(function(){
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  function srgb(c){ c = clamp01(c); return c <= 0.0031308 ? 12.92*c : 1.055*Math.pow(c,1/2.4)-0.055; }
  function oklabToRgb(L,a,b,alpha){
    var l_ = L + 0.3963377774*a + 0.2158037573*b;
    var m_ = L - 0.1055613458*a - 0.0638541728*b;
    var s_ = L - 0.0894841775*a - 1.2914855480*b;
    var l = l_*l_*l_, m = m_*m_*m_, s = s_*s_*s_;
    var r = 4.0767416621*l - 3.3077115913*m + 0.2309699292*s;
    var g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s;
    var bb = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s;
    return {r: srgb(r)*255, g: srgb(g)*255, b: srgb(bb)*255, a: alpha};
  }
  function parseColor(str){
    if(!str) return null;
    str = String(str).trim();
    if(str === 'transparent') return {r:0,g:0,b:0,a:0};
    if(str === 'currentcolor' || str === 'currentColor') return null;
    if(str[0] === '#'){
      var h = str.slice(1);
      if(h.length === 3) h = h.split('').map(function(c){return c+c;}).join('');
      if(h.length === 4) h = h.split('').map(function(c){return c+c;}).join('');
      if(h.length !== 6 && h.length !== 8) return null;
      var r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
      var a = h.length === 8 ? parseInt(h.slice(6,8),16)/255 : 1;
      return {r:r,g:g,b:b,a:a};
    }
    var m = str.match(/^rgba?\(([^)]+)\)$/i);
    if(m){
      var p = m[1].split(/[,\s\/]+/).filter(Boolean);
      if(p.length < 3) return null;
      var r2 = parseFloat(p[0]), g2 = parseFloat(p[1]), b2 = parseFloat(p[2]);
      var a2 = p.length > 3 ? parseFloat(p[3]) : 1;
      if(p[0].indexOf('%') >= 0) r2 = r2*255/100;
      if(p[1].indexOf('%') >= 0) g2 = g2*255/100;
      if(p[2].indexOf('%') >= 0) b2 = b2*255/100;
      return {r:r2,g:g2,b:b2,a:isNaN(a2)?1:a2};
    }
    var om = str.match(/^oklab\(([^)]+)\)$/i);
    if(om){
      var op = om[1].split(/[,\s\/]+/).filter(Boolean);
      if(op.length < 3) return null;
      var L = parseFloat(op[0]); var aa = parseFloat(op[1]); var bb = parseFloat(op[2]);
      var oa = op.length > 3 ? parseFloat(op[3]) : 1;
      if(op[0].indexOf('%') >= 0) L = L/100;
      if(op[1].indexOf('%') >= 0) aa = aa*0.4/100;
      if(op[2].indexOf('%') >= 0) bb = bb*0.4/100;
      return oklabToRgb(L, aa, bb, isNaN(oa)?1:oa);
    }
    var cm = str.match(/^oklch\(([^)]+)\)$/i);
    if(cm){
      var cp = cm[1].split(/[,\s\/]+/).filter(Boolean);
      if(cp.length < 3) return null;
      var L2 = parseFloat(cp[0]); var C2 = parseFloat(cp[1]); var H2 = parseFloat(cp[2]);
      var ca = cp.length > 3 ? parseFloat(cp[3]) : 1;
      if(cp[0].indexOf('%') >= 0) L2 = L2/100;
      if(cp[1].indexOf('%') >= 0) C2 = C2*0.4/100;
      var rad = H2 * Math.PI / 180;
      return oklabToRgb(L2, C2*Math.cos(rad), C2*Math.sin(rad), isNaN(ca)?1:ca);
    }
    return null;
  }
  function composite(fg, bg){
    var a = fg.a == null ? 1 : fg.a;
    return {r: fg.r*a + bg.r*(1-a), g: fg.g*a + bg.g*(1-a), b: fg.b*a + bg.b*(1-a), a: 1};
  }
  function effBgFromChain(chain){
    var bg = {r:255,g:255,b:255,a:1};
    for(var i = chain.length - 1; i >= 0; i--) bg = composite(chain[i], bg);
    return bg;
  }
  function effBg(el){
    var chain = [];
    var n = el;
    while(n && n.nodeType === 1){
      var c = parseColor(getComputedStyle(n).backgroundColor);
      if(c && c.a > 0) chain.push(c);
      n = n.parentElement;
    }
    return effBgFromChain(chain);
  }
  function luminance(c){
    function f(v){ v = v/255; return v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }
    return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b);
  }
  function ratio(a,b){
    var l1 = luminance(a), l2 = luminance(b);
    var hi = Math.max(l1,l2), lo = Math.min(l1,l2);
    return (hi+0.05)/(lo+0.05);
  }
  function isVisible(el){
    if(!el || !el.isConnected) return false;
    var cs = getComputedStyle(el);
    if(cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if(parseFloat(cs.opacity) === 0) return false;
    if(cs.pointerEvents === 'none') return false;
    if(el.closest('[aria-hidden="true"]') || el.closest('[inert]')) return false;
    var r = el.getBoundingClientRect();
    if(r.width < 2 || r.height < 2) return false;
    return true;
  }
  function isVisibleText(el){
    if(!el || !el.isConnected) return false;
    var cs = getComputedStyle(el);
    if(cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if(parseFloat(cs.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    if(r.width < 2 || r.height < 2) return false;
    return true;
  }
  function selectorOf(el){
    if(!el || el.nodeType !== 1) return '';
    if(el.id) return '#' + CSS.escape(el.id);
    var parts = [];
    var n = el;
    while(n && n.nodeType === 1 && parts.length < 4){
      var s = n.tagName.toLowerCase();
      var slot = n.getAttribute('data-slot');
      var aria = n.getAttribute('aria-label');
      if(slot) s += '[data-slot="' + slot + '"]';
      else if(aria) s += '[aria-label="' + aria.replace(/"/g,'') + '"]';
      else if(typeof n.className === 'string'){
        var cls = n.className.split(/\s+/).filter(function(c){return c && c.indexOf(':')<0 && c.indexOf('[')<0;}).slice(0,2);
        if(cls.length) s += '.' + cls.map(function(c){return CSS.escape(c);}).join('.');
      }
      parts.unshift(s);
      n = n.parentElement;
    }
    return parts.join(' > ');
  }
  function labelOf(el){
    if(!el) return '';
    var aria = el.getAttribute('aria-label');
    if(aria) return aria.trim().slice(0,100);
    var title = el.getAttribute('title');
    if(title) return title.trim().slice(0,100);
    if(el.labels && el.labels.length){
      var t = Array.prototype.map.call(el.labels, function(l){return l.textContent;}).join(' ').trim();
      if(t) return t.slice(0,100);
    }
    return (el.textContent || '').replace(/\s+/g,' ').trim().slice(0,100);
  }
  var INTERACTIVE_SEL = [
    'a[href]','button','input:not([type="hidden"])','select','textarea',
    '[role="button"]','[role="tab"]','[role="menuitem"]','[role="menuitemcheckbox"]','[role="menuitemradio"]',
    '[role="switch"]','[role="checkbox"]','[role="radio"]','[role="option"]','[role="combobox"]',
    '[role="slider"]','[role="spinbutton"]','[contenteditable="true"]','[tabindex]:not([tabindex="-1"])'
  ].join(',');
  function interactiveElements(root){
    root = root || document.body;
    var all = Array.prototype.slice.call(root.querySelectorAll(INTERACTIVE_SEL));
    var seen = new Set();
    return all.filter(function(el){
      if(seen.has(el)) return false; seen.add(el);
      if(el.disabled) return false;
      if(el.getAttribute('aria-disabled') === 'true') return false;
      return isVisible(el);
    });
  }
  async function measureTouch(scopeSelector){
    var root = scopeSelector ? document.querySelector(scopeSelector) : document.body;
    if(!root) return {error:'scope not found: ' + scopeSelector};
    var targets = interactiveElements(root);
    var failures = [];
    var small = 0;
    for(var i=0;i<targets.length;i++){
      var el = targets[i];
      var r = el.getBoundingClientRect();
      if(r.width >= 44 && r.height >= 44) continue;
      small++;
      try { el.scrollIntoView({behavior:'instant', block:'center', inline:'center'}); } catch(e){}
      await new Promise(function(res){ requestAnimationFrame(function(){ requestAnimationFrame(res); }); });
      r = el.getBoundingClientRect();
      var cx = r.left + r.width/2, cy = r.top + r.height/2;
      var pts = [[cx-22,cy-22],[cx+22,cy-22],[cx-22,cy+22],[cx+22,cy+22]];
      var hits = [];
      var allOk = true;
      for(var j=0;j<pts.length;j++){
        var x = pts[j][0], y = pts[j][1];
        var hit = document.elementFromPoint(x,y);
        var ok = false;
        if(hit){
          if(hit === el || el.contains(hit) || hit.contains(el)) ok = true;
          else if(el.labels){
            for(var k=0;k<el.labels.length;k++){ if(el.labels[k] === hit || el.labels[k].contains(hit)) { ok = true; break; } }
          }
        }
        hits.push({x:Math.round(x), y:Math.round(y), hit: hit ? hit.tagName + (hit.id ? '#'+hit.id : '') : null, ok:ok});
        if(!ok) allOk = false;
      }
      if(!allOk){
        failures.push({selector:selectorOf(el), texto:labelOf(el), w:+r.width.toFixed(2), h:+r.height.toFixed(2), hits:hits});
      }
    }
    return {
      targets: targets.length,
      small: small,
      failures: failures,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflowX: document.body.scrollWidth - document.body.clientWidth
    };
  }
  function measureSizes(scopeSelector){
    var root = scopeSelector ? document.querySelector(scopeSelector) : document.body;
    if(!root) return [];
    // Include disabled controls: their geometry still counts for the
    // before/after desktop layout comparison.
    var all = Array.prototype.slice.call(root.querySelectorAll(INTERACTIVE_SEL));
    var seen = new Set();
    var targets = all.filter(function(el){
      if(seen.has(el)) return false; seen.add(el);
      // Disabled shadcn buttons use disabled:pointer-events-none; ignore
      // pointer-events here because geometry still matters for layout diffs.
      var cs = getComputedStyle(el);
      if(cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
      if(parseFloat(cs.opacity) === 0) return false;
      if(el.closest('[aria-hidden="true"]') || el.closest('[inert]')) return false;
      var r = el.getBoundingClientRect();
      return r.width >= 2 && r.height >= 2;
    });
    return targets.map(function(el){
      var r = el.getBoundingClientRect();
      return {selector:selectorOf(el), texto:labelOf(el), tag:el.tagName, w:+r.width.toFixed(2), h:+r.height.toFixed(2)};
    });
  }
  function collectOverflow(){
    var truncados = [];
    var all = document.body.querySelectorAll('*');
    for(var i=0;i<all.length;i++){
      var el = all[i];
      if(!isVisibleText(el)) continue;
      var cs = getComputedStyle(el);
      if(cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1){
        var txt = (el.textContent || '').replace(/\s+/g,' ').trim();
        if(txt) truncados.push({selector:selectorOf(el), texto:txt.slice(0,100), scrollWidth:el.scrollWidth, clientWidth:el.clientWidth});
      }
    }
    return {
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflowX: document.body.scrollWidth - document.body.clientWidth,
      truncados: truncados
    };
  }
  function collectTextContrast(){
    var failures = [];
    var checked = 0;
    var all = document.body.querySelectorAll('*');
    for(var i=0;i<all.length;i++){
      var el = all[i];
      if(!isVisibleText(el)) continue;
      if(el.closest('[aria-hidden="true"]') || el.closest('[inert]')) continue;
      if(el.disabled) continue;
      var hasText = false;
      for(var c=el.firstChild;c;c=c.nextSibling){ if(c.nodeType === 3 && c.textContent.trim().length > 0){ hasText = true; break; } }
      if(!hasText) continue;
      var cs = getComputedStyle(el);
      var fg = parseColor(cs.color);
      if(!fg || fg.a === 0) continue;
      var bg = effBg(el);
      var fgComp = composite(fg, bg);
      var rr = ratio(fgComp, bg);
      var fs = parseFloat(cs.fontSize) || 16;
      var fw = parseInt(cs.fontWeight, 10) || 400;
      var large = fs >= 24 || (fs >= 18.66 && fw >= 700);
      var need = large ? 3 : 4.5;
      checked++;
      if(rr < need){
        var txt = (el.textContent||'').replace(/\s+/g,' ').trim().slice(0,100);
        var category = 'other';
        if(el.closest('.react-calendar__month-view__days__day--neighboringMonth')) category = 'calendar-neighboring-month';
        else if(/^(Finanzas|Sistema)$/.test(txt) && el.closest('aside, [data-slot="dialog-content"]')) category = 'nav-section-label';
        else if(/^\d+$/.test(txt) && /bg-muted/.test(typeof el.className === 'string' ? el.className : '')) category = 'count-badge';
        failures.push({selector:selectorOf(el), texto:txt, category:category, color:cs.color, bg:'rgb('+Math.round(bg.r)+','+Math.round(bg.g)+','+Math.round(bg.b)+')', ratio:+rr.toFixed(2), fontSize:fs, fontWeight:fw, need:need});
      }
    }
    return {checked:checked, failures:failures};
  }
  function focusData(){
    var el = document.activeElement;
    if(!el) return null;
    var cs = getComputedStyle(el);
    var parent = el.parentElement;
    var chain = [];
    var n = el;
    while(n && n.nodeType === 1){ var c = parseColor(getComputedStyle(n).backgroundColor); if(c && c.a>0) chain.push(c); n = n.parentElement; }
    var pchain = [];
    n = parent;
    while(n && n.nodeType === 1){ var c2 = parseColor(getComputedStyle(n).backgroundColor); if(c2 && c2.a>0) pchain.push(c2); n = n.parentElement; }
    return {
      selector:selectorOf(el), texto:labelOf(el), tag:el.tagName, role:el.getAttribute('role'),
      slot:el.getAttribute('data-slot'), variant:el.getAttribute('data-variant'),
      focusVisible:el.matches(':focus-visible'),
      outlineStyle:cs.outlineStyle, outlineWidth:cs.outlineWidth, outlineColor:cs.outlineColor, outlineOffset:cs.outlineOffset,
      boxShadow:cs.boxShadow, borderColor:cs.borderColor, borderWidth:cs.borderWidth,
      backgroundColor:cs.backgroundColor, bgChain:chain, parentBgChain:pchain,
      ringShadow:cs.getPropertyValue('--tw-ring-shadow'), insetRingShadow:cs.getPropertyValue('--tw-inset-ring-shadow')
    };
  }
  function expectedFocusables(scopeSelector){
    var root = scopeSelector ? document.querySelector(scopeSelector) : document;
    if(!root) return [];
    var all = Array.prototype.slice.call(root.querySelectorAll(INTERACTIVE_SEL));
    var seen = new Set();
    var out = [];
    for(var i=0;i<all.length;i++){
      var el = all[i];
      if(seen.has(el)) continue; seen.add(el);
      if(el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
      var role = el.getAttribute('role');
      // Radix roving tabindex: the tablist itself is not a Tab stop; only the
      // selected tab receives tabindex=0 once the composite is focused.
      if(role === 'tablist') continue;
      if(el.getAttribute('tabindex') === '-1' && !(role === 'tab' && el.getAttribute('aria-selected') === 'true')) continue;
      var cs = getComputedStyle(el);
      if(cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
      if(el.closest('[inert]')) continue;
      var r = el.getBoundingClientRect();
      var skip = el.tagName === 'A' && el.getAttribute('href') === '#contenido';
      if(!skip && (r.width < 2 || r.height < 2)) continue;
      var interactive = !(role === 'tabpanel' || role === 'tablist' || role === 'presentation' || role === 'none');
      out.push({el:el, interactive:interactive});
    }
    out.forEach(function(o,i){ o.el.setAttribute('data-a11y-walk', String(i)); });
    var result = out.map(function(o,i){ return {i:i, interactive:o.interactive, selector:selectorOf(o.el), texto:labelOf(o.el), tag:o.el.tagName, role:o.el.getAttribute('role'), slot:o.el.getAttribute('data-slot')}; });
    window.__a11yWalkExpected = result;
    return result;
  }
  function walkActive(){
    var el = document.activeElement;
    if(!el || el === document.body || el === document.documentElement) return null;
    var idx = el.getAttribute('data-a11y-walk');
    if(idx == null && window.__a11yWalkExpected){
      var sel = selectorOf(el), txt = labelOf(el);
      for(var i=0;i<window.__a11yWalkExpected.length;i++){
        var e = window.__a11yWalkExpected[i];
        if(e.selector === sel && e.texto === txt){ idx = String(i); break; }
      }
    }
    var cs = getComputedStyle(el);
    var ring = cs.getPropertyValue('--tw-ring-shadow') || '';
    var insetRing = cs.getPropertyValue('--tw-inset-ring-shadow') || '';
    var hasRingColor = s => s.indexOf('oklch') >= 0 || s.indexOf('oklab') >= 0 || s.indexOf('rgb') >= 0 || /#[0-9a-f]{3,8}/i.test(s);
    var indicator = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1) || hasRingColor(ring) || hasRingColor(insetRing);
    return {idx: idx == null ? null : parseInt(idx,10), selector:selectorOf(el), texto:labelOf(el), tag:el.tagName, role:el.getAttribute('role'), slot:el.getAttribute('data-slot'), focusVisible:el.matches(':focus-visible'), indicator:!!indicator, insetRingShadow:insetRing};
  }
  function clearWalk(){ var els = document.querySelectorAll('[data-a11y-walk]'); for(var i=0;i<els.length;i++) els[i].removeAttribute('data-a11y-walk'); }
  function motionData(selector){
    var root = selector ? document.querySelector(selector) : document.body;
    if(!root) return null;
    var els = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
    var maxAnim = 0, maxTrans = 0, infinite = [];
    function toMs(s){
      if(!s) return 0;
      return s.split(',').map(function(x){
        x = x.trim();
        if(x.slice(-2) === 'ms') return parseFloat(x);
        if(x.slice(-1) === 's') return parseFloat(x)*1000;
        return 0;
      }).reduce(function(a,b){return Math.max(a,b);},0);
    }
    for(var i=0;i<els.length;i++){
      var cs = getComputedStyle(els[i]);
      var ad = toMs(cs.animationDuration);
      var at = toMs(cs.transitionDuration);
      if(ad > maxAnim) maxAnim = ad;
      if(at > maxTrans) maxTrans = at;
      if(cs.animationIterationCount === 'infinite' && ad > 0) infinite.push({selector:selectorOf(els[i]), name:cs.animationName, duration:cs.animationDuration});
    }
    var r = root.getBoundingClientRect();
    return {maxAnimationMs:maxAnim, maxTransitionMs:maxTrans, infinite:infinite, rect:{w:+r.width.toFixed(2),h:+r.height.toFixed(2)}, opacity:getComputedStyle(root).opacity, visibility:getComputedStyle(root).visibility};
  }
  window.__a11y = {parseColor:parseColor, composite:composite, effBg:effBg, effBgFromChain:effBgFromChain, luminance:luminance, ratio:ratio, isVisible:isVisible, selectorOf:selectorOf, labelOf:labelOf, measureTouch:measureTouch, measureSizes:measureSizes, collectOverflow:collectOverflow, collectTextContrast:collectTextContrast, focusData:focusData, expectedFocusables:expectedFocusables, walkActive:walkActive, clearWalk:clearWalk, motionData:motionData};
})();
`

/* ------------------------------------------------------------------ */
/* Node color helpers (same math as page lib)                          */
/* ------------------------------------------------------------------ */
function clamp01(x) { return Math.max(0, Math.min(1, x)) }
function srgb(c) { c = clamp01(c); return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055 }
function oklabToRgb(L, a, b, alpha) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  return { r: srgb(r) * 255, g: srgb(g) * 255, b: srgb(bb) * 255, a: alpha }
}
function parseColor(str) {
  if (!str) return null
  str = String(str).trim()
  if (str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  if (str === 'currentcolor' || str === 'currentColor') return null
  if (str[0] === '#') {
    let h = str.slice(1)
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    if (h.length === 4) h = h.split('').map(c => c + c).join('')
    if (h.length !== 6 && h.length !== 8) return null
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    return { r, g, b, a }
  }
  let m = str.match(/^rgba?\(([^)]+)\)$/i)
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean)
    if (p.length < 3) return null
    let r = parseFloat(p[0]), g = parseFloat(p[1]), b = parseFloat(p[2])
    let a = p.length > 3 ? parseFloat(p[3]) : 1
    if (p[0].includes('%')) r = r * 255 / 100
    if (p[1].includes('%')) g = g * 255 / 100
    if (p[2].includes('%')) b = b * 255 / 100
    return { r, g, b, a: isNaN(a) ? 1 : a }
  }
  m = str.match(/^oklab\(([^)]+)\)$/i)
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean)
    if (p.length < 3) return null
    let L = parseFloat(p[0]), a = parseFloat(p[1]), b = parseFloat(p[2])
    let alpha = p.length > 3 ? parseFloat(p[3]) : 1
    if (p[0].includes('%')) L = L / 100
    if (p[1].includes('%')) a = a * 0.4 / 100
    if (p[2].includes('%')) b = b * 0.4 / 100
    return oklabToRgb(L, a, b, isNaN(alpha) ? 1 : alpha)
  }
  m = str.match(/^oklch\(([^)]+)\)$/i)
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean)
    if (p.length < 3) return null
    let L = parseFloat(p[0]), C = parseFloat(p[1]), H = parseFloat(p[2])
    let alpha = p.length > 3 ? parseFloat(p[3]) : 1
    if (p[0].includes('%')) L = L / 100
    if (p[1].includes('%')) C = C * 0.4 / 100
    const rad = H * Math.PI / 180
    return oklabToRgb(L, C * Math.cos(rad), C * Math.sin(rad), isNaN(alpha) ? 1 : alpha)
  }
  return null
}
function composite(fg, bg) {
  const a = fg.a == null ? 1 : fg.a
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }
}
function effBgFromChain(chain) {
  let bg = { r: 255, g: 255, b: 255, a: 1 }
  for (let i = chain.length - 1; i >= 0; i--) bg = composite(chain[i], bg)
  return bg
}
function luminance(c) {
  const f = v => { v = v / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
}
function ratio(a, b) {
  const l1 = luminance(a), l2 = luminance(b)
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}
function splitTopLevel(s) {
  const out = []
  let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out
}
function parseShadowLayers(shadow) {
  if (!shadow || shadow === 'none') return []
  return splitTopLevel(shadow).map(layer => {
    const inset = /\binset\b/.test(layer)
    const m = layer.match(/(rgba?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|hsla?\([^)]*\)|#[0-9a-fA-F]{3,8})/)
    return { layer: layer.trim(), inset, color: m ? m[1] : null }
  })
}
function computeIndicator(data) {
  if (!data) return { pass: false, ratio: 0, best: null, indicators: [] }
  const parentBg = effBgFromChain(data.parentBgChain || [])
  const elBg = effBgFromChain(data.bgChain || [])
  const indicators = []
  if (data.outlineStyle !== 'none' && parseFloat(data.outlineWidth) >= 1) {
    const c = parseColor(data.outlineColor)
    if (c && c.a > 0.3) {
      const bg = parseFloat(data.outlineOffset) < 0 ? elBg : parentBg
      indicators.push({ type: 'outline', color: data.outlineColor, bg, ratio: ratio(composite(c, bg), bg) })
    }
  }
  for (const layer of parseShadowLayers(data.boxShadow)) {
    const c = parseColor(layer.color)
    if (!c || c.a < 0.3) continue
    const bg = layer.inset ? elBg : parentBg
    indicators.push({ type: layer.inset ? 'inset-ring' : 'ring', color: layer.color, bg, ratio: ratio(composite(c, bg), bg) })
  }
  if (indicators.length === 0 && parseFloat(data.borderWidth) >= 1) {
    const c = parseColor(data.borderColor)
    if (c && c.a > 0.3) {
      const r1 = ratio(composite(c, parentBg), parentBg)
      const r2 = ratio(composite(c, elBg), elBg)
      const bg = r1 >= r2 ? parentBg : elBg
      indicators.push({ type: 'border', color: data.borderColor, bg, ratio: Math.max(r1, r2) })
    }
  }
  const best = indicators.slice().sort((a, b) => b.ratio - a.ratio)[0] || null
  return {
    parentBg: rgbStr(parentBg), elBg: rgbStr(elBg), indicators,
    best, ratio: best ? best.ratio : 0, pass: !!best && best.ratio >= 3,
  }
}
function rgbStr(c) { return `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})` }

/* ------------------------------------------------------------------ */
/* Browser / page helpers                                              */
/* ------------------------------------------------------------------ */
async function newPage(browser, theme, vp, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: opts.reducedMotion || 'no-preference',
    deviceScaleFactor: 1,
  })
  await ctx.addInitScript(({ key, theme }) => {
    localStorage.setItem(key, JSON.stringify({ state: { sidebarColapsado: false, tema: theme }, version: 0 }))
  }, { key: THEME_KEY, theme })
  await ctx.addInitScript(PAGE_LIB)
  if (opts.instrumentScroll) {
    await ctx.addInitScript(() => {
      window.__scrollCalls = []
      const orig = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (...args) {
        try {
          window.__scrollCalls.push({
            behavior: args[0] && args[0].behavior ? args[0].behavior : null,
            block: args[0] && args[0].block ? args[0].block : null,
            tag: this.tagName, id: this.id || '',
            cls: (typeof this.className === 'string' ? this.className : '').slice(0, 80),
            t: Math.round(performance.now()),
          })
        } catch (e) {}
        return orig.apply(this, args)
      }
    })
  }
  const page = await ctx.newPage()
  const consoleMsgs = []
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push({ type: m.type(), text: m.text(), url: (m.location && m.location().url) || '' })
  })
  page.on('pageerror', e => consoleMsgs.push({ type: 'pageerror', text: e.message }))
  const failed = []
  page.on('requestfailed', r => failed.push({ url: r.url(), error: r.failure() ? r.failure().errorText : '' }))
  page.on('response', r => { if (r.status() >= 400) failed.push({ url: r.url(), status: r.status() }) })
  return { ctx, page, consoleMsgs, failed }
}

async function goto(page, route, wait = 1100) {
  await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(wait)
}

async function shot(page, name) {
  const file = path.join(SHOTS, name + '.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  return path.relative(OUT, file)
}

async function tabTo(page, matcher, max = 320) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el) return null
      return {
        id: el.id || '', tag: el.tagName, role: el.getAttribute('role'),
        slot: el.getAttribute('data-slot'), variant: el.getAttribute('data-variant'),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        aria: el.getAttribute('aria-label') || '',
      }
    })
    if (info && matcher(info)) return info
  }
  return null
}

async function measureFocusCase(browser, c, theme, vp) {
  const { ctx, page, consoleMsgs, failed } = await newPage(browser, theme, vp)
  const result = { name: c.name, theme, viewport: vp.label, pass: false }
  try {
    await goto(page, c.route, 1100)
    if (c.setup) await c.setup(page)
    let data
    if (c.special === 'select-item') {
      const found = await tabTo(page, i => i.id === c.selectId, 220)
      if (!found) throw new Error('select trigger not found: ' + c.selectId)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(250)
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(400)
      data = await page.evaluate(() => window.__a11y.focusData())
    } else if (c.synthetic) {
      await page.evaluate((variant) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.id = 'synthetic-dd-' + variant
        b.setAttribute('data-slot', 'dropdown-menu-item')
        b.setAttribute('data-variant', variant)
        b.textContent = variant === 'destructive' ? 'Eliminar' : 'Acción'
        b.className = 'relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none max-md:min-h-11 focus:bg-accent focus:inset-ring-2 focus:inset-ring-ring focus:text-accent-foreground' +
          (variant === 'destructive' ? ' data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive' : '')
        b.style.width = '200px'
        b.style.position = 'fixed'
        b.style.left = '20px'
        b.style.top = '20px'
        b.style.zIndex = '9999'
        document.body.appendChild(b)
      }, c.synthetic)
      await page.keyboard.press('Tab')
      await page.evaluate((variant) => document.getElementById('synthetic-dd-' + variant).focus(), c.synthetic)
      await page.waitForTimeout(400)
      data = await page.evaluate(() => window.__a11y.focusData())
    } else {
      const found = await tabTo(page, c.matcher, c.maxTabs || 320)
      if (!found) throw new Error('focus target not found: ' + c.name)
      await page.waitForTimeout(400)
      data = await page.evaluate(() => window.__a11y.focusData())
    }
    const indicator = computeIndicator(data)
    result.data = data
    result.indicator = indicator
    result.focusVisible = data && data.focusVisible
    result.pass = !!(data && data.focusVisible && indicator.pass)
    result.console = consoleMsgs.filter(m => !/favicon/i.test(m.text) && !/favicon/i.test(m.url || ''))
    result.failedRequests = failed.filter(f => !/favicon/i.test(f.url))
  } catch (e) {
    result.error = e.message
  } finally {
    await ctx.close()
  }
  return result
}

/* ------------------------------------------------------------------ */
/* State definitions                                                   */
/* ------------------------------------------------------------------ */
async function waitVisible(page, selector, timeout = 5000) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout })
}

const SECONDARY = [
  {
    route: '/', name: 'panel-nav', scope: '[data-slot=dialog-content]', shot: true,
    setup: async (page) => {
      await page.getByRole('button', { name: 'Abrir navegación' }).click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(450)
    },
  },
  {
    route: '/', name: 'toggle-tema', scope: null,
    setup: async (page) => {
      const before = await page.evaluate(() => document.documentElement.classList.contains('dark'))
      await page.getByRole('button', { name: /Cambiar a modo/ }).first().click()
      await page.waitForTimeout(500)
      const after = await page.evaluate(() => document.documentElement.classList.contains('dark'))
      return { themeChanged: before !== after, before, after }
    },
  },
  {
    route: '/ingresos', name: 'lightbox', scope: '[role=dialog][aria-label="Comprobante ampliado"]', shot: true,
    setup: async (page) => {
      await page.getByRole('button', { name: 'Ver comprobante' }).first().click()
      await waitVisible(page, '[role=dialog][aria-label="Comprobante ampliado"]')
      await page.waitForTimeout(300)
    },
  },
  {
    route: '/ingresos', name: 'editar-pago', scope: '[data-slot=dialog-content]', shot: true,
    setup: async (page) => {
      await page.getByRole('button', { name: 'Editar pago' }).first().click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(450)
    },
  },
  {
    route: '/ingresos', name: 'eliminar-pago', scope: '[data-slot=alert-dialog-content]',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Eliminar pago' }).first().click()
      await waitVisible(page, '[data-slot=alert-dialog-content]')
      await page.waitForTimeout(400)
    },
  },
  {
    route: '/ingresos', name: 'generar-split', scope: '[data-slot=dialog-content]',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Generar split' }).first().click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(450)
    },
  },
  {
    route: '/ingresos', name: 'select-fuente', scope: '[data-slot=select-content]', shot: true,
    setup: async (page) => {
      const found = await tabTo(page, i => i.id === 'fuente', 220)
      if (!found) throw new Error('fuente trigger not found')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      await page.keyboard.press('ArrowDown')
      await waitVisible(page, '[data-slot=select-content]')
      await page.waitForTimeout(400)
    },
  },
  {
    route: '/ingresos', name: 'select-metodo', scope: '[data-slot=select-content]',
    setup: async (page) => {
      const found = await tabTo(page, i => i.id === 'metodo', 240)
      if (!found) throw new Error('metodo trigger not found')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      await page.keyboard.press('ArrowDown')
      await waitVisible(page, '[data-slot=select-content]')
      await page.waitForTimeout(400)
    },
  },
  {
    route: '/ingresos', name: 'ver-detalle', scope: null,
    setup: async (page) => {
      await page.getByRole('button', { name: 'Ver detalle' }).first().click()
      await page.waitForTimeout(450)
    },
  },
  {
    route: '/splits', name: 'ver-datos', scope: '[data-slot=dialog-content]',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Ver datos' }).first().click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(450)
    },
  },
  {
    route: '/splits', name: 'ver-split-realizar', scope: '[data-slot=dialog-content]',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Ver split' }).first().click()
      await page.waitForTimeout(350)
      await page.getByRole('button', { name: 'Realizar' }).first().click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(450)
    },
  },
  ...['Trabajo', 'Pago', 'Quitar'].map(tool => ({
    route: '/registrar', name: 'tab-' + tool.toLowerCase(), scope: null,
    setup: async (page) => {
      await page.getByRole('button', { name: tool, exact: true }).first().click()
      await page.waitForTimeout(400)
    },
  })),
  {
    route: '/registrar', name: 'select-fuente', scope: '[data-slot=select-content]',
    setup: async (page) => {
      const found = await tabTo(page, i => i.id === 'fuente', 220)
      if (!found) throw new Error('fuente trigger not found')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)
      await page.keyboard.press('ArrowDown')
      await waitVisible(page, '[data-slot=select-content]')
      await page.waitForTimeout(400)
    },
  },
  ...['Efectivo', 'QR', 'Transacción'].map(metodo => ({
    route: '/registrar', name: 'metodo-' + metodo.toLowerCase(), scope: null,
    setup: async (page) => {
      await page.getByRole('button', { name: metodo, exact: true }).first().click()
      await page.waitForTimeout(350)
    },
  })),
  ...['Cuentas', 'Fuentes', 'Splits'].map(tab => ({
    route: '/configuracion', name: 'tab-' + tab.toLowerCase(), scope: null,
    setup: async (page) => {
      await page.getByRole('tab', { name: tab }).first().click()
      await page.waitForTimeout(450)
    },
  })),
  {
    route: '/configuracion', name: 'nueva-cuenta', scope: '[data-slot=dialog-content]',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Nueva cuenta' }).first().click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(450)
    },
  },
  {
    route: '/configuracion', name: 'editar-cuenta', scope: '[data-slot=dialog-content]',
    setup: async (page) => {
      await page.getByRole('button', { name: /^Editar / }).first().click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(450)
    },
  },
  {
    route: '/configuracion', name: 'historial-tasas', scope: '[data-slot=dialog-content]',
    setup: async (page) => {
      await page.getByRole('button', { name: /historial/i }).first().click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(450)
    },
  },
  {
    route: '/configuracion', name: 'fuente-switch', scope: '[data-slot=dialog-content]', shot: true,
    setup: async (page) => {
      await page.getByRole('tab', { name: 'Fuentes' }).first().click()
      await page.waitForTimeout(400)
      await page.getByRole('button', { name: /^Editar / }).first().click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(450)
    },
  },
  {
    route: '/configuracion', name: 'panel-nav', scope: '[data-slot=dialog-content]',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Abrir navegación' }).click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(450)
    },
  },
]

const FOCUS_CASES = [
  { name: 'Button default', route: '/ingresos', matcher: i => i.text === 'Aplicar' },
  { name: 'Button ghost', route: '/ingresos', matcher: i => i.aria === 'Editar pago' },
  {
    name: 'Button destructive', route: '/ingresos', maxTabs: 80,
    setup: async (page) => {
      await page.getByRole('button', { name: 'Eliminar pago' }).first().click()
      await waitVisible(page, '[data-slot=alert-dialog-content]')
      await page.waitForTimeout(400)
    },
    matcher: i => i.text === 'Eliminar' && i.tag === 'BUTTON',
  },
  { name: 'Input', route: '/ingresos', matcher: i => i.id === 'fi' },
  { name: 'Textarea', route: '/registrar', matcher: i => i.id === 'notas' },
  { name: 'Select trigger', route: '/ingresos', matcher: i => i.id === 'fuente' },
  { name: 'SelectItem', route: '/ingresos', special: 'select-item', selectId: 'fuente' },
  { name: 'Tabs trigger', route: '/configuracion', matcher: i => i.slot === 'tabs-trigger' },
  { name: 'Nav link', route: '/', vp: 'desktop', matcher: i => i.tag === 'A' && i.text === 'Ingresos' },
  {
    name: 'Switch', route: '/configuracion', maxTabs: 60,
    setup: async (page) => {
      await page.getByRole('tab', { name: 'Fuentes' }).first().click()
      await page.waitForTimeout(400)
      await page.getByRole('button', { name: /^Editar / }).first().click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(400)
    },
    matcher: i => i.slot === 'switch',
  },
  {
    name: 'Checkbox', route: '/configuracion', maxTabs: 60,
    setup: async (page) => {
      await page.getByRole('button', { name: /^Editar tasa de / }).first().click()
      await waitVisible(page, '[data-slot=dialog-content]')
      await page.waitForTimeout(400)
    },
    matcher: i => i.slot === 'checkbox',
  },
  { name: 'DropdownMenuItem', route: '/', synthetic: 'default' },
  { name: 'DropdownMenuItem destructive', route: '/', synthetic: 'destructive' },
]

// TabsContent is a focusable tabpanel, not one of the 13 component cases above.
// It is measured separately so AC3 keeps its 26/26 component matrix while the
// tabpanel gets explicit focus-ring evidence.
const TABPANEL_CASE = {
  name: 'TabsContent',
  route: '/configuracion',
  matcher: i => i.role === 'tabpanel',
}

/* ------------------------------------------------------------------ */
/* Tesseract chunk discovery + OCR stub                                */
/* ------------------------------------------------------------------ */
function findTesseractChunk() {
  const dir = path.join(WEB, 'dist/assets')
  const js = fs.readdirSync(dir).filter(f => f.endsWith('.js'))
  const read = f => fs.readFileSync(path.join(dir, f), 'utf8')
  // Preferred: the chunk RegistrarPage dynamically imports for OCR.
  for (const f of js) {
    const s = read(f)
    if (!s.includes('recognizing text')) continue
    const m = s.match(/import\("(\.\/[^"]+\.js)"\)/)
    if (m && js.includes(m[1].replace('./', ''))) return '/assets/' + m[1].replace('./', '')
  }
  // Fallback: the tesseract worker chunk itself.
  for (const f of js) {
    const s = read(f)
    if (s.includes('createWorker') && /export\{[^}]*as i\}/.test(s)) return '/assets/' + f
  }
  throw new Error('tesseract chunk not found in web/dist/assets')
}
const TESSERACT_CHUNK = findTesseractChunk()
const OCR_STUB = `
const recognize = async (file, lang, opts) => {
  try { if (opts && opts.logger) opts.logger({ status: 'recognizing text', progress: 1 }); } catch (e) {}
  return { data: { text: 'Comprobante de pago\\nFecha: 05/11/2026' } };
};
const i = { recognize };
export { i };
`
const PNG_BUFFER = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function runOcrFlow(browser, theme, reducedMotion) {
  const { ctx, page, consoleMsgs, failed } = await newPage(browser, theme, VIEWPORTS.m390, { reducedMotion, instrumentScroll: true })
  const result = { theme, reducedMotion }
  try {
    await page.route('**' + TESSERACT_CHUNK, route => route.fulfill({ status: 200, contentType: 'application/javascript', body: OCR_STUB }))
    await goto(page, '/registrar', 1200)
    await page.setInputFiles('input[type=file]', { name: 'comprobante.png', mimeType: 'image/png', buffer: PNG_BUFFER })
    await page.getByRole('button', { name: 'Leer comprobante' }).click()
    await page.getByRole('button', { name: 'Ver fecha en el calendario' }).waitFor({ state: 'visible', timeout: 10000 })
    await page.waitForTimeout(400)
    const callsAfterOcr = await page.evaluate(() => window.__scrollCalls.slice())
    await page.getByRole('button', { name: 'Ver fecha en el calendario' }).click()
    await page.waitForTimeout(700)
    const callsAfterButton = await page.evaluate(() => window.__scrollCalls.slice())
    const calendarCalls1 = callsAfterOcr.filter(c => c.block === 'center')
    const calendarCalls2 = callsAfterButton.filter(c => c.block === 'center')
    result.callsAfterOcr = calendarCalls1
    result.callsAfterButton = calendarCalls2
    result.ocrCallBehavior = calendarCalls1.length ? calendarCalls1[0].behavior : null
    result.buttonCallBehavior = calendarCalls2.length ? calendarCalls2[calendarCalls2.length - 1].behavior : null
    result.finalMotion = await page.evaluate(() => window.__a11y.motionData('body'))
    result.console = consoleMsgs.filter(m => !/favicon/i.test(m.text) && !/favicon/i.test(m.url || ''))
    result.failedRequests = failed.filter(f => !/favicon/i.test(f.url))
  } catch (e) {
    result.error = e.message
    result.console = consoleMsgs
    result.failedRequests = failed
  } finally {
    await ctx.close()
  }
  return result
}

async function runMotionPanel(browser, theme, kind) {
  const { ctx, page, consoleMsgs } = await newPage(browser, theme, VIEWPORTS.m390, { reducedMotion: 'reduce' })
  const result = { kind, theme }
  try {
    if (kind === 'panel') {
      await goto(page, '/', 1000)
      await page.getByRole('button', { name: 'Abrir navegación' }).click()
      await page.waitForTimeout(40)
      result.during = await page.evaluate(() => window.__a11y.motionData('[data-slot=dialog-content]'))
      await page.waitForTimeout(450)
      result.after = await page.evaluate(() => window.__a11y.motionData('[data-slot=dialog-content]'))
      result.visible = await page.locator('[data-slot=dialog-content]').isVisible()
    } else if (kind === 'dialog') {
      await goto(page, '/ingresos', 1100)
      await page.getByRole('button', { name: 'Editar pago' }).first().click()
      await page.waitForTimeout(40)
      result.during = await page.evaluate(() => window.__a11y.motionData('[data-slot=dialog-content]'))
      await page.waitForTimeout(450)
      result.after = await page.evaluate(() => window.__a11y.motionData('[data-slot=dialog-content]'))
      result.visible = await page.locator('[data-slot=dialog-content]').isVisible()
    } else if (kind === 'alert') {
      await goto(page, '/ingresos', 1100)
      await page.getByRole('button', { name: 'Eliminar pago' }).first().click()
      await page.waitForTimeout(40)
      result.during = await page.evaluate(() => window.__a11y.motionData('[data-slot=alert-dialog-content]'))
      await page.waitForTimeout(450)
      result.after = await page.evaluate(() => window.__a11y.motionData('[data-slot=alert-dialog-content]'))
      result.visible = await page.locator('[data-slot=alert-dialog-content]').isVisible()
    }
    result.console = consoleMsgs.filter(m => !/favicon/i.test(m.text) && !/favicon/i.test(m.url || ''))
  } catch (e) {
    result.error = e.message
    result.console = consoleMsgs
  } finally {
    await ctx.close()
  }
  return result
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */
function compareDesktopLayout(beforeFile, afterCases) {
  let before = []
  try { before = JSON.parse(fs.readFileSync(beforeFile, 'utf8')) } catch (e) { return { error: e.message, pass: false, cases: [] } }
  const norm = s => String(s || '').replace(/\s+/g, ' ').trim()
  const cases = afterCases.map(c => {
    const b = before.find(x => x.route === c.route && x.theme === c.theme && x.viewport === 'desktop')
    const r = {
      route: c.route, theme: c.theme,
      beforeTargets: b ? b.targets.length : null,
      afterTargets: c.sizes ? c.sizes.length : null,
      diffs: [],
      calendar: c.calendar || null,
      screenshot: c.screenshot || null,
    }
    if (!b) { r.error = 'no baseline desktop case'; r.pass = false; return r }
    const bt = b.targets || [], at = c.sizes || []
    // The baseline audit only captured a capped subset (e.g. /ingresos stops at 40)
    // and used different selector/label rules. Match each baseline target to an
    // after target by tag + text (or tag + size for unlabeled inputs) and compare
    // geometry; extra after targets are reported as info, not as layout changes.
    const used = new Set()
    let matched = 0
    for (const x of bt) {
      const candidates = at.map((y, idx) => ({ y, idx })).filter(o => !used.has(o.idx))
      let match = null
      const tx = norm(x.texto)
      if (tx) match = candidates.find(o => norm(o.y.texto) === tx)
      if (!match) match = candidates.find(o => Math.abs(o.y.w - x.w) <= 0.6 && Math.abs(o.y.h - x.h) <= 0.6)
      if (!match) { r.diffs.push({ i: 'missing', before: x }); continue }
      used.add(match.idx)
      matched++
      const dw = +(match.y.w - x.w).toFixed(2)
      const dh = +(match.y.h - x.h).toFixed(2)
      if (Math.abs(dw) > 0.6 || Math.abs(dh) > 0.6) {
        r.diffs.push({ i: 'size', before: x, after: match.y, dw, dh })
      }
    }
    r.matched = matched
    r.baselineTargets = bt.length
    r.afterTargets = at.length
    r.extraAfterTargets = at.length - used.size
    if ((b.overflowX || 0) !== 0) r.diffs.push({ i: 'beforeOverflowX', value: b.overflowX })
    if (c.overflow && (c.overflow.overflowX !== 0 || c.overflow.bodyOverflowX !== 0)) r.diffs.push({ i: 'afterOverflowX', value: c.overflow })
    if ((b.truncados || []).length) r.diffs.push({ i: 'beforeTruncados', value: b.truncados.length })
    if (c.overflow && c.overflow.truncados.length) r.diffs.push({ i: 'afterTruncados', value: c.overflow.truncados.length })
    r.pass = r.diffs.length === 0
    return r
  })
  return { cases, pass: cases.length > 0 && cases.every(c => c.pass) }
}

function countCategories(failures) {
  const out = {}
  for (const f of failures || []) out[f.category || 'other'] = (out[f.category || 'other'] || 0) + 1
  return out
}

function compactCase(c) {
  const out = {
    route: c.route,
    state: c.state || 'default',
    theme: c.theme,
    viewport: c.viewport,
    vpName: c.vpName,
    error: c.error || null,
    screenshot: c.screenshot || null,
  }
  if (c.touch) {
    out.touch = {
      targets: c.touch.targets,
      small: c.touch.small,
      failureCount: c.touch.failures.length,
      failures: c.touch.failures.slice(0, 20),
      overflowX: c.touch.overflowX,
      bodyOverflowX: c.touch.bodyOverflowX,
    }
  }
  if (c.overflow) {
    out.overflow = {
      overflowX: c.overflow.overflowX,
      bodyOverflowX: c.overflow.bodyOverflowX,
      truncadosCount: c.overflow.truncados.length,
      truncados: c.overflow.truncados.slice(0, 20),
    }
  }
  if (c.contrast) {
    out.contrast = {
      checked: c.contrast.checked,
      failureCount: c.contrast.failures.length,
      categories: countCategories(c.contrast.failures),
      failures: c.contrast.failures.slice(0, 25),
    }
  }
  out.console = {
    count: (c.console || []).length,
    messages: (c.console || []).slice(0, 20),
  }
  out.failedRequests = {
    count: (c.failedRequests || []).length,
    items: (c.failedRequests || []).slice(0, 20),
  }
  if (c.calendar) out.calendar = c.calendar
  return out
}

function compactFocus(r) {
  const ind = r.indicator || {}
  return {
    name: r.name,
    theme: r.theme,
    viewport: r.viewport,
    pass: r.pass,
    selector: r.data ? r.data.selector : null,
    tag: r.data ? r.data.tag : null,
    slot: r.data ? r.data.slot : null,
    variant: r.data ? r.data.variant : null,
    focusVisible: !!r.focusVisible,
    ratio: ind.ratio == null ? null : +ind.ratio.toFixed(2),
    best: ind.best ? { type: ind.best.type, color: ind.best.color, bg: rgbStr(ind.best.bg), ratio: +ind.best.ratio.toFixed(2) } : null,
    indicators: (ind.indicators || []).map(i => ({ type: i.type, color: i.color, bg: rgbStr(i.bg), ratio: +i.ratio.toFixed(2) })),
    error: r.error || null,
  }
}

function compactResults(results) {
  const defaultCases = results.ac7.defaultCases.map(compactCase)
  const secondaryCases = results.ac7.secondaryCases.map(compactCase)
  const allCases = [...defaultCases, ...secondaryCases]
  const contrastCases = allCases.filter(c => c.contrast && c.contrast.failureCount > 0)
  const contrastViolations = contrastCases.reduce((n, c) => n + c.contrast.failureCount, 0)
  const overflowCases = allCases.filter(c => c.overflow && (c.overflow.overflowX !== 0 || c.overflow.bodyOverflowX !== 0 || c.overflow.truncadosCount > 0))
  const consoleCases = allCases.filter(c => c.console.count > 0 || c.failedRequests.count > 0)

  const compact = {
    meta: results.meta,
    ac1: {
      pass: results.ac1.pass,
      failureCount: results.ac1.failureCount,
      failures: results.ac1.failures,
      defaultCases: results.ac1.defaultCases.map(compactCase),
      secondaryCases: results.ac1.secondaryCases.map(compactCase),
    },
    ac2: results.ac2,
    ac3: {
      pass: results.ac3.pass,
      staticCss: results.ac3.staticCss,
      failures: results.ac3.failures.map(compactFocus),
      cases: results.ac3.cases.map(compactFocus),
      tabpanel: (results.ac3.tabpanel || []).map(compactFocus),
    },
    ac4: results.ac4,
    ac5: results.ac5,
    ac6: results.ac6,
    ac7: {
      pass: results.ac7.pass,
      counts: {
        cases: allCases.length,
        contrastCases: contrastCases.length,
        contrastViolations,
        overflowCases: overflowCases.length,
        consoleCases: consoleCases.length,
      },
      overflowFailures: overflowCases,
      contrastFailures: contrastCases.map(c => ({
        route: c.route,
        state: c.state,
        theme: c.theme,
        viewport: c.viewport,
        checked: c.contrast.checked,
        failureCount: c.contrast.failureCount,
        categories: c.contrast.categories,
        failures: c.contrast.failures,
      })),
      consoleFailures: consoleCases,
      caseSummaries: allCases,
    },
    ac8: results.ac8,
    ac9: results.ac9,
    ac10: results.ac10,
    ac11: results.ac11,
    ac12: results.ac12,
  }
  return { compact, contrastCases, consoleCases }
}

async function liveBuildCheck() {
  const bust = Date.now()
  const out = {
    expectedHead: EXPECTED_HEAD,
    headSource: 'deploy handoff',
    url: BASE,
    checks: {},
  }
  try {
    const htmlRes = await fetch(BASE + '/?live=' + bust, { headers: { 'cache-control': 'no-cache' } })
    const html = await htmlRes.text()
    out.html = {
      status: htmlRes.status,
      cacheControl: htmlRes.headers.get('cache-control'),
      cfCacheStatus: htmlRes.headers.get('cf-cache-status'),
      etag: htmlRes.headers.get('etag'),
      lastModified: htmlRes.headers.get('last-modified'),
    }
    const jsPath = (html.match(/<script[^>]+src="([^"]+\.js)"/) || [])[1]
    const cssPath = (html.match(/<link[^>]+href="([^"]+\.css)"/) || [])[1]
    out.html.jsAsset = jsPath
    out.html.cssAsset = cssPath
    out.checks.htmlNoCache = /no-cache/i.test(out.html.cacheControl || '')
    out.checks.hasJsAsset = !!jsPath
    if (jsPath) {
      const jsRes = await fetch(BASE + jsPath + '?live=' + bust)
      const js = await jsRes.text()
      out.js = {
        status: jsRes.status,
        bytes: Buffer.byteLength(js),
        etag: jsRes.headers.get('etag'),
        lastModified: jsRes.headers.get('last-modified'),
      }
      const configPath = (js.match(/assets\/ConfiguracionPage-[A-Za-z0-9_-]+\.js/) || [])[0]
      out.configChunk = { path: configPath || null }
      if (configPath) {
        const cfgRes = await fetch(BASE + '/' + configPath + '?live=' + bust)
        const cfg = await cfgRes.text()
        out.configChunk.status = cfgRes.status
        out.configChunk.hasTabsContent = cfg.includes('data-slot":"tabs-content')
        out.configChunk.hasFocusVisibleInsetRing = cfg.includes('focus-visible:inset-ring-2') && cfg.includes('focus-visible:inset-ring-ring')
      }
    }
    if (cssPath) {
      const cssRes = await fetch(BASE + cssPath + '?live=' + bust)
      const css = await cssRes.text()
      out.css = { status: cssRes.status, bytes: Buffer.byteLength(css) }
      out.checks.cssHasFocusVisibleInsetRing = css.includes('.focus-visible\\:inset-ring-2:focus-visible') && css.includes('.focus-visible\\:inset-ring-ring:focus-visible')
    }
    out.checks.jsStatusOk = out.js && out.js.status === 200
    out.checks.configChunkOk = !!(out.configChunk && out.configChunk.status === 200 && out.configChunk.hasTabsContent && out.configChunk.hasFocusVisibleInsetRing)
    out.checks.cssOk = !!out.checks.cssHasFocusVisibleInsetRing
    out.pass = !!(out.checks.htmlNoCache && out.checks.hasJsAsset && out.checks.jsStatusOk && out.checks.configChunkOk && out.checks.cssOk)
  } catch (e) {
    out.error = e.message
    out.pass = false
  }
  return out
}

async function main() {
  const started = new Date().toISOString()
  const browser = await chromium.launch({ channel: 'chrome' })
  const meta = {
    started,
    baseUrl: BASE,
    apiUrl: API,
    chrome: browser.version(),
    node: process.version,
    tesseractChunk: TESSERACT_CHUNK,
    smoke: SMOKE,
  }
  const results = { meta, ac1: {}, ac2: {}, ac3: {}, ac4: {}, ac5: {}, ac6: {}, ac7: {}, ac8: {}, ac9: {}, ac10: {}, ac11: {}, ac12: {} }

  /* ---- AC1 default + AC7 default (combined) ---- */
  const defaultCases = []
  const defaultRoutes = SMOKE ? ROUTES.filter(r => r.path === '/' || r.path === '/configuracion') : ROUTES
  const defaultVps = SMOKE ? ['m390'] : ['m360', 'm390', 'desktop']
  const defaultThemes = SMOKE ? ['light'] : THEMES
  for (const vpName of defaultVps) {
    for (const theme of defaultThemes) {
      for (const route of defaultRoutes) {
        const vp = VIEWPORTS[vpName]
        const { ctx, page, consoleMsgs, failed } = await newPage(browser, theme, vp)
        const c = { route: route.path, routeName: route.name, theme, viewport: vp.label, vpName, state: 'default' }
        try {
          await goto(page, route.path, 1200)
          c.touch = vp.mobile ? await page.evaluate(() => window.__a11y.measureTouch(null)) : null
          c.sizes = await page.evaluate(() => window.__a11y.measureSizes(null))
          c.overflow = await page.evaluate(() => window.__a11y.collectOverflow())
          c.contrast = await page.evaluate(() => window.__a11y.collectTextContrast())
          if (route.path === '/registrar') {
            c.calendar = await page.evaluate(() => {
              const tiles = [...document.querySelectorAll('.react-calendar__month-view__days__day')].filter(e => e.getBoundingClientRect().width > 0)
              const rects = tiles.map(e => e.getBoundingClientRect())
              const rows = {}
              rects.forEach(r => { const k = Math.round(r.y); rows[k] = (rows[k] || 0) + 1 })
              return {
                tiles: tiles.length,
                minW: rects.length ? +Math.min(...rects.map(r => r.width)).toFixed(2) : null,
                minH: rects.length ? +Math.min(...rects.map(r => r.height)).toFixed(2) : null,
                columns: new Set(rects.slice(0, 7).map(r => Math.round(r.x))).size,
                rows: Object.values(rows),
                calendarWidth: +((document.querySelector('.react-calendar')?.getBoundingClientRect().width) || 0).toFixed(2),
              }
            })
          }
          c.console = consoleMsgs.filter(m => !/favicon/i.test(m.text) && !/favicon/i.test(m.url || ''))
          c.failedRequests = failed.filter(f => !/favicon/i.test(f.url))
          // Key evidence: 5 routes at 390x844 (light/dark) + dashboard at 1440x900 (light/dark).
          const shouldShot = !SMOKE && !LIVE && (vpName === 'm390' || (vpName === 'desktop' && route.path === '/'))
          if (shouldShot) c.screenshot = await shot(page, `route-${route.name}-${vpName}-${theme}`)
        } catch (e) {
          c.error = e.message
        } finally {
          await ctx.close()
        }
        defaultCases.push(c)
        console.log('default', route.path, vp.label, theme, c.error ? 'ERR ' + c.error : `targets=${c.touch ? c.touch.targets : '-'} failures=${c.touch ? c.touch.failures.length : '-'}`)
      }
    }
  }
  /* ---- AC1 secondary states ---- */
  const secondaryCases = []
  const secondaryList = SMOKE ? SECONDARY.filter(s => s.route === '/configuracion' && s.name === 'tab-fuentes') : SECONDARY
  const secondaryVps = SMOKE ? ['m390'] : ['m360', 'm390']
  const secondaryThemes = SMOKE ? ['light'] : THEMES
  for (const state of secondaryList) {
    for (const vpName of secondaryVps) {
      for (const theme of secondaryThemes) {
        const vp = VIEWPORTS[vpName]
        const { ctx, page, consoleMsgs, failed } = await newPage(browser, theme, vp)
        const c = { route: state.route, state: state.name, theme, viewport: vp.label, vpName }
        try {
          await goto(page, state.route, 1200)
          const setupResult = state.setup ? await state.setup(page) : null
          if (setupResult) c.setup = setupResult
          c.touch = await page.evaluate(scope => window.__a11y.measureTouch(scope), state.scope)
          c.sizes = await page.evaluate(scope => window.__a11y.measureSizes(scope), state.scope)
          c.overflow = await page.evaluate(() => window.__a11y.collectOverflow())
          c.contrast = await page.evaluate(() => window.__a11y.collectTextContrast())
          c.console = consoleMsgs.filter(m => !/favicon/i.test(m.text) && !/favicon/i.test(m.url || ''))
          c.failedRequests = failed.filter(f => !/favicon/i.test(f.url))
          // Secondary states are measured but not screenshotted; key captures are the 5 routes + dashboard desktop.
        } catch (e) {
          c.error = e.message
        } finally {
          await ctx.close()
        }
        secondaryCases.push(c)
        console.log('state', state.route, state.name, vp.label, theme, c.error ? 'ERR ' + c.error : `targets=${c.touch ? c.touch.targets : '-'} failures=${c.touch ? c.touch.failures.length : '-'}`)
      }
    }
  }
  results.ac1.defaultCases = defaultCases.filter(c => c.vpName !== 'desktop')
  results.ac1.secondaryCases = secondaryCases

  const mobileCases = [...results.ac1.defaultCases, ...secondaryCases]
  const ac1Failures = mobileCases.filter(c => c.error || (c.touch && (c.touch.error || c.touch.failures.length > 0)))
  results.ac1.pass = ac1Failures.length === 0
  results.ac1.failureCount = ac1Failures.length
  results.ac1.failures = ac1Failures.map(c => ({
    route: c.route, state: c.state || 'default', theme: c.theme, viewport: c.viewport,
    error: c.error || (c.touch && c.touch.error) || null,
    touch: c.touch ? { targets: c.touch.targets, small: c.touch.small, failures: c.touch.failures } : null,
  }))

  /* ---- AC7 no regression (overflow, truncation, text contrast, console) ---- */
  const ac7Cases = [...defaultCases, ...secondaryCases]
  const ac7Console = ac7Cases.map(c => ({
    route: c.route, state: c.state || 'default', theme: c.theme, viewport: c.viewport,
    console: c.console || [], failedRequests: c.failedRequests || [],
  }))
  const ac7Overflow = ac7Cases.filter(c => c.overflow && (c.overflow.overflowX !== 0 || c.overflow.bodyOverflowX !== 0 || c.overflow.truncados.length > 0))
  const ac7Contrast = ac7Cases.filter(c => c.contrast && c.contrast.failures.length > 0)
  const ac7ConsoleFailures = ac7Cases.filter(c => (c.console && c.console.length) || (c.failedRequests && c.failedRequests.length))
  results.ac7 = {
    pass: ac7Overflow.length === 0 && ac7Contrast.length === 0 && ac7ConsoleFailures.length === 0,
    overflowFailures: ac7Overflow.map(c => ({ route: c.route, state: c.state || 'default', theme: c.theme, viewport: c.viewport, overflow: c.overflow })),
    contrastFailures: ac7Contrast.map(c => ({ route: c.route, state: c.state || 'default', theme: c.theme, viewport: c.viewport, checked: c.contrast.checked, failures: c.contrast.failures })),
    consoleFailures: ac7ConsoleFailures.map(c => ({ route: c.route, state: c.state || 'default', theme: c.theme, viewport: c.viewport, console: c.console, failedRequests: c.failedRequests })),
    defaultCases,
    secondaryCases,
  }
  const consoleFailures = ac7Console.filter(c => (c.console && c.console.length) || (c.failedRequests && c.failedRequests.length))
  fs.writeFileSync(path.join(OUT, 'console-log.json'), JSON.stringify({
    note: 'El 404 de favicon es baseline conocido y se excluye; solo se listan casos con mensajes de consola o requests fallidos.',
    checkedCases: ac7Console.length,
    failureCases: consoleFailures.length,
    cases: consoleFailures,
  }, null, 2))

  /* ---- AC2 desktop layout comparison ---- */
  results.ac2 = compareDesktopLayout(BASELINE, defaultCases.filter(c => c.vpName === 'desktop'))

  /* ---- AC3 focus ---- */
  const focusCases = SMOKE ? FOCUS_CASES.filter(c => c.name === 'Button default') : FOCUS_CASES
  const focusResults = []
  for (const c of focusCases) {
    for (const theme of (SMOKE ? ['light'] : THEMES)) {
      const vp = VIEWPORTS[c.vp || 'm390']
      const r = await measureFocusCase(browser, c, theme, vp)
      focusResults.push(r)
      console.log('focus', c.name, theme, r.error ? 'ERR ' + r.error : `ratio=${r.indicator ? r.indicator.ratio.toFixed(2) : '-'} pass=${r.pass}`)
    }
  }
  results.ac3.cases = focusResults
  const tabpanelResults = []
  if (!SMOKE) {
    for (const theme of THEMES) {
      const r = await measureFocusCase(browser, TABPANEL_CASE, theme, VIEWPORTS.m390)
      tabpanelResults.push(r)
      console.log('focus', TABPANEL_CASE.name, theme, r.error ? 'ERR ' + r.error : `ratio=${r.indicator ? r.indicator.ratio.toFixed(2) : '-'} pass=${r.pass}`)
    }
  }
  results.ac3.tabpanel = tabpanelResults
  results.ac3.staticCss = LIVE ? await liveBuildCheck() : checkStaticCss()
  results.ac3.pass = focusResults.length > 0 && focusResults.every(r => r.pass) && tabpanelResults.every(r => r.pass)
  results.ac3.failures = [...focusResults, ...tabpanelResults].filter(r => !r.pass)

  /* ---- AC4 keyboard walks ---- */
  const walkResults = []
  if (!SMOKE) {
    for (const vpName of ['m390', 'desktop']) {
      for (const theme of THEMES) {
        for (const route of ROUTES) {
          const vp = VIEWPORTS[vpName]
          const { ctx, page } = await newPage(browser, theme, vp)
          const w = { route: route.path, theme, viewport: vp.label, vpName }
          try {
            await goto(page, route.path, 1200)
            const expected = await page.evaluate(() => window.__a11y.expectedFocusables(null))
            const actual = []
            const seen = new Set()
            const maxTabs = expected.length + 30
            for (let i = 0; i < maxTabs; i++) {
              await page.keyboard.press('Tab')
              const a = await page.evaluate(() => window.__a11y.walkActive())
              if (!a) break
              if (a.idx != null && seen.has(a.idx)) continue
              if (a.idx != null) seen.add(a.idx)
              actual.push(a)
              if (seen.size >= expected.length) break
            }
            await page.evaluate(() => window.__a11y.clearWalk())
            w.expected = expected.length
            w.visited = actual.length
            w.orderOk = actual.length === expected.length && actual.every((a, i) => a.idx === i)
            w.mismatches = actual.filter((a, i) => a.idx !== i).slice(0, 10)
            w.focusVisibleAll = actual.every(a => a.focusVisible)
            w.interactive = expected.filter(e => e.interactive).length
            w.interactiveWithoutIndicator = actual.filter(a => expected[a.idx] && expected[a.idx].interactive && !a.indicator).map(a => ({ selector: a.selector, texto: a.texto, tag: a.tag, role: a.role })).slice(0, 20)
            w.nonInteractiveWithoutIndicator = actual.filter(a => expected[a.idx] && !expected[a.idx].interactive && !a.indicator).map(a => ({ selector: a.selector, texto: a.texto, tag: a.tag, role: a.role })).slice(0, 20)
            w.tabpanels = actual.filter(a => a.role === 'tabpanel').map(a => ({ selector: a.selector, texto: a.texto, focusVisible: a.focusVisible, indicator: a.indicator, insetRingShadow: a.insetRingShadow }))
            w.tabpanelFocusVisible = w.tabpanels.every(t => t.focusVisible)
            w.tabpanelIndicator = w.tabpanels.every(t => t.indicator)
            w.pass = w.orderOk && w.focusVisibleAll && w.interactiveWithoutIndicator.length === 0 && w.tabpanelFocusVisible && w.tabpanelIndicator
          } catch (e) {
            w.error = e.message
          } finally {
            await ctx.close()
          }
          walkResults.push(w)
          console.log('walk', route.path, vp.label, theme, w.error ? 'ERR ' + w.error : `expected=${w.expected} visited=${w.visited} order=${w.orderOk} noInd=${w.interactiveWithoutIndicator ? w.interactiveWithoutIndicator.length : '-'}`)
        }
      }
    }
  }
  results.ac4.walks = walkResults
  results.ac4.pass = walkResults.length > 0 && walkResults.every(w => w.pass)
  results.ac4.failures = walkResults.filter(w => !w.pass)

  /* ---- AC5 motion ---- */
  const motion = { reduce: {}, normal: {} }
  const motionKinds = SMOKE ? ['panel'] : ['panel', 'dialog', 'alert']
  for (const kind of motionKinds) {
    motion.reduce[kind] = []
    for (const theme of (SMOKE ? ['light'] : THEMES)) {
      motion.reduce[kind].push(await runMotionPanel(browser, theme, kind))
    }
  }
  if (!SMOKE) {
    for (const theme of THEMES) {
      motion.reduce['ocr-' + theme] = await runOcrFlow(browser, theme, 'reduce')
      motion.normal['ocr-' + theme] = await runOcrFlow(browser, theme, 'no-preference')
    }
  }
  results.ac5 = motion
  const motionCaseOk = m => !!(m && !m.error && m.visible && m.during && m.after &&
    m.during.maxAnimationMs <= 10 && m.during.maxTransitionMs <= 10 &&
    m.after.maxAnimationMs <= 10 && m.after.maxTransitionMs <= 10 &&
    m.during.infinite.length === 0 && m.after.infinite.length === 0 &&
    m.after.opacity === '1' && m.after.visibility === 'visible')
  const ocrReduceOk = ['ocr-light', 'ocr-dark'].every(k => {
    const m = motion.reduce[k]
    return !!(m && !m.error && m.ocrCallBehavior === 'auto' && m.buttonCallBehavior === 'auto' &&
      m.finalMotion && m.finalMotion.infinite.length === 0 &&
      m.finalMotion.maxAnimationMs <= 10 && m.finalMotion.maxTransitionMs <= 10)
  })
  const ocrNormalOk = ['ocr-light', 'ocr-dark'].every(k => {
    const m = motion.normal[k]
    return !!(m && !m.error && m.ocrCallBehavior === 'smooth' && m.buttonCallBehavior === 'smooth' &&
      m.finalMotion && m.finalMotion.infinite.length === 0 &&
      m.finalMotion.opacity === '1' && m.finalMotion.visibility === 'visible')
  })
  const motionReduceCases = ['panel', 'dialog', 'alert'].flatMap(k => motion.reduce[k] || [])
  results.ac5.pass = motionReduceCases.length > 0 && motionReduceCases.every(motionCaseOk) &&
    (SMOKE || (ocrReduceOk && ocrNormalOk))
  results.ac5.ocr = {
    reducePass: SMOKE ? null : ocrReduceOk,
    normalPass: SMOKE ? null : ocrNormalOk,
  }

  /* ---- AC6 skip link ---- */
  const skipResults = []
  for (const theme of (SMOKE ? ['light'] : THEMES)) {
    const { ctx, page } = await newPage(browser, theme, VIEWPORTS.m390)
    const r = { theme }
    try {
      await goto(page, '/', 1000)
      await page.keyboard.press('Tab')
      await page.waitForTimeout(200)
      r.first = await page.evaluate(() => {
        const el = document.activeElement
        if (!el) return null
        const s = getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return { tag: el.tagName, text: (el.textContent || '').trim(), href: el.getAttribute('href'), outline: s.outline, outlineStyle: s.outlineStyle, rect: { w: +rect.width.toFixed(2), h: +rect.height.toFixed(2) } }
      })
      await page.keyboard.press('Enter')
      await page.waitForTimeout(250)
      r.afterEnter = await page.evaluate(() => {
        const el = document.activeElement
        if (!el) return null
        const s = getComputedStyle(el)
        return { tag: el.tagName, id: el.id, outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, text: (el.textContent || '').trim().slice(0, 40) }
      })
      await page.keyboard.press('Tab')
      await page.waitForTimeout(150)
      r.afterNextTab = await page.evaluate(() => {
        const el = document.activeElement
        const main = document.getElementById('contenido')
        return { tag: el ? el.tagName : null, inMain: !!(el && main && main.contains(el)), text: el ? (el.textContent || '').trim().slice(0, 50) : null }
      })
      r.pass = !!(r.first && r.first.text === 'Saltar al contenido' && r.afterEnter && r.afterEnter.tag === 'MAIN' && r.afterEnter.id === 'contenido' && r.afterNextTab && r.afterNextTab.inMain)
    } catch (e) {
      r.error = e.message
    } finally {
      await ctx.close()
    }
    skipResults.push(r)
    console.log('skip', theme, r.error ? 'ERR ' + r.error : `pass=${r.pass}`)
  }
  results.ac6.cases = skipResults
  results.ac6.pass = skipResults.length > 0 && skipResults.every(r => r.pass)

  /* ---- LIVE AC1-AC7 summary (no quality/git/deploy checks) ---- */
  if (LIVE) {
    results.meta.finished = new Date().toISOString()
    results.meta.live = true
    const allAc7 = [...results.ac7.defaultCases, ...results.ac7.secondaryCases]
    const ac7Counts = {
      cases: allAc7.length,
      contrastCases: allAc7.filter(c => c.contrast && c.contrast.failures.length > 0).length,
      contrastViolations: allAc7.reduce((n, c) => n + ((c.contrast && c.contrast.failures.length) || 0), 0),
      overflowCases: allAc7.filter(c => c.overflow && (c.overflow.overflowX !== 0 || c.overflow.bodyOverflowX !== 0)).length,
      truncationCases: allAc7.filter(c => c.overflow && c.overflow.truncados.length > 0).length,
      consoleCases: allAc7.filter(c => (c.console && c.console.length) || (c.failedRequests && c.failedRequests.length)).length,
    }
    const ac1Targets = {}
    for (const c of results.ac1.defaultCases) {
      ac1Targets[c.route + ' ' + c.viewport + ' ' + c.theme] = c.touch ? c.touch.targets : null
    }
    const cfgWalks = results.ac4.walks.filter(w => w.route === '/configuracion')
    const tabpanelWalks = cfgWalks.filter(w => w.tabpanels && w.tabpanels.length > 0)
    const tabpanel = {
      walks: tabpanelWalks.length,
      focusVisible: tabpanelWalks.filter(w => w.tabpanels.every(t => t.focusVisible)).length,
      indicator: tabpanelWalks.filter(w => w.tabpanels.every(t => t.indicator)).length,
      selectors: [...new Set(tabpanelWalks.flatMap(w => w.tabpanels.map(t => t.selector)))],
      insetRingShadow: [...new Set(tabpanelWalks.flatMap(w => w.tabpanels.map(t => t.insetRingShadow)))],
      failures: tabpanelWalks.filter(w => !w.tabpanels.every(t => t.focusVisible && t.indicator)).map(w => ({ route: w.route, viewport: w.viewport, theme: w.theme, tabpanels: w.tabpanels })),
    }
    const live = {
      schema_version: 1,
      task_id: 'a11y-gate-live',
      url: BASE,
      head: EXPECTED_HEAD,
      head_source: 'deploy handoff',
      generated_at: results.meta.finished,
      environment: {
        chrome: results.meta.chrome,
        node: results.meta.node,
        mobile_viewport: '390x844',
        desktop_viewport: '1440x900',
        themes: THEMES,
      },
      build: results.ac3.staticCss,
      ac1: {
        pass: results.ac1.pass,
        failureCount: results.ac1.failureCount,
        defaultCases: results.ac1.defaultCases.length,
        secondaryCases: results.ac1.secondaryCases.length,
        targets: ac1Targets,
        failures: results.ac1.failures,
      },
      ac2: {
        pass: results.ac2.pass,
        cases: results.ac2.cases.length,
        matched: results.ac2.cases.filter(c => c.pass).length,
        failures: results.ac2.cases.filter(c => !c.pass),
      },
      ac3: {
        pass: results.ac3.pass,
        cases: results.ac3.cases.length,
        failures: results.ac3.failures.length,
        caseDetails: results.ac3.cases.map(compactFocus),
        tabpanel: results.ac3.tabpanel.map(compactFocus),
      },
      ac4: {
        pass: results.ac4.pass,
        walks: results.ac4.walks.length,
        failures: results.ac4.failures.length,
        tabpanel,
        visited: results.ac4.walks.map(w => ({ route: w.route, viewport: w.viewport, theme: w.theme, expected: w.expected, visited: w.visited, orderOk: w.orderOk, focusVisibleAll: w.focusVisibleAll, interactiveWithoutIndicator: w.interactiveWithoutIndicator.length })),
        failureDetails: results.ac4.failures,
      },
      ac5: results.ac5,
      ac6: results.ac6,
      ac7: {
        pass: results.ac7.pass,
        counts: ac7Counts,
        overflowFailures: results.ac7.overflowFailures,
        contrastFailures: results.ac7.contrastFailures,
        consoleFailures: results.ac7.consoleFailures,
      },
    }
    live.pass = !!(live.build.pass && live.ac1.pass && live.ac2.pass && live.ac3.pass && live.ac4.pass && live.ac5.pass && live.ac6.pass && live.ac7.pass)
    fs.writeFileSync(path.join(OUT, 'live-a11y.json'), JSON.stringify(live, null, 2))
    fs.writeFileSync('/tmp/opencode/live-a11y-full.json', JSON.stringify(results, null, 2))
    if (results.ac7.contrastFailures.length) {
      fs.writeFileSync(path.join(OUT, 'live-contrast-failures.json'), JSON.stringify({
        note: 'Fallos de contraste en vivo, con selector/ruta/tema/medición exacta.',
        cases: results.ac7.contrastFailures,
      }, null, 2))
    }
    console.log('LIVE_WROTE', path.join(OUT, 'live-a11y.json'), 'bytes=' + fs.statSync(path.join(OUT, 'live-a11y.json')).size)
    console.log('LIVE_PASS', live.pass)
    await browser.close()
    return
  }

  /* ---- AC8 / AC9 / AC10 / AC11 / AC12 ---- */
  results.ac8 = qualityCheck()
  results.ac8.pass = ['tsc', 'npmTest', 'npmBuild', 'goTest'].every(k => results.ac8[k] && results.ac8[k].exit === 0)
  results.ac9 = scopeCheck()
  results.ac10 = gitCheck()
  results.ac11 = { executed: false, note: 'Deploy no ejecutado: solo tras aprobación humana.' }
  results.ac12 = {
    evidence: [
      'report.md', 'metrics-before.json', 'metrics-after.json',
      'harness/audit.cjs', 'harness/audit-baseline.cjs', 'logs/',
      'screenshots/',
    ],
    screenshots: fs.readdirSync(SHOTS).filter(f => f.endsWith('.png')).sort(),
  }

  results.meta.finished = new Date().toISOString()
  if (!results.ac12.evidence.includes('console-log.json')) results.ac12.evidence.push('console-log.json')
  if (!results.ac12.evidence.includes('contrast-failures.json')) results.ac12.evidence.push('contrast-failures.json')
  const fullFile = '/tmp/opencode/metrics-after-full.json'
  fs.writeFileSync(fullFile, JSON.stringify(results, null, 2))
  const { compact, contrastCases } = compactResults(results)
  const outFile = path.join(OUT, 'metrics-after.json')
  fs.writeFileSync(outFile, JSON.stringify(compact, null, 2))
  const contrastFile = path.join(OUT, 'contrast-failures.json')
  if (contrastCases.length) {
    fs.writeFileSync(contrastFile, JSON.stringify({
      note: 'Fallos completos de contraste de texto (el metrics-after.json compacto solo conserva 25 por caso).',
      cases: contrastCases,
    }, null, 2))
    console.log('WROTE', contrastFile)
  } else {
    try { fs.unlinkSync(contrastFile) } catch (e) {}
  }
  console.log('WROTE', outFile, 'bytes=' + fs.statSync(outFile).size)
  console.log('FULL', fullFile, 'bytes=' + fs.statSync(fullFile).size)
  await browser.close()
}

function checkStaticCss() {
  const dir = path.join(WEB, 'dist/assets')
  const cssFile = fs.readdirSync(dir).find(f => f.endsWith('.css'))
  const css = cssFile ? fs.readFileSync(path.join(dir, cssFile), 'utf8') : ''
  const srcFiles = [
    'src/components/ui/select.tsx',
    'src/components/ui/dropdown-menu.tsx',
  ]
  const src = srcFiles.map(f => fs.readFileSync(path.join(WEB, f), 'utf8')).join('\n')
  const tabsSrc = fs.readFileSync(path.join(WEB, 'src/components/ui/tabs.tsx'), 'utf8')
  return {
    cssFile,
    cssBytes: css.length,
    hasInsetRing2: css.includes('.focus\\:inset-ring-2:focus'),
    hasInsetRingRing: css.includes('.focus\\:inset-ring-ring:focus'),
    hasFocusVisibleInsetRing2: css.includes('.focus-visible\\:inset-ring-2:focus-visible'),
    hasFocusVisibleInsetRingRing: css.includes('.focus-visible\\:inset-ring-ring:focus-visible'),
    selectHasUtilities: /focus:inset-ring-2/.test(src) && /focus:inset-ring-ring/.test(src),
    tabsHasUtilities: /focus-visible:inset-ring-2/.test(tabsSrc) && /focus-visible:inset-ring-ring/.test(tabsSrc),
    cssSnippet: (css.match(/\.focus\\:inset-ring-2:focus\{[^}]*\}/) || [''])[0].slice(0, 300),
  }
}

function qualityCheck() {
  const read = f => { try { return fs.readFileSync(f, 'utf8') } catch (e) { return '' } }
  const exit = name => { try { const n = parseInt(read('/tmp/opencode/' + name + '.exit').trim(), 10); return isNaN(n) ? null : n } catch (e) { return null } }
  return {
    tsc: { exit: exit('tsc'), log: 'logs/tsc.log', tail: read('/tmp/opencode/tsc.log').trim().split('\n').slice(-3).join('\n') },
    npmTest: { exit: exit('npm-test'), log: 'logs/npm-test.log', summary: (read('/tmp/opencode/npm-test.log').match(/Test Files[\s\S]*?Duration[^\n]*/) || [''])[0].trim() },
    npmBuild: { exit: exit('npm-build'), log: 'logs/npm-build.log', summary: (read('/tmp/opencode/npm-build.log').match(/✓ built in [^\n]*/) || [''])[0].trim() },
    goTest: { exit: exit('go-test'), log: 'logs/go-test.log', tail: read('/tmp/opencode/go-test.log').trim().split('\n').slice(-3).join('\n') },
  }
}

function scopeCheck() {
  try {
    const changed = execSync(`git -C ${ROOT} diff --name-only 78ca19a..HEAD`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
    const forbidden = changed.filter(f => f.startsWith('backend/') || f === 'web/package.json' || f === 'web/package-lock.json' || f.includes('migration'))
    return {
      changedFiles: changed.length,
      changed,
      forbidden,
      packageJsonChanged: changed.includes('web/package.json'),
      packageLockChanged: changed.includes('web/package-lock.json'),
      goModChanged: changed.some(f => f.endsWith('go.mod') || f.endsWith('go.sum')),
      migrationsChanged: changed.some(f => /migration/i.test(f)),
      aiTracked: execSync(`git -C ${ROOT} ls-files .ai`, { encoding: 'utf8' }).trim(),
      pass: forbidden.length === 0,
    }
  } catch (e) {
    return { error: e.message }
  }
}

function gitCheck() {
  try {
    const head = execSync(`git -C ${ROOT} rev-parse HEAD`, { encoding: 'utf8' }).trim()
    const branch = execSync(`git -C ${ROOT} rev-parse --abbrev-ref HEAD`, { encoding: 'utf8' }).trim()
    const remote = execSync(`git -C ${ROOT} rev-parse origin/feat/a11y-gate`, { encoding: 'utf8' }).trim()
    const log = execSync(`git -C ${ROOT} log --oneline 78ca19a..HEAD`, { encoding: 'utf8' }).trim().split('\n')
    const merges = execSync(`git -C ${ROOT} log --merges --oneline 78ca19a..HEAD`, { encoding: 'utf8' }).trim()
    const tags = execSync(`git -C ${ROOT} tag --points-at HEAD`, { encoding: 'utf8' }).trim()
    const status = execSync(`git -C ${ROOT} status --porcelain`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
    return { head, branch, remote, remoteMatchesHead: head === remote, commits: log, merges, tags, status, pass: head === remote && !merges && !tags }
  } catch (e) {
    return { error: e.message }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
