/* ============================================================
   POWDER24 × CLAUDE HUB — app.js
   Main application logic
   ============================================================ */

let currentUser = null;

/* ============================================================
   INIT
   ============================================================ */

async function init() {
  // Load any extra team members added via the Admin panel from Google Sheets,
  // then merge them into the TEAM array before rendering the login grid.
  if (DB.isConnected()) {
    try {
      const extra = await DB.getTeam();
      extra.forEach(e => {
        if (!TEAM.find(m => m.name === e.name)) {
          TEAM.push({ name: e.name, admin: false, pin: e.pin || '23456' });
        }
      });
      TEAM.sort((a, b) => a.name.localeCompare(b.name));
    } catch(_) {}
  }
  renderLoginGrid();
  if (!DB.isConnected()) {
    console.info('[Hub] Running in local mode — connect Google Sheet to enable live data sync.');
  }
}

/* ============================================================
   LOGIN SCREEN
   ============================================================ */

function renderLoginGrid() {
  const grid = document.getElementById('teamGrid');
  grid.innerHTML = TEAM.map(member => `
    <div class="team-btn" onclick="handleLogin('${member.name}')">
      <div class="avatar">${member.name.charAt(0)}</div>
      <div class="name">${member.name}</div>
    </div>
  `).join('') + `
    <div class="team-btn guest-btn" onclick="handleLogin('Guest')">
      <div class="avatar" style="background:var(--white40)">👤</div>
      <div class="name">Guest</div>
    </div>
  `;
}

function handleLogin(name) {
  if (name === 'Guest') {
    pinTarget = { name: 'Guest', admin: false, pin: '66666' };
    openPinModal('Guest');
    return;
  }
  const member = TEAM.find(m => m.name === name);
  if (!member) return;
  pinTarget = member;
  openPinModal(member.name);
}

/* ============================================================
   PIN MODAL
   ============================================================ */

let pinBuffer = '';
let pinTarget = null;

function openPinModal(name) {
  pinBuffer = '';
  updatePinDisplay();
  document.getElementById('pinModalDesc').textContent = `Hey ${name} — enter your 5-digit PIN`;
  document.getElementById('pinError').textContent = '';
  document.getElementById('pinModal').classList.add('active');
}

function closePinModal() {
  document.getElementById('pinModal').classList.remove('active');
  pinTarget = null;
  pinBuffer = '';
  updatePinDisplay();
}

function pinPress(val) {
  if (val === 'back') {
    pinBuffer = pinBuffer.slice(0, -1);
  } else if (val === 'clear') {
    pinBuffer = '';
  } else if (pinBuffer.length < 5) {
    pinBuffer += val;
  }
  updatePinDisplay();
  document.getElementById('pinError').textContent = '';

  if (pinBuffer.length === 5) {
    setTimeout(() => {
      if (pinBuffer === pinTarget.pin) {
        document.getElementById('pinModal').classList.remove('active');
        completeLogin(pinTarget, pinTarget.admin);
      } else {
        document.getElementById('pinError').textContent = 'Incorrect PIN. Try again.';
        pinBuffer = '';
        updatePinDisplay();
      }
    }, 200);
  }
}

function updatePinDisplay() {
  for (let i = 0; i < 5; i++) {
    document.getElementById('d' + i).classList.toggle('filled', i < pinBuffer.length);
  }
}

/* ============================================================
   COMPLETE LOGIN
   ============================================================ */

async function completeLogin(member, isAdmin) {
  currentUser = { ...member, isAdmin };

  // Record login (fire and forget)
  DB.recordLogin(member.name);

  // Update nav
  document.getElementById('navAvatar').textContent = member.name.charAt(0);
  document.getElementById('navName').textContent = member.name;

  // Admin tab visibility
  document.getElementById('adminTabBtn').style.display = isAdmin ? 'flex' : 'none';

  // Switch screens
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');

  // Session footer
  document.getElementById('sessionInfo').textContent =
    `${member.name} · ${new Date().toLocaleTimeString()} · ${DB.isConnected() ? '🟢 Live' : '🟡 Local mode'}`;

  // Render tabs
  await renderConnectors();
  renderAgreementTab();
  renderChecklistTab();

  showToast(`Welcome back, ${member.name}! 👋`);
}

