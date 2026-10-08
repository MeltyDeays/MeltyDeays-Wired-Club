import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export class InMemoryStorage {
  constructor() {
    this._store = new Map();
  }
  getItem(key) {
    return this._store.has(String(key)) ? this._store.get(String(key)) : null;
  }
  setItem(key, value) {
    this._store.set(String(key), String(value));
  }
  removeItem(key) {
    this._store.delete(String(key));
  }
  clear() {
    this._store.clear();
  }
  get length() {
    return this._store.size;
  }
  key(index) {
    const keys = Array.from(this._store.keys());
    return keys[index] || null;
  }
}

export class SimpleClassList {
  constructor(el) {
    this._el = el;
    this._set = new Set();
    this._sync();
  }
  _sync() {
    this._set.clear();
    const cls = this._el.getAttribute('class') || '';
    cls.split(/\s+/).filter(Boolean).forEach(c => this._set.add(c));
  }
  _write() {
    this._el.setAttribute('class', Array.from(this._set).join(' '));
  }
  add(...classes) {
    this._sync();
    classes.forEach(c => this._set.add(c));
    this._write();
  }
  remove(...classes) {
    this._sync();
    classes.forEach(c => this._set.delete(c));
    this._write();
  }
  toggle(c, force) {
    this._sync();
    const has = this._set.has(c);
    const shouldAdd = force !== undefined ? force : !has;
    if (shouldAdd) this._set.add(c);
    else this._set.delete(c);
    this._write();
    return shouldAdd;
  }
  contains(c) {
    this._sync();
    return this._set.has(c);
  }
}

export class SimpleStyle {
  constructor(el) {
    this._el = el;
    this._props = {};
    const styleAttr = el.getAttribute('style') || '';
    styleAttr.split(';').forEach(pair => {
      const idx = pair.indexOf(':');
      if (idx > 0) {
        const k = pair.substring(0, idx).trim().replace(/-([a-z])/g, (_, g) => g.toUpperCase());
        const v = pair.substring(idx + 1).trim();
        this._props[k] = v;
      }
    });
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return target._props[prop] || '';
      },
      set: (target, prop, value) => {
        target._props[prop] = value;
        target._updateAttr();
        return true;
      }
    });
  }
  _updateAttr() {
    const parts = Object.entries(this._props)
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([k, v]) => {
        const kebab = k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        return `${kebab}: ${v}`;
      });
    this._el.setAttribute('style', parts.join('; '));
  }
  setProperty(prop, val) {
    const k = prop.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    this._props[k] = val;
    this._updateAttr();
  }
  removeProperty(prop) {
    const k = prop.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    delete this._props[k];
    this._updateAttr();
  }
  getPropertyValue(prop) {
    const k = prop.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    return this._props[k] || '';
  }
}

