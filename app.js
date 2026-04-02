/* ============================================================
   POWDER24 × CLAUDE HUB — app.js
   Main application logic
   ============================================================ */

let currentUser = null;

/* ============================================================
   INIT
   ============================================================ */

function init() {
  renderLoginGrid();
  // Show connection status
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
    completeLogin({ name: 'Guest', admin: false }, false);
    return;
  }
  const member = TEAM.find(m => m.name === name);
  if (!member) return;
  if (member.admin) {
    pinTarget = member;
    openPinModal(member.name);
  } else {
    completeLogin(member, false);
  }
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
  if (pinTarget) completeLogin(pinTarget, false);
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
      if (pinBuffer === ADMIN_PIN) {
        document.getElementById('pinModal').classList.remove('active');
        completeLogin(pinTarget, true);
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

  // Render all tabs
  await renderUpdates();
  await renderConnectors();
  renderAgreementTab();

  showToast(`Welcome back, ${member.name}! 👋`);
}

/* ============================================================
   LOGOUT
   ============================================================ */

function logout() {
  currentUser = null;
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-login').classList.add('active');
  // Reset to home tab
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
   AGREEMENT TAB
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
   UPDATES TAB
   ============================================================ */

async function renderUpdates() {
  const grid = document.getElementById('updatesGrid');
  const adminForm = document.getElementById('adminUpdateForm');

  adminForm.style.display = currentUser.isAdmin ? 'block' : 'none';
  grid.innerHTML = '<div class="loading-state">Loading updates...</div>';

  const updates = await DB.getUpdates();

  if (!updates || updates.length === 0) {
    grid.innerHTML = '<div class="loading-state">No updates yet — check back soon.</div>';
    return;
  }

  grid.innerHTML = [...updates].reverse().map(u => `
    <div class="update-card">
      <div class="update-meta">
        <span class="update-tag">${u.tag}</span>
        <span class="update-date">${u.date} · ${u.author}</span>
      </div>
      <h3>${u.title}</h3>
      <p>${u.body}</p>
    </div>
  `).join('');
}

async function addUpdate() {
  const title  = document.getElementById('newUpdateTitle').value.trim();
  const body   = document.getElementById('newUpdateBody').value.trim();
  const tag    = document.getElementById('newUpdateTag').value;
  if (!title || !body) { showToast('Please fill in both title and summary.'); return; }

  await DB.addUpdate(title, body, tag, currentUser.name);
  document.getElementById('newUpdateTitle').value = '';
  document.getElementById('newUpdateBody').value  = '';
  await renderUpdates();
  showToast('Update posted! 📰');
}

/* ============================================================
   CONNECTORS TAB
   ============================================================ */

async function renderConnectors() {
  const table = document.getElementById('connectorsTable');
  table.innerHTML = '<tbody><tr><td class="loading-state" colspan="20">Loading...</td></tr></tbody>';

  const connectorData = await DB.getConnectors();

  // Build header
  let thead = '<thead><tr><th>Name</th>';
  CONNECTORS.forEach(c => {
    thead += `<th><span class="connector-icon">${c.icon}</span>${c.name}</th>`;
  });
  thead += '</tr></thead>';

  // Build rows
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
  // Fetch all data
  const [agreements, logins, connectorData] = await Promise.all([
    DB.getAgreements(),
    DB.getLogins(),
    DB.getConnectors()
  ]);

  const lastSeen = DB.getLocalLastSeen();

  // --- Stat cards ---
  const totalLogins    = Object.values(logins).reduce((a, b) => a + b, 0);
  const signedCount    = Object.keys(agreements).length;
  const connectorTicks = Object.values(connectorData)
    .reduce((sum, obj) => sum + Object.values(obj).filter(Boolean).length, 0);

  document.getElementById('adminStatCards').innerHTML = [
    { val: TEAM.length,              label: 'Team Members' },
    { val: totalLogins,              label: 'Total Logins' },
    { val: signedCount,              label: 'Agreements Signed' },
    { val: TEAM.length - signedCount,label: 'Yet to Sign' },
    { val: connectorTicks,           label: 'Connectors Logged' },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-val">${s.val}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');

  // --- Merged team table (agreement + login activity) ---
  // Merge localStorage agreements with Sheet agreements so signing is reflected immediately
  const localAgreements = DB.getLocalAgreements();
  const mergedAgreements = { ...agreements, ...localAgreements };

  const maxLogins = Math.max(...TEAM.map(m => logins[m.name] || 0), 1);
  const sorted = [...TEAM].sort((a, b) => (logins[b.name] || 0) - (logins[a.name] || 0));

  let tHtml = '<thead><tr><th>Name</th><th>Agreement</th><th>Date Signed</th><th>Logins</th><th>Last Seen</th><th>Activity</th></tr></thead><tbody>';
  sorted.forEach(m => {
    const sig = mergedAgreements[m.name];
    const n   = logins[m.name] || 0;
    const ls  = lastSeen[m.name] ? new Date(lastSeen[m.name]).toLocaleDateString('en-GB') : 'Never';
    const pct = Math.round((n / maxLogins) * 100);
    tHtml += `<tr>
      <td>${m.name}</td>
      <td><span class="status-pill ${sig ? 'status-yes' : 'status-no'}">${sig ? 'Signed' : 'Pending'}</span></td>
      <td style="color:var(--pink);font-size:12px;font-weight:600">${sig ? new Date(sig).toLocaleDateString('en-GB') : '—'}</td>
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
