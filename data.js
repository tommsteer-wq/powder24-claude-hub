/* ============================================================
   POWDER24 × CLAUDE HUB — data.js
   Google Sheets data layer

   HOW THIS WORKS:
   This file talks to a Google Apps Script "Web App" that you
   deploy from your Google Sheet. That script reads/writes data
   to the Sheet and returns it as JSON. The SCRIPT_URL below
   is the address of that web app — you'll paste it in after
   deploying the script (instructions in the README).
   ============================================================ */

const SHEET_ID = '1wf7z-RTS74v3oYedc-Xm3saqMwKYsjwjqAYyeiQWbTQ';

// ⚠️  PASTE YOUR APPS SCRIPT WEB APP URL HERE after deploying
// It will look like: https://script.google.com/macros/s/XXXX.../exec
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw1vw_9AS2YSeoPfPkJOyxaTK8R6epPHTckDb3Mq42MyFf6RcryZYU2y9O8eOkejWYC/exec';

// ---- Team members ----
const TEAM = [
  { name: "Aidan",     admin: false },
  { name: "Anna",      admin: false },
  { name: "Cedric",    admin: false },
  { name: "Charlotte", admin: false },
  { name: "Chloe",     admin: false },
  { name: "Civir",     admin: false },
  { name: "Danny",     admin: false },
  { name: "Dave",      admin: false },
  { name: "Estelle",   admin: false },
  { name: "Jane",      admin: false },
  { name: "Keegan",    admin: false },
  { name: "Lewis",     admin: false },
  { name: "Lou",       admin: true  },
  { name: "Shawsy",    admin: false },
  { name: "Ollie",     admin: false },
  { name: "Paul",      admin: false },
  { name: "Richard",   admin: false },
  { name: "Passmore",  admin: false },
  { name: "Tom",       admin: true  },
  { name: "Umad",      admin: false },
  { name: "Will",      admin: false },
];

// ---- Connectors ----
const CONNECTORS = [
  { name: "Google Docs",   icon: "📄" },
  { name: "Google Sheets", icon: "📊" },
  { name: "Google Drive",  icon: "💾" },
  { name: "Gmail",         icon: "📧" },
  { name: "Google Cal",    icon: "📅" },
  { name: "Slack",         icon: "💬" },
  { name: "GitHub",        icon: "🐙" },
  { name: "Jira",          icon: "🎯" },
  { name: "Notion",        icon: "📝" },
  { name: "Asana",         icon: "✅" },
  { name: "Trello",        icon: "📋" },
  { name: "HubSpot",       icon: "🔶" },
  { name: "Salesforce",    icon: "☁️" },
  { name: "Zendesk",       icon: "🎫" },
  { name: "Linear",        icon: "🔷" },
  { name: "Web Search",    icon: "🔍" },
  { name: "VS Code",       icon: "💻" },
];

// ---- Admin PIN ----
const ADMIN_PIN = '77777';

// ---- Default updates (shown before Sheet loads) ----
const DEFAULT_UPDATES = [
  {
    id: 1,
    title: "Welcome to the Powder24 Claude Hub!",
    body: "This is your home for everything Claude at Powder24. Start by signing the usage agreement, then explore the connectors tracker and Anthropic Academy.",
    tag: "Important",
    date: "2 Apr 2026",
    author: "Tom"
  },
  {
    id: 2,
    title: "Claude now supports Projects — try it today",
    body: "Claude's Projects feature lets you create a persistent workspace with its own instructions and uploaded files. Great for ongoing work. Ask Tom or Lou for a demo.",
    tag: "New Feature",
    date: "2 Apr 2026",
    author: "Lou"
  },
  {
    id: 3,
    title: "Recommended: Claude 101 on Anthropic Academy",
    body: "If you're newer to Claude, the 'Claude 101' course on the Learn tab is a brilliant place to start. Takes about 30 minutes.",
    tag: "Course",
    date: "2 Apr 2026",
    author: "Lou"
  }
];

/* ============================================================
   DATA API — wraps all Sheet calls
   ============================================================ */