export class DOMElement {
  constructor(tagName = 'div', doc = null) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = doc;
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.listeners = new Map();
    this._textContent = '';
    this._innerHTML = '';
    this.classList = new SimpleClassList(this);
    this.style = new SimpleStyle(this);
    this._value = '';
    this.checked = false;
    this.disabled = false;
    this.dataset = {};
  }

  get parentElement() {
    return this.parentNode;
  }

  getContext(type) {
    return {
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      fillText: () => {},
      save: () => {},
      restore: () => {}
    };
  }

  get value() {
    return this._value !== undefined ? this._value : (this.getAttribute('value') || '');
  }
  set value(val) {
    this._value = String(val);
    this.setAttribute('value', String(val));
  }

  get id() {
    return this.getAttribute('id') || '';
  }
  set id(val) {
    this.setAttribute('id', val);
    if (this.ownerDocument) {
      this.ownerDocument._indexElement(this);
    }
  }

  get className() {
    return this.getAttribute('class') || '';
  }
  set className(val) {
    this.setAttribute('class', val);
    this.classList._sync();
  }

  getAttribute(name) {
    return this.attributes.get(name.toLowerCase()) || null;
  }

  setAttribute(name, value) {
    const lower = name.toLowerCase();
    const strVal = String(value);
    this.attributes.set(lower, strVal);
    if (lower === 'id' && this.ownerDocument) {
      this.ownerDocument._indexElement(this);
    }
    if (lower === 'value') {
      this._value = strVal;
    }
    if (lower === 'class' && this.classList) {
      this.classList._sync();
    }
    if (lower.startsWith('data-')) {
      const dataKey = lower.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
      this.dataset[dataKey] = strVal;
    }
  }

  removeAttribute(name) {
    this.attributes.delete(name.toLowerCase());
  }

  hasAttribute(name) {
    return this.attributes.has(name.toLowerCase());
  }

  get textContent() {
    if (this._textContent !== undefined && this._textContent !== '') return this._textContent;
    if (this.children.length > 0) {
      return this.children.map(c => c.textContent).join('');
    }
    return '';
  }

  set textContent(val) {
    this.children = [];
    this._textContent = String(val);
    this._innerHTML = String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  get innerHTML() {
    return this._innerHTML || this._textContent;
  }

  set innerHTML(html) {
    this._innerHTML = String(html || '');
    this._textContent = String(html || '').replace(/<[^>]*>/g, '');
    this.children = [];
    if (!html || !html.includes('<')) {
      return;
    }
    if (this.ownerDocument) {
      const parsed = this.ownerDocument.parseFragment(html);
      parsed.forEach(c => this.appendChild(c));
    }
  }

  appendChild(child) {
    if (!child) return null;
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    child.ownerDocument = this.ownerDocument;
    this.children.push(child);
    if (this.ownerDocument && child.id) {
      this.ownerDocument._indexElement(child);
    }
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  insertBefore(newChild, refChild) {
    if (!refChild) return this.appendChild(newChild);
    const idx = this.children.indexOf(refChild);
    if (idx === -1) return this.appendChild(newChild);
    if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
    newChild.parentNode = this;
    newChild.ownerDocument = this.ownerDocument;
    this.children.splice(idx, 0, newChild);
    if (this.ownerDocument && newChild.id) {
      this.ownerDocument._indexElement(newChild);
    }
    return newChild;
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  removeEventListener(event, handler) {
    if (!this.listeners.has(event)) return;
    const list = this.listeners.get(event);
    const idx = list.indexOf(handler);
    if (idx !== -1) list.splice(idx, 1);
  }

  dispatchEvent(event) {
    event.target = this;
    event.currentTarget = this;
    const list = this.listeners.get(event.type) || [];
    for (const h of list) {
      try {
        h.call(this, event);
      } catch (err) {
        console.error(`Error in event listener for ${event.type}:`, err);
      }
    }
    const inlineHandler = this['on' + event.type];
    if (typeof inlineHandler === 'function') {
      try {
        inlineHandler.call(this, event);
      } catch (err) {
        console.error(`Error in on${event.type}:`, err);
      }
    }
    return !event.defaultPrevented;
  }

  click() {
    const ev = {
      type: 'click',
      target: this,
      currentTarget: this,
      preventDefault: () => {},
      stopPropagation: () => {},
      defaultPrevented: false
    };
    this.dispatchEvent(ev);
  }

  focus() {
    this.dispatchEvent({ type: 'focus', target: this, defaultPrevented: false, preventDefault: () => {} });
  }

  blur() {
    this.dispatchEvent({ type: 'blur', target: this, defaultPrevented: false, preventDefault: () => {} });
  }

  getBoundingClientRect() {
    return { top: 0, left: 0, right: 100, bottom: 40, width: 100, height: 40 };
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector) {
    if (selector.includes(',')) {
      const parts = selector.split(',').map(s => s.trim());
      const set = new Set();
      for (const p of parts) {
        for (const el of this.querySelectorAll(p)) {
          set.add(el);
        }
      }
      return Array.from(set);
    }
    if (selector.includes(' ')) {
      const parts = selector.split(/\s+/).filter(Boolean);
      let current = [this];
      for (const part of parts) {
        const next = [];
        for (const node of current) {
          next.push(...node.querySelectorAll(part));
        }
        current = next;
      }
      return current;
    }
    const results = [];
    const match = createMatcher(selector);
    function traverse(node) {
      for (const child of node.children) {
        if (match(child)) results.push(child);
        traverse(child);
      }
    }
    traverse(this);
    return results;
  }

  closest(selector) {
    const match = createMatcher(selector);
    let curr = this;
    while (curr) {
      if (match(curr)) return curr;
      curr = curr.parentNode;
    }
    return null;
  }
}

function createMatcher(selector) {
  selector = selector.trim();
  if (selector.includes(',')) {
    const matchers = selector.split(',').map(s => createMatcher(s.trim()));
    return el => matchers.some(m => m(el));
  }
  if (selector.startsWith('#')) {
    const id = selector.slice(1);
    return el => el.id === id;
  }
  if (selector.startsWith('.')) {
    const classes = selector.split('.').filter(Boolean);
    return el => classes.every(c => el.classList.contains(c));
  }
  if (selector.includes('[') && selector.endsWith(']')) {
    const attrMatch = selector.match(/^([a-zA-Z0-9_-]*)\[([a-zA-Z0-9_-]+)(?:=([^\\]]+))?\]$/);
    if (attrMatch) {
      const [_, tag, attr, val] = attrMatch;
      const cleanVal = val ? val.replace(/^["']|["']$/g, '') : null;
      return el => {
        if (tag && el.tagName.toLowerCase() !== tag.toLowerCase()) return false;
        if (!el.hasAttribute(attr)) return false;
        if (cleanVal !== null) return el.getAttribute(attr) === cleanVal;
        return true;
      };
    }
  }
  const tag = selector.toUpperCase();
  return el => el.tagName === tag;
}

export class DOMDocument {
  constructor() {
    this.idMap = new Map();
    this.body = new DOMElement('body', this);
    this.head = new DOMElement('head', this);
    this.readyState = 'complete';
    this.listeners = new Map();
  }

  _indexElement(el) {
    if (el.id) {
      this.idMap.set(el.id, el);
    }
    for (const c of el.children) {
      this._indexElement(c);
    }
  }

  getElementById(id) {
    return this.idMap.get(id) || null;
  }

  createElement(tagName) {
    return new DOMElement(tagName, this);
  }

  querySelector(selector) {
    if (selector.startsWith('#') && !selector.includes(' ') && !selector.includes('>')) {
      return this.getElementById(selector.slice(1));
    }
    const inBody = this.body.querySelector(selector);
    if (inBody) return inBody;
    return this.head.querySelector(selector);
  }

  querySelectorAll(selector) {
    return [...this.head.querySelectorAll(selector), ...this.body.querySelectorAll(selector)];
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  removeEventListener(type, handler) {
    if (!this.listeners.has(type)) return;
    const list = this.listeners.get(type);
    const idx = list.indexOf(handler);
    if (idx !== -1) list.splice(idx, 1);
  }

  dispatchEvent(event) {
    event.target = this;
    const list = this.listeners.get(event.type) || [];
    for (const h of list) {
      try {
        h.call(this, event);
      } catch (e) {
        console.error(`Document event listener error:`, e);
      }
    }
    return !event.defaultPrevented;
  }

  parseFragment(html) {
    const nodes = [];
    const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    const openTagRegex = /<([a-zA-Z0-9-]+)([^>]*?)(\/?)>/g;
    let match;

    while ((match = openTagRegex.exec(html)) !== null) {
      const tagName = match[1];
      const attrsStr = match[2] || '';
      const isSelfClosing = match[3] === '/' || voidTags.has(tagName.toLowerCase());
      const el = this.createElement(tagName);
      parseAttributes(attrsStr, el);

      if (isSelfClosing) {
        nodes.push(el);
        continue;
      }

      const startIndex = openTagRegex.lastIndex;
      let depth = 1;
      const subTagRegex = new RegExp(`<(\\/?)(${tagName})([^>]*?)(\\/?)>`, 'gi');
      subTagRegex.lastIndex = startIndex;
      let subMatch;
      let endIndex = html.length;

      while ((subMatch = subTagRegex.exec(html)) !== null) {
        const isClosing = subMatch[1] === '/';
        const isSubSelfClosing = subMatch[4] === '/' || voidTags.has(subMatch[2].toLowerCase());

        if (isClosing) {
          depth--;
          if (depth === 0) {
            endIndex = subMatch.index;
            openTagRegex.lastIndex = subTagRegex.lastIndex;
            break;
          }
        } else if (!isSubSelfClosing) {
          depth++;
        }
      }

      const innerContent = html.slice(startIndex, endIndex);
      if (innerContent) {
        el.innerHTML = innerContent;
      }
      nodes.push(el);
    }
    return nodes;
  }
}

function parseAttributes(str, el) {
  const attrRegex = /([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = attrRegex.exec(str)) !== null) {
    const name = m[1];
    const val = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : ''));
    el.setAttribute(name, val);
    if (name.toLowerCase() === 'value') el.value = val;
    if (name.toLowerCase() === 'id') el.id = val;
  }
}

export function parseHTMLDocument(htmlContent) {
  const doc = new DOMDocument();
  const tagRegex = /<([a-zA-Z0-9-]+)([^>]*?)(\/?>)/g;
  let match;
  while ((match = tagRegex.exec(htmlContent)) !== null) {
    const tagName = match[1].toLowerCase();
    if (tagName === 'html' || tagName === '!doctype' || tagName === 'script' || tagName === 'style' || tagName === 'link') {
      continue;
    }
    const attrsStr = match[2];
    const el = doc.createElement(tagName);
    parseAttributes(attrsStr, el);
    if (el.id) {
      doc._indexElement(el);
    }
    doc.body.appendChild(el);
  }
  return doc;
}

export function setupTestEnvironment(htmlFileName = 'index.html', options = {}) {
  const htmlPath = path.resolve(PROJECT_ROOT, htmlFileName);
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const doc = parseHTMLDocument(htmlContent);

  const localStorage = new InMemoryStorage();
  const sessionStorage = new InMemoryStorage();

  // Populate default seed data into localStorage
  const dbKey = 'wired_club_mvvm_db_v2';
  const initialData = {
    users: {
      "CLIENT-58438412": {
        uid: "CLIENT-58438412",
        phone: "58438412",
        displayName: "Carlos Lopez",
        pin: "1234",
        wiredPoints: 500,
        tier: "NAVI_USER",
        memberCode: "MC-CARLOS",
        status: "ACTIVE"
      },
      "50558438412": {
        uid: "CLIENT-58438412",
        phone: "58438412",
        displayName: "Carlos Lopez",
        pin: "1234",
        wiredPoints: 500,
        tier: "NAVI_USER",
        memberCode: "MC-CARLOS",
        status: "ACTIVE"
      },
      "50588889999": {
        uid: "CLIENT-88889999",
        phone: "88889999",
        displayName: "Maria Santos",
        pin: "5678",
        wiredPoints: 1200,
        tier: "CYBER_ELITE",
        memberCode: "MC-MARIA",
        status: "ACTIVE"
      }
    },
    rewards: {
      "rew-ramen": {
        id: "rew-ramen",
        title: "Ramen Especial",
        pointsCost: 200,
        category: "FOOD",
        stock: 10,
        rewardType: "FREE_REWARD",
        priceUsd: 8.5
      },
      "rew-cyber-drink": {
        id: "rew-cyber-drink",
        title: "Cyber Energy Drink",
        pointsCost: 50,
        category: "DRINK",
        stock: 25,
        imageUrl: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?auto=format&fit=crop&w=600&q=80",
        rewardType: "FREE_REWARD",
        priceUsd: 3.0
      },
      "rew-discount-voucher": {
        id: "rew-discount-voucher",
        title: "Vale Descuento 30%",
        pointsCost: 100,
        category: "VOUCHER",
        stock: 15,
        rewardType: "DISCOUNT_POINTS",
        priceUsd: 15.0
      }
    },
    vouchers: {
      "VCH-ACTIVE-999": {
        voucherCode: "VCH-ACTIVE-999",
        memberCode: "MC-CARLOS",
        userPhone: "58438412",
        rewardId: "rew-cyber-drink",
        rewardTitle: "Cyber Energy Drink",
        pointsCost: 50,
        status: "AVAILABLE",
        createdAt: new Date().toISOString()
      }
    },
    tokens: {
      "WP-TEST-1001": {
        tokenCode: "WP-TEST-1001",
        invoiceFolio: "9001",
        pointsValue: 150,
        securityPin: "1234",
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      },
      "WP-CLAIMED-2002": {
        token: "WP-CLAIMED-2002",
        invoiceFolio: "9002",
        pointsValue: 200,
        status: "CLAIMED",
        claimedBy: "58438412",
        claimedAt: new Date().toISOString()
      }
    },
    batches: [],
    ledger: {}
  };

  localStorage.setItem('wired_club_mvvm_db_v2', JSON.stringify(initialData));
  localStorage.setItem('dev_wired_club_mvvm_db_v2', JSON.stringify(initialData));

  const win = {
    document: doc,
    localStorage,
    sessionStorage,
    open: () => ({
      document: {
        open: () => {},
        write: () => {},
        close: () => {}
      },
      close: () => {}
    }),
    location: {
      hostname: options.hostname || 'localhost',
      search: options.search || '',
      href: options.href || 'http://localhost/',
      pathname: '/'
    },
    navigator: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) E2ETestRunner'
    },
    QRCode: class MockQRCode {
      constructor(container, text) {
        this.container = container;
        this.text = text;
      }
      makeCode(text) {
        this.text = text;
      }
      clear() {}
    },
    Html5Qrcode: class MockHtml5Qrcode {
      constructor() {}
      start() { return Promise.resolve(); }
      stop() { return Promise.resolve(); }
      clear() { return Promise.resolve(); }
    },
    addEventListener: (type, fn) => doc.addEventListener(type, fn),
    removeEventListener: (type, fn) => doc.removeEventListener(type, fn),
    dispatchEvent: ev => doc.dispatchEvent(ev),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: id => clearTimeout(id),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: id => clearInterval(id),
    requestAnimationFrame: fn => setTimeout(fn, 16),
    cancelAnimationFrame: id => clearTimeout(id),
    alert: msg => console.log('[WINDOW ALERT]:', msg),
    confirm: () => true,
    prompt: () => '110805'
  };

  win.window = win;
  win.globalThis = win;

  // Mount into global scope
  global.window = win;
  global.document = doc;
  global.localStorage = localStorage;
  global.sessionStorage = sessionStorage;
  try {
    Object.defineProperty(global, 'navigator', {
      value: win.navigator,
      configurable: true,
      writable: true
    });
  } catch (e) {
    // Navigator getter already exists on global in Node 22
  }
  global.location = win.location;
  global.QRCode = win.QRCode;
  global.Html5Qrcode = win.Html5Qrcode;
  global.requestAnimationFrame = win.requestAnimationFrame;
  global.cancelAnimationFrame = win.cancelAnimationFrame;
  global.URL = {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: () => {}
  };
  global.Blob = class MockBlob {
    constructor(parts, opts) {
      this.parts = parts;
      this.opts = opts;
    }
  };

  return { doc, win, localStorage, sessionStorage, initialData };
}

