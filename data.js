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
// This is the base list. Additional members can be added via the Admin panel
// and are stored in Google Sheets — they are merged in at startup.
let TEAM = [
  { name: "Aidan",     admin: false, pin: '23456' },
  { name: "Anna",      admin: false, pin: '23456' },
  { name: "Cedric",    admin: false, pin: '23456' },
  { name: "Charlotte", admin: false, pin: '23456' },
  { name: "Chloe",     admin: false, pin: '23456' },
  { name: "Civir",     admin: false, pin: '23456' },
  { name: "Danny",     admin: false, pin: '23456' },
  { name: "Dave",      admin: false, pin: '23456' },
  { name: "Estelle",   admin: false, pin: '23456' },
  { name: "Jane",      admin: false, pin: '23456' },
  { name: "Keegan",    admin: false, pin: '23456' },
  { name: "Lewis",     admin: false, pin: '23456' },
  { name: "Lou",       admin: true,  pin: '77777' },
  { name: "Meg",       admin: false, pin: '23456' },
  { name: "Shawsy",    admin: false, pin: '23456' },
  { name: "Ollie",     admin: false, pin: '23456' },
  { name: "Paul",      admin: false, pin: '23456' },
  { name: "Richard",   admin: false, pin: '23456' },
  { name: "Passmore",  admin: false, pin: '23456' },
  { name: "Tom",       admin: true,  pin: '77777' },
  { name: "Umad",      admin: false, pin: '23456' },
  { name: "Will",      admin: false, pin: '23456' },
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
  { name: "Other",          icon: "➕" },
  { name: "None connected", icon: "🚫" },
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

  async clearLogins() {
    localStorage.removeItem('p24_logins');
    localStorage.removeItem('p24_lastseen');
    return this.call('clearLogins');
  },

  // --- TEAM MANAGEMENT ---
  async getTeam() {
    const result = await this.call('getTeam');
    if (result.ok) return result.data; // array of { name, pin }
    return [];
  },

  async addTeamMember(name, pin) {
    return this.call('addTeamMember', { name, pin });
  },

  async removeTeamMember(name) {
    return this.call('removeTeamMember', { name });
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

  // --- DATA UPLOAD CHECKLIST ---
  async signChecklist(name) {
    const timestamp = new Date().toISOString();
    const checklist = JSON.parse(localStorage.getItem('p24_checklist') || '{}');
    checklist[name] = timestamp;
    localStorage.setItem('p24_checklist', JSON.stringify(checklist));
    return this.call('signChecklist', { name, timestamp });
  },

  getLocalChecklist() {
    return JSON.parse(localStorage.getItem('p24_checklist') || '{}');
  },

  async getChecklist() {
    const result = await this.call('getChecklist');
    if (result.ok) return result.data;
    return this.getLocalChecklist();
  },

  isChecklistSignedLocally(name) {
    const checklist = JSON.parse(localStorage.getItem('p24_checklist') || '{}');
    return !!checklist[name];
  },

  getChecklistSignedDateLocally(name) {
    const checklist = JSON.parse(localStorage.getItem('p24_checklist') || '{}');
    return checklist[name] || null;
  },

};