/* ============================================================
   LOGOUT
   ============================================================ */

function logout() {
  currentUser = null;
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-login').classList.add('active');
  switchTab('welcome', document.querySelector('.tab-btn'));
}

/* ============================================================
   TAB SWITCHING
   ============================================================ */

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  if (btn) btn.classList.add('active');
  if (tabId === 'admin') renderAdmin();
}

/* ============================================================
   AGREEMENT TAB (Claude Basics)
   ============================================================ */

function renderAgreementTab() {
  const signed = DB.isSignedLocally(currentUser.name);
  const badge  = document.getElementById('signedBadge');
  const check  = document.getElementById('agreeCheck');
  const btn    = document.getElementById('signBtn');
  const box    = document.getElementById('agreeBox');

  if (signed) {
    const date = DB.getSignedDateLocally(currentUser.name);
    const formatted = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    badge.innerHTML = `✅ Signed by <strong>${currentUser.name}</strong> — <span style="color:var(--pink);font-weight:600">${formatted}</span>`;
    badge.classList.add('visible');
    check.style.display = 'none';
    btn.style.display   = 'none';
  } else {
    badge.classList.remove('visible');
    check.style.display = 'flex';
    btn.style.display   = 'inline-flex';
    box.checked  = false;
    btn.disabled = true;
  }
}

function toggleSignBtn() {
  document.getElementById('signBtn').disabled = !document.getElementById('agreeBox').checked;
}

async function signAgreement() {
  const btn = document.getElementById('signBtn');
  btn.disabled = true;
  btn.textContent = 'Signing...';
  await DB.signAgreement(currentUser.name);
  renderAgreementTab();
  showToast('Agreement signed — thank you! ✅');
}

/* ============================================================
   DATA UPLOAD CHECKLIST TAB
   ============================================================ */

function renderChecklistTab() {
  const signed = DB.isChecklistSignedLocally(currentUser.name);
  const badge  = document.getElementById('checklistSignedBadge');
  const check  = document.getElementById('checklistAgreeCheck');
  const btn    = document.getElementById('checklistSignBtn');
  const box    = document.getElementById('checklistAgreeBox');

  if (signed) {
    const date = DB.getChecklistSignedDateLocally(currentUser.name);
    const formatted = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    badge.innerHTML = `✅ Acknowledged by <strong>${currentUser.name}</strong> — <span style="color:var(--pink);font-weight:600">${formatted}</span>`;
    badge.classList.add('visible');
    check.style.display = 'none';
    btn.style.display   = 'none';
  } else {
    badge.classList.remove('visible');
    check.style.display = 'flex';
    btn.style.display   = 'inline-flex';
    box.checked  = false;
    btn.disabled = true;
  }
}

function toggleChecklistBtn() {
  document.getElementById('checklistSignBtn').disabled = !document.getElementById('checklistAgreeBox').checked;
}

async function signChecklist() {
  const btn = document.getElementById('checklistSignBtn');
  btn.disabled = true;
  btn.textContent = 'Signing...';
  await DB.signChecklist(currentUser.name);
  renderChecklistTab();
  showToast('Checklist acknowledged — thank you! ✅');
}

/* ============================================================
   CONNECTORS TAB
   ============================================================ */

async function renderConnectors() {
  const table = document.getElementById('connectorsTable');
  table.innerHTML = '<tbody><tr><td class="loading-state" colspan="20">Loading...</td></tr></tbody>';

  const connectorData = await DB.getConnectors();

  let thead = '<thead><tr><th>Name</th>';
  CONNECTORS.forEach(c => {
    thead += `<th><span class="connector-icon">${c.icon}</span>${c.name}</th>`;
  });
  thead += '</tr></thead>';

  let tbody = '<tbody>';
  TEAM.forEach(member => {
    const isMe    = member.name === currentUser.name;
    const rowData = connectorData[member.name] || {};
    tbody += `<tr class="${isMe ? 'my-row' : ''}">`;
    tbody += `<td>${member.name}${isMe ? ' ✦' : ''}</td>`;
    CONNECTORS.forEach(c => {
      const checked = !!rowData[c.name];
      tbody += `<td>
        <input type="checkbox" class="conn-check"
          ${checked ? 'checked' : ''}
          ${isMe ? '' : 'disabled'}
          onchange="handleConnectorChange('${member.name}','${c.name}',this.checked)"
        >
      </td>`;
    });
    tbody += '</tr>';
  });
  tbody += '</tbody>';

  table.innerHTML = thead + tbody;
}