const DB = {

  // Is the Google Sheet connected?
  isConnected() {
    return SCRIPT_URL !== 'PASTE_YOUR_SCRIPT_URL_HERE' && SCRIPT_URL.startsWith('https://');
  },

  // All requests go via GET to avoid CORS issues with Apps Script
  async call(action, params = {}) {
    if (!this.isConnected()) {
      console.warn('[DB] Sheet not connected — running in local mode');
      return { ok: false, local: true };
    }
    try {
      const qs = new URLSearchParams({ action, ...params }).toString();
      const res = await fetch(`${SCRIPT_URL}?${qs}`);
      return await res.json();
    } catch (e) {
      console.error('[DB] fetch error', e);
      return { ok: false, error: e.message };
    }
  },

  // --- LOGINS ---
  async recordLogin(name) {
    // Always save to localStorage as local cache
    const logins = JSON.parse(localStorage.getItem('p24_logins') || '{}');
    logins[name] = (logins[name] || 0) + 1;
    localStorage.setItem('p24_logins', JSON.stringify(logins));

    const lastSeen = JSON.parse(localStorage.getItem('p24_lastseen') || '{}');
    lastSeen[name] = new Date().toISOString();
    localStorage.setItem('p24_lastseen', JSON.stringify(lastSeen));

    // Also write to Sheet
    return this.call('recordLogin', { name, timestamp: new Date().toISOString() });
  },

  getLocalLogins() {
    return JSON.parse(localStorage.getItem('p24_logins') || '{}');
  },

  getLocalLastSeen() {
    return JSON.parse(localStorage.getItem('p24_lastseen') || '{}');
  },

  async getLogins() {
    const result = await this.call('getLogins');
    if (result.ok) return result.data;
    return this.getLocalLogins();
  },

  // --- AGREEMENTS ---
  async signAgreement(name) {
    const timestamp = new Date().toISOString();
    // Cache locally
    const agreements = JSON.parse(localStorage.getItem('p24_agreements') || '{}');
    agreements[name] = timestamp;
    localStorage.setItem('p24_agreements', JSON.stringify(agreements));
    // Write to Sheet
    return this.call('signAgreement', { name, timestamp });
  },

  getLocalAgreements() {
    return JSON.parse(localStorage.getItem('p24_agreements') || '{}');
  },

  async getAgreements() {
    const result = await this.call('getAgreements');
    if (result.ok) return result.data;
    return this.getLocalAgreements();
  },

  isSignedLocally(name) {
    const agreements = JSON.parse(localStorage.getItem('p24_agreements') || '{}');
    return !!agreements[name];
  },

  getSignedDateLocally(name) {
    const agreements = JSON.parse(localStorage.getItem('p24_agreements') || '{}');
    return agreements[name] || null;
  },

  // --- CONNECTORS ---
  async toggleConnector(name, connector, value) {
    // Cache locally
    const all = JSON.parse(localStorage.getItem('p24_connectors') || '{}');
    if (!all[name]) all[name] = {};
    all[name][connector] = value;
    localStorage.setItem('p24_connectors', JSON.stringify(all));
    // Write to Sheet
    return this.call('toggleConnector', { name, connector, value: String(value) });
  },

  getLocalConnectors() {
    return JSON.parse(localStorage.getItem('p24_connectors') || '{}');
  },

  async getConnectors() {
    const result = await this.call('getConnectors');
    if (result.ok) return result.data;
    return this.getLocalConnectors();
  },

  // --- UPDATES ---
  async addUpdate(title, body, tag, author) {
    const update = {
      id: Date.now(),
      title, body, tag, author,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      timestamp: new Date().toISOString()
    };
    // Cache locally
    const updates = JSON.parse(localStorage.getItem('p24_updates') || 'null') || DEFAULT_UPDATES;
    updates.push(update);
    localStorage.setItem('p24_updates', JSON.stringify(updates));
    // Write to Sheet
    await this.call('addUpdate', update);
    return update;
  },

  getLocalUpdates() {
    const stored = localStorage.getItem('p24_updates');
    return stored ? JSON.parse(stored) : DEFAULT_UPDATES;
  },

  async getUpdates() {
    const result = await this.call('getUpdates');
    if (result.ok && result.data && result.data.length > 0) return result.data;
    return this.getLocalUpdates();
  },

};