export class TestContext {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  async test(description, testFn) {
    const testRecord = { description, status: 'PENDING', error: null, durationMs: 0 };
    this.tests.push(testRecord);
    const start = performance.now();
    try {
      await testFn();
      testRecord.status = 'PASS';
      testRecord.durationMs = Math.round(performance.now() - start);
      this.passed++;
      console.log(`    ✓ ${description} (${testRecord.durationMs}ms)`);
    } catch (err) {
      testRecord.status = 'FAIL';
      testRecord.error = err;
      testRecord.durationMs = Math.round(performance.now() - start);
      this.failed++;
      this.errors.push({ description, error: err });
      console.error(`    ✕ ${description} (${testRecord.durationMs}ms)`);
      console.error(`      -> ${err.name}: ${err.message}`);
      if (err.stack) {
        const stackLines = err.stack.split('\n').slice(1, 4).join('\n');
        console.error(`      ${stackLines}`);
      }
    }
  }

  summary() {
    return {
      name: this.name,
      total: this.tests.length,
      passed: this.passed,
      failed: this.failed,
      errors: this.errors
    };
  }
}

export function expect(actual) {
  return {
    toBe(expected, msg = '') {
      if (actual !== expected) {
        throw new Error(`${msg || 'Assertion failed'}: expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected, msg = '') {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${msg || 'Assertion failed'}: expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy(msg = '') {
      if (!actual) {
        throw new Error(`${msg || 'Assertion failed'}: expected truthy value, but got ${actual}`);
      }
    },
    toBeFalsy(msg = '') {
      if (actual) {
        throw new Error(`${msg || 'Assertion failed'}: expected falsy value, but got ${actual}`);
      }
    },
    toContain(sub, msg = '') {
      if (!actual || !actual.includes(sub)) {
        throw new Error(`${msg || 'Assertion failed'}: expected ${JSON.stringify(actual)} to contain ${JSON.stringify(sub)}`);
      }
    },
    toBeGreaterThan(num, msg = '') {
      if (typeof actual !== 'number' || actual <= num) {
        throw new Error(`${msg || 'Assertion failed'}: expected ${actual} > ${num}`);
      }
    },
    toBeGreaterThanOrEqual(num, msg = '') {
      if (typeof actual !== 'number' || actual < num) {
        throw new Error(`${msg || 'Assertion failed'}: expected ${actual} >= ${num}`);
      }
    },
    toBeDefined(msg = '') {
      if (actual === undefined) {
        throw new Error(`${msg || 'Assertion failed'}: expected value to be defined`);
      }
    }
  };
}