async function handleConnectorChange(name, connector, value) {
  await DB.toggleConnector(name, connector, value);
  showToast(value ? `${connector} logged! 🔌` : `${connector} removed`);
}

/* ============================================================
   ADMIN TAB
   ============================================================ */

async function renderAdmin() {
  const [agreements, logins, connectorData, checklistData] = await Promise.all([
    DB.getAgreements(),
    DB.getLogins(),
    DB.getConnectors(),
    DB.getChecklist()
  ]);

  const lastSeen = DB.getLocalLastSeen();

  // --- Stat cards ---
  const totalLogins      = Object.values(logins).reduce((a, b) => a + b, 0);
  const localAgreements  = DB.getLocalAgreements();
  const mergedAgreements = { ...agreements, ...localAgreements };
  const signedCount      = Object.keys(mergedAgreements).length;
  const localChecklist   = DB.getLocalChecklist();
  const mergedChecklist  = { ...checklistData, ...localChecklist };
  const checklistCount   = Object.keys(mergedChecklist).length;
  const connectorTicks   = Object.values(connectorData)
    .reduce((sum, obj) => sum + Object.values(obj).filter(Boolean).length, 0);

  document.getElementById('adminStatCards').innerHTML = [
    { val: TEAM.length,                label: 'Team Members' },
    { val: totalLogins,                label: 'Total Logins' },
    { val: signedCount,                label: 'Basics Signed' },
    { val: checklistCount,             label: 'Checklist Signed' },
    { val: connectorTicks,             label: 'Connectors Logged' },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-val">${s.val}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');

  // --- Merged team table ---
  const maxLogins = Math.max(...TEAM.map(m => logins[m.name] || 0), 1);
  const sorted = [...TEAM].sort((a, b) => (logins[b.name] || 0) - (logins[a.name] || 0));

  let tHtml = '<thead><tr><th>Name</th><th>Basics</th><th>Checklist</th><th>Logins</th><th>Last Seen</th><th>Activity</th></tr></thead><tbody>';
  sorted.forEach(m => {
    const sig = mergedAgreements[m.name];
    const cl  = mergedChecklist[m.name];
    const n   = logins[m.name] || 0;
    const ls  = lastSeen[m.name] ? new Date(lastSeen[m.name]).toLocaleDateString('en-GB') : 'Never';
    const pct = Math.round((n / maxLogins) * 100);
    tHtml += `<tr>
      <td>${m.name}</td>
      <td><span class="status-pill ${sig ? 'status-yes' : 'status-no'}">${sig ? 'Signed' : 'Pending'}</span></td>
      <td><span class="status-pill ${cl ? 'status-yes' : 'status-no'}">${cl ? 'Signed' : 'Pending'}</span></td>
      <td style="font-weight:700">${n}</td>
      <td style="color:var(--white40);font-size:12px">${ls}</td>
      <td><div class="bar-wrap"><div class="bar-fill" style="width:${pct}%"></div></div></td>
    </tr>`;
  });
  tHtml += '</tbody>';
  document.getElementById('teamTable').innerHTML = tHtml;

  // --- Connector adoption table ---
  let cHtml = '<thead><tr><th>Connector</th><th>Users</th><th>Adoption</th></tr></thead><tbody>';
  CONNECTORS.forEach(c => {
    const users = TEAM.filter(m => (connectorData[m.name] || {})[c.name]).length;
    const pct   = Math.round((users / TEAM.length) * 100);
    cHtml += `<tr>
      <td>${c.icon} ${c.name}</td>
      <td style="font-weight:700">${users} / ${TEAM.length}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="bar-wrap" style="width:110px"><div class="bar-fill" style="width:${pct}%"></div></div>
          <span style="font-size:11px;color:var(--white40)">${pct}%</span>
        </div>
      </td>
    </tr>`;
  });
  cHtml += '</tbody>';
  document.getElementById('connectorAdoptionTable').innerHTML = cHtml;

  // Sheet link
  document.getElementById('sheetLink').innerHTML = DB.isConnected()
    ? `📊 <strong>Data is syncing live.</strong> <a href="https://docs.google.com/spreadsheets/d/${SHEET_ID}" target="_blank">View raw data in Google Sheets ↗</a>`
    : `⚠️ <strong>Running in local mode.</strong> Data is saved in this browser only. Add the Apps Script URL to data.js to enable live sync across all devices.`;

  // Team manager
  renderTeamManager();
}

/* ============================================================
   RESET LOGIN STATS
   ============================================================ */

async function confirmResetStats() {
  if (!confirm('This will clear all login counts and last-seen dates for the whole team. This cannot be undone. Continue?')) return;
  showToast('Resetting stats…');
  await DB.clearLogins();
  showToast('✅ Login stats cleared');
  renderAdmin();
}

/* ============================================================
   ADMIN — TEAM MANAGEMENT
   ============================================================ */

async function renderTeamManager() {
  const container = document.getElementById('teamManagerList');
  container.innerHTML = '<div style="color:var(--white40);font-size:13px">Loading…</div>';

  // Sheet-only members (not in hardcoded TEAM)
  let sheetMembers = [];
  if (DB.isConnected()) {
    try { sheetMembers = await DB.getTeam(); } catch(_) {}
  }

  if (!sheetMembers.length) {
    container.innerHTML = '<div style="color:var(--white40);font-size:13px">No members added via this panel yet.</div>';
    return;
  }

  container.innerHTML = sheetMembers.map(m => `
    <div class="team-manager-row">
      <span>${m.name}</span>
      <span style="color:var(--white40);font-size:12px">PIN: ${m.pin}</span>
      <button class="btn-secondary" onclick="confirmRemoveMember('${m.name}')" style="font-size:11px;padding:4px 12px;margin-left:auto;">Remove</button>
    </div>
  `).join('');
}

async function addTeamMember() {
  const nameInput = document.getElementById('newMemberName');
  const pinInput  = document.getElementById('newMemberPin');
  const name = nameInput.value.trim();
  const pin  = pinInput.value.trim() || '23456';

  if (!name) { showToast('Please enter a name'); return; }
  if (TEAM.find(m => m.name.toLowerCase() === name.toLowerCase())) {
    showToast('That name already exists'); return;
  }
  if (pin.length !== 5 || isNaN(pin)) {
    showToast('PIN must be exactly 5 digits'); return;
  }

  showToast('Adding member…');
  const result = await DB.addTeamMember(name, pin);
  if (result && result.ok === false) { showToast('Error: ' + result.error); return; }

  // Add to live TEAM array so they appear on login screen immediately (until page refresh)
  TEAM.push({ name, admin: false, pin });
  TEAM.sort((a, b) => a.name.localeCompare(b.name));
  renderLoginGrid();

  nameInput.value = '';
  pinInput.value  = '';
  showToast(`✅ ${name} added! They can log in straight away.`);
  renderTeamManager();
}

async function confirmRemoveMember(name) {
  if (!confirm(`Remove ${name} from the team? They will no longer be able to log in.`)) return;
  showToast('Removing…');
  await DB.removeTeamMember(name);
  // Remove from live TEAM array
  const idx = TEAM.findIndex(m => m.name === name);
  if (idx > -1) TEAM.splice(idx, 1);
  renderLoginGrid();
  showToast(`✅ ${name} removed`);
  renderTeamManager();
}

/* ============================================================
   TOAST
   ============================================================ */

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

/* ============================================================
   BOOT
   ============================================================ */
init();
