/* =====================================================================
   DataClean Pro — Main Application Logic
   ===================================================================== */

'use strict';

// ── State ──────────────────────────────────────────────────────────────
const state = {
  rawData: [],          // original parsed rows
  cleanedData: [],      // post-cleaning rows
  headers: [],          // column names
  issues: [],           // detected issue objects
  customizations: {},   // issueId -> chosen strategy
  currentView: 'original',
  fileName: '',
  fileSize: 0,
  cleaningApplied: false,
};

// ── DOM Refs ───────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const uploadZone     = $('uploadZone');
const fileInput      = $('fileInput');
const browseBtn      = $('browseBtn');
const fileInfo       = $('fileInfo');
const fileName       = $('fileName');
const fileMeta       = $('fileMeta');
const analyzeBtn     = $('analyzeBtn');
const removeFileBtn  = $('removeFileBtn');
const loadDemoBtn    = $('loadDemoBtn');
const analysisProgress = $('analysisProgress');
const progressBar    = $('progressBar');
const progressStep   = $('progressStep');
const suggestionsSection = $('suggestions-section');
const suggestionsSummary = $('suggestionsSummary');
const issuesList     = $('issuesList');
const approveAllBtn  = $('approveAllBtn');
const dismissAllBtn  = $('dismissAllBtn');
const approvedCount  = $('approvedCount');
const totalIssues    = $('totalIssues');
const applyCleaningBtn = $('applyCleaningBtn');
const previewSection = $('preview-section');
const previewMeta    = $('previewMeta');
const statsBar       = $('statsBar');
const dataTable      = $('dataTable');
const tableHead      = $('tableHead');
const tableBody      = $('tableBody');
const tableFoot      = $('tableFoot');
const viewOriginalBtn = $('viewOriginalBtn');
const viewCleanedBtn  = $('viewCleanedBtn');
const downloadCsvBtn  = $('downloadCsvBtn');
const downloadExcelBtn = $('downloadExcelBtn');
const customizeModal = $('customizeModal');
const modalTitle     = $('modalTitle');
const modalBody      = $('modalBody');
const modalCloseBtn  = $('modalCloseBtn');
const modalCancelBtn = $('modalCancelBtn');
const modalSaveBtn   = $('modalSaveBtn');

// ── Background Particles ───────────────────────────────────────────────
(function spawnParticles() {
  const container = $('bgParticles');
  const colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 1;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      left:${Math.random() * 100}%;
      bottom:-10px;
      animation-duration:${Math.random() * 15 + 10}s;
      animation-delay:${Math.random() * 15}s;
    `;
    container.appendChild(p);
  }
})();

// ── Toast Notifications ────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span style="font-size:1rem">${icons[type]}</span><span>${msg}</span>`;
  $('toastContainer').appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 310);
  }, duration);
}

// ── CSV Parser ────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const parseRow = line => {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        result.push(cur.trim()); cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(l => {
    const vals = parseRow(l);
    const obj  = {};
    headers.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i] : ''; });
    return obj;
  });
  return { headers, rows };
}

// ── Demo Dataset ──────────────────────────────────────────────────────
function generateDemoData() {
  const headers = ['ID', 'Name', 'Age', 'Email', 'Department', 'Salary', 'hire_date', 'Score'];
  const depts = ['Engineering', 'Marketing', 'HR', 'Sales', 'Finance', 'engineering', 'SALES', 'hr'];
  const names = ['Alice Johnson', 'Bob  Smith', 'charlie davis', 'Diana Prince', 'EVAN THOMAS',
                 'alice johnson', 'Frank Miller', 'Grace Lee', 'Henry Wilson', 'Ivy Clark',
                 'Jack Brown', 'Kate Davis', '', 'Liam Moore', 'Mia Taylor',
                 'Noah Anderson', 'Olivia Martin', 'Paul Jackson', 'QUINN White', 'Rachel Harris'];
  const emails = ['alice@company.com', 'bob@company', 'charlie.davis@company.com', '', 'evan@company.com',
                  'alice@company.com', 'frank@company.com', 'GRACE@COMPANY.COM', 'henry@company.com', 'ivy@company.com',
                  'jack@company.com', 'kate@company.com', 'liam@company.com', 'mia@company.com', 'noah@',
                  'olivia@company.com', 'paul@company.com', 'quinn@company.com', 'rachel@company.com', 'bob@company'];
  const salaries = [72000, 85000, 63000, '', 91000, 72000, 45000, 58000, 77000, 999999,
                    60000, 82000, 69000, 54000, 78000, 88000, 'eighty thousand', 71000, '', 85000];
  const ages = [28, 34, 22, 41, '', 28, 150, 29, 36, 45, 31, '', 27, 38, 44, 33, 29, 47, 26, 34];
  const scores = [88, 72, 95, 61, 84, 88, 77, '', 90, 55, 83, 79, 68, 92, 74, 85, 71, 89, '', 72];
  const dates = ['2020-03-15', '2019-07-22', '2021-01-10', '2018-11-05', '2022-06-30',
                 '2020-03-15', '2017-09-14', '15/04/2020', '2021-08-01', '2016-02-28',
                 '2023-01-18', '2019-05-07', '31-12-2020', '2022-03-25', '2020-10-11',
                 '2021-07-19', '2023-04-02', '2018-06-13', '2022-09-08', '2019-07-22'];

  const rows = [];
  for (let i = 0; i < 20; i++) {
    rows.push({
      ID: i + 1,
      Name: names[i],
      Age: ages[i],
      Email: emails[i],
      Department: depts[i % depts.length],
      Salary: salaries[i],
      hire_date: dates[i],
      Score: scores[i],
    });
  }
  return { headers, rows };
}

// ── File Handling ─────────────────────────────────────────────────────
browseBtn.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('click', e => { if (e.target === uploadZone) fileInput.click(); });

fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

uploadZone.addEventListener('dragover',  e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

removeFileBtn.addEventListener('click', () => {
  fileInput.value = '';
  fileInfo.style.display = 'none';
  suggestionsSection.style.display = 'none';
  previewSection.style.display = 'none';
  state.rawData = [];
  state.headers = [];
  state.issues  = [];
  showToast('File removed', 'info');
});

loadDemoBtn.addEventListener('click', () => {
  const demo = generateDemoData();
  state.rawData  = demo.rows;
  state.headers  = demo.headers;
  state.fileName = 'employee_data_demo.csv';
  state.fileSize = 0;
  fileName.textContent = state.fileName;
  fileMeta.textContent = `${state.rawData.length} rows · ${state.headers.length} columns · Demo dataset`;
  fileInfo.style.display = 'flex';
  showToast('Demo dataset loaded!', 'success');
});

function handleFile(file) {
  const allowed = ['text/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
    showToast('Unsupported file type. Please upload CSV or Excel.', 'error'); return;
  }
  if (file.size > 52428800) { showToast('File too large (max 50 MB)', 'error'); return; }
  state.fileName = file.name;
  state.fileSize = file.size;

  const reader = new FileReader();
  reader.onload = e => {
    const { headers, rows } = parseCSV(e.target.result);
    if (!headers.length) { showToast('Could not parse file. Is it a valid CSV?', 'error'); return; }
    state.rawData = rows;
    state.headers = headers;
    fileName.textContent = file.name;
    fileMeta.textContent = `${rows.length} rows · ${headers.length} columns · ${formatBytes(file.size)}`;
    fileInfo.style.display = 'flex';
    showToast('File loaded successfully', 'success');
  };
  reader.readAsText(file);
}

analyzeBtn.addEventListener('click', startAnalysis);

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ── Analysis ──────────────────────────────────────────────────────────
function startAnalysis() {
  if (!state.rawData.length) { showToast('Please upload a dataset first', 'warning'); return; }

  suggestionsSection.style.display = 'none';
  previewSection.style.display = 'none';
  analysisProgress.style.display = 'block';
  analysisProgress.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const steps = [
    { label: 'Scanning columns…',       pct: 15 },
    { label: 'Detecting missing values…', pct: 35 },
    { label: 'Checking duplicates…',     pct: 55 },
    { label: 'Profiling data types…',    pct: 72 },
    { label: 'Detecting outliers…',      pct: 87 },
    { label: 'Checking text formats…',   pct: 96 },
    { label: 'Compiling report…',        pct: 100 },
  ];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) {
      setTimeout(() => {
        analysisProgress.style.display = 'none';
        runAnalysis();
      }, 400);
      return;
    }
    progressStep.textContent = steps[i].label;
    progressBar.style.width  = steps[i].pct + '%';
    i++;
    setTimeout(tick, 380 + Math.random() * 200);
  };
  tick();
}

function runAnalysis() {
  state.issues  = [];
  state.customizations = {};
  const data    = state.rawData;
  const headers = state.headers;

  // 1. Missing Values (per column)
  headers.forEach(col => {
    const missing = data.filter(r => {
      const v = String(r[col] ?? '').trim();
      return v === '' || v.toLowerCase() === 'null' || v.toLowerCase() === 'nan' || v.toLowerCase() === 'na';
    });
    if (missing.length > 0) {
      // determine numeric or categorical
      const nonEmpty = data.filter(r => String(r[col] ?? '').trim() !== '');
      const isNumeric = nonEmpty.length > 0 && nonEmpty.every(r => !isNaN(parseFloat(r[col])));
      state.issues.push({
        id: `missing_${col}`,
        type: 'missing',
        icon: '⚠️',
        color: '#f59e0b',
        badgeClass: 'badge-warning',
        badgeText: 'Missing',
        column: col,
        count: missing.length,
        title: `${missing.length} missing value${missing.length > 1 ? 's' : ''} in "${col}"`,
        description: `${((missing.length / data.length) * 100).toFixed(1)}% of rows have empty values in this column.`,
        suggestion: isNumeric
          ? `Fill with <strong>median</strong> value (recommended for numeric columns)`
          : `Fill with <strong>mode</strong> (most frequent value)`,
        defaultStrategy: isNumeric ? 'median' : 'mode',
        isNumeric,
        approved: false,
        dismissed: false,
        customized: false,
      });
    }
  });

  // 2. Duplicate Rows
  const seen = new Map();
  let dupeCount = 0;
  data.forEach((row, i) => {
    const key = headers.map(h => String(row[h] ?? '')).join('|||');
    if (seen.has(key)) dupeCount++;
    else seen.set(key, i);
  });
  if (dupeCount > 0) {
    state.issues.push({
      id: 'duplicates',
      type: 'duplicate',
      icon: '🔁',
      color: '#ef4444',
      badgeClass: 'badge-danger',
      badgeText: 'Duplicates',
      column: null,
      count: dupeCount,
      title: `${dupeCount} duplicate row${dupeCount > 1 ? 's' : ''} detected`,
      description: `These rows are exact duplicates and may skew analysis results.`,
      suggestion: `<strong>Remove</strong> all duplicate rows, keeping the first occurrence.`,
      defaultStrategy: 'remove',
      approved: false,
      dismissed: false,
      customized: false,
    });
  }

  // 3. Type Inconsistencies (columns that seem numeric but have non-numeric)
  headers.forEach(col => {
    const vals = data.map(r => String(r[col] ?? '').trim()).filter(v => v !== '');
    const numericCount = vals.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
    if (numericCount > vals.length * 0.7 && numericCount < vals.length) {
      const bad = vals.length - numericCount;
      state.issues.push({
        id: `type_${col}`,
        type: 'type',
        icon: '🔧',
        color: '#3b82f6',
        badgeClass: 'badge-info',
        badgeText: 'Type Error',
        column: col,
        count: bad,
        title: `${bad} non-numeric value${bad > 1 ? 's' : ''} in "${col}"`,
        description: `Column "${col}" appears numeric but contains ${bad} non-numeric entr${bad > 1 ? 'ies' : 'y'}.`,
        suggestion: `<strong>Convert</strong> column to numeric; non-convertible values → NaN, then fill with median.`,
        defaultStrategy: 'coerce_numeric',
        isNumeric: true,
        approved: false,
        dismissed: false,
        customized: false,
      });
    }
  });

  // 4. Outliers (IQR method for numeric columns)
  headers.forEach(col => {
    const nums = data
      .map(r => parseFloat(r[col]))
      .filter(v => !isNaN(v));
    if (nums.length < 5) return;
    nums.sort((a, b) => a - b);
    const q1  = nums[Math.floor(nums.length * 0.25)];
    const q3  = nums[Math.floor(nums.length * 0.75)];
    const iqr = q3 - q1;
    const lo  = q1 - 1.5 * iqr;
    const hi  = q3 + 1.5 * iqr;
    const outliers = nums.filter(v => v < lo || v > hi);
    if (outliers.length > 0) {
      state.issues.push({
        id: `outlier_${col}`,
        type: 'outlier',
        icon: '📊',
        color: '#8b5cf6',
        badgeClass: 'badge-purple',
        badgeText: 'Outlier',
        column: col,
        count: outliers.length,
        title: `${outliers.length} outlier${outliers.length > 1 ? 's' : ''} in "${col}"`,
        description: `Values outside IQR range [${lo.toFixed(1)} – ${hi.toFixed(1)}]. Max outlier: ${Math.max(...outliers).toFixed(1)}.`,
        suggestion: `<strong>Cap</strong> outliers to IQR fence values (Winsorization).`,
        defaultStrategy: 'cap',
        lo, hi,
        isNumeric: true,
        approved: false,
        dismissed: false,
        customized: false,
      });
    }
  });

  // 5. Inconsistent Text (mixed case, extra spaces)
  headers.forEach(col => {
    const vals = data.map(r => String(r[col] ?? '').trim()).filter(v => v !== '');
    const hasUpper  = vals.some(v => v !== v.toLowerCase());
    const hasLower  = vals.some(v => v !== v.toUpperCase());
    const hasSpaces = data.some(r => String(r[col] ?? '').includes('  '));
    const unique    = [...new Set(vals.map(v => v.toLowerCase()))];
    const hasDupeCI = unique.length < new Set(vals).size * 0.8;

    if ((hasUpper && hasLower && hasDupeCI) || hasSpaces) {
      state.issues.push({
        id: `text_${col}`,
        type: 'text',
        icon: '✏️',
        color: '#10b981',
        badgeClass: 'badge-success',
        badgeText: 'Text',
        column: col,
        count: vals.length,
        title: `Inconsistent text formatting in "${col}"`,
        description: `Mixed casing or extra whitespace detected. May cause groupby/join errors.`,
        suggestion: `<strong>Standardize</strong> to Title Case and trim extra spaces.`,
        defaultStrategy: 'titlecase',
        approved: false,
        dismissed: false,
        customized: false,
      });
    }
  });

  if (!state.issues.length) {
    showToast('No issues detected — your dataset looks clean! 🎉', 'success');
    renderPreview(state.rawData, []);
    previewSection.style.display = 'block';
    previewSection.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  renderSuggestions();
  suggestionsSection.style.display = 'block';
  suggestionsSection.scrollIntoView({ behavior: 'smooth' });
  showToast(`${state.issues.length} issue${state.issues.length > 1 ? 's' : ''} detected`, 'warning');
}

// ── Render Suggestions ────────────────────────────────────────────────
function renderSuggestions() {
  const total = state.issues.length;
  totalIssues.textContent   = total;
  updateApproveCount();
  suggestionsSummary.textContent = `${total} issue${total > 1 ? 's' : ''} detected across your dataset`;
  issuesList.innerHTML = '';

  state.issues.forEach(issue => {
    const card = document.createElement('div');
    card.className = `issue-card${issue.approved ? ' approved' : ''}${issue.dismissed ? ' dismissed' : ''}`;
    card.dataset.id = issue.id;
    card.style.setProperty('--issue-color', issue.color);

    card.innerHTML = `
      <div class="issue-top">
        <div class="issue-icon" style="background:${issue.color}20;">${issue.icon}</div>
        <div class="issue-content">
          <div class="issue-title">${issue.title}</div>
          <div class="issue-description">${issue.description}</div>
        </div>
        <span class="issue-badge ${issue.badgeClass}">${issue.badgeText}</span>
      </div>
      <div class="issue-suggestion">💡 Suggested fix: ${issue.suggestion}</div>
      <div class="issue-actions" id="actions_${issue.id}">
        ${buildActionButtons(issue)}
      </div>
      <div class="customize-panel" id="panel_${issue.id}"></div>
    `;
    issuesList.appendChild(card);
  });

  // Bind buttons
  state.issues.forEach(issue => bindIssueButtons(issue));
}

function buildActionButtons(issue) {
  if (issue.dismissed) {
    return `<span style="font-size:0.8rem;color:var(--text-muted)">Issue dismissed</span>
            <button class="btn btn-ghost btn-sm" onclick="undismissIssue('${issue.id}')">Restore</button>`;
  }
  if (issue.approved) {
    return `<span class="approved-tag">✓ Approved — ${strategyLabel(issue)}</span>
            <button class="btn btn-ghost btn-sm" onclick="unapproveIssue('${issue.id}')">Undo</button>`;
  }
  return `
    <button class="btn btn-approve btn-sm" id="approve_${issue.id}">✓ Approve Cleaning</button>
    <button class="btn btn-customize btn-sm" id="customize_${issue.id}">⚙ Customize</button>
    <button class="btn btn-dismiss btn-sm" id="dismiss_${issue.id}">✕ Dismiss</button>
  `;
}

function strategyLabel(issue) {
  const strat = state.customizations[issue.id] || issue.defaultStrategy;
  const labels = {
    median: 'Fill with Median',
    mean:   'Fill with Mean',
    mode:   'Fill with Mode',
    custom: 'Fill with Custom Value',
    remove: 'Remove Duplicates',
    coerce_numeric: 'Convert to Numeric',
    cap:    'Cap Outliers',
    remove_outliers: 'Remove Outliers',
    lowercase:  'Lowercase',
    uppercase:  'Uppercase',
    titlecase:  'Title Case',
    trim:       'Trim Spaces',
    to_integer: 'Convert to Integer',
    to_float:   'Convert to Float',
    to_string:  'Convert to String',
  };
  return labels[strat] || strat;
}

function bindIssueButtons(issue) {
  const approveEl   = $(`approve_${issue.id}`);
  const customizeEl = $(`customize_${issue.id}`);
  const dismissEl   = $(`dismiss_${issue.id}`);
  if (approveEl)   approveEl.addEventListener('click',   () => approveIssue(issue.id));
  if (customizeEl) customizeEl.addEventListener('click', () => openCustomizePanel(issue.id));
  if (dismissEl)   dismissEl.addEventListener('click',   () => dismissIssue(issue.id));
}

function refreshIssueCard(issueId) {
  const issue = state.issues.find(i => i.id === issueId);
  if (!issue) return;
  const card = document.querySelector(`.issue-card[data-id="${issueId}"]`);
  if (!card) return;
  card.className = `issue-card${issue.approved ? ' approved' : ''}${issue.dismissed ? ' dismissed' : ''}`;
  const actions = $(`actions_${issueId}`);
  if (actions) actions.innerHTML = buildActionButtons(issue);
  bindIssueButtons(issue);
  updateApproveCount();
}

function approveIssue(id) {
  const issue = state.issues.find(i => i.id === id);
  if (!issue) return;
  issue.approved  = true;
  issue.dismissed = false;
  refreshIssueCard(id);
  showToast(`"${issue.title}" approved`, 'success', 2500);
}

window.unapproveIssue = function(id) {
  const issue = state.issues.find(i => i.id === id);
  if (!issue) return;
  issue.approved  = false;
  issue.customized = false;
  refreshIssueCard(id);
  updateApproveCount();
};

function dismissIssue(id) {
  const issue = state.issues.find(i => i.id === id);
  if (!issue) return;
  issue.dismissed = true;
  issue.approved  = false;
  refreshIssueCard(id);
  updateApproveCount();
  showToast('Issue dismissed', 'info', 2000);
}

window.undismissIssue = function(id) {
  const issue = state.issues.find(i => i.id === id);
  if (!issue) return;
  issue.dismissed = false;
  refreshIssueCard(id);
};

function updateApproveCount() {
  const count = state.issues.filter(i => i.approved).length;
  approvedCount.textContent = count;
  applyCleaningBtn.disabled = count === 0;
}

// ── Approve / Dismiss All ─────────────────────────────────────────────
approveAllBtn.addEventListener('click', () => {
  state.issues.forEach(i => { if (!i.dismissed) { i.approved = true; } });
  state.issues.forEach(i => refreshIssueCard(i.id));
  showToast('All issues approved!', 'success');
});
dismissAllBtn.addEventListener('click', () => {
  state.issues.forEach(i => { i.approved = false; i.dismissed = true; });
  state.issues.forEach(i => refreshIssueCard(i.id));
  showToast('All issues dismissed', 'info');
});

// ── Inline Customize Panel ─────────────────────────────────────────────
function openCustomizePanel(id) {
  const issue = state.issues.find(i => i.id === id);
  if (!issue) return;
  const panel = $(`panel_${id}`);
  if (!panel) return;

  // Toggle
  if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }

  panel.innerHTML = buildCustomizeHTML(issue);
  panel.classList.add('open');

  // wire radio selections
  panel.querySelectorAll('.option-item').forEach(item => {
    item.addEventListener('click', () => {
      panel.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      const val = item.dataset.value;

      // Show/hide custom input
      const customRow = panel.querySelector('.custom-value-row');
      if (customRow) customRow.style.display = (val === 'custom') ? 'flex' : 'none';

      state.customizations[id] = val;
    });
  });

  const saveBtn = panel.querySelector('.save-customize-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const strat = state.customizations[id] || issue.defaultStrategy;
      if (strat === 'custom') {
        const customInput = panel.querySelector('.custom-input');
        state.customizations[id + '_customValue'] = customInput ? customInput.value : '';
      }
      issue.approved  = true;
      issue.dismissed = false;
      issue.customized = true;
      panel.classList.remove('open');
      refreshIssueCard(id);
      showToast(`Customized: ${strategyLabel(issue)}`, 'success', 2500);
    });
  }
}

function buildCustomizeHTML(issue) {
  const strat = state.customizations[issue.id] || issue.defaultStrategy;

  const groups = {
    missing: {
      label: 'Fill Strategy',
      options: [
        { value: 'median', label: '📊 Median (best for skewed data)' },
        { value: 'mean',   label: '➗ Mean (best for normal data)' },
        { value: 'mode',   label: '🎯 Mode (most frequent value)' },
        { value: 'custom', label: '✏️ Custom value' },
      ],
      showCustom: true,
    },
    duplicate: {
      label: 'Duplicate Strategy',
      options: [
        { value: 'remove',       label: '🗑 Remove duplicates (keep first)' },
        { value: 'remove_last',  label: '🗑 Remove duplicates (keep last)' },
        { value: 'flag',         label: '🚩 Flag duplicates (add is_duplicate column)' },
      ],
    },
    type: {
      label: 'Type Conversion',
      options: [
        { value: 'coerce_numeric', label: '🔢 Convert to numeric (invalid → NaN)' },
        { value: 'to_integer',     label: '🔢 Convert to integer' },
        { value: 'to_float',       label: '🔢 Convert to float' },
        { value: 'to_string',      label: '🔤 Convert to string' },
      ],
    },
    outlier: {
      label: 'Outlier Strategy',
      options: [
        { value: 'cap',             label: '📌 Cap to IQR fence (Winsorize)' },
        { value: 'remove_outliers', label: '🗑 Remove rows with outliers' },
        { value: 'median',          label: '📊 Replace with median' },
      ],
    },
    text: {
      label: 'Text Standardization',
      options: [
        { value: 'titlecase',  label: '🅃 Title Case' },
        { value: 'lowercase',  label: '🅛 lowercase' },
        { value: 'uppercase',  label: '🅄 UPPERCASE' },
        { value: 'trim',       label: '✂️ Trim extra whitespace only' },
      ],
    },
  };

  const group = groups[issue.type] || groups.missing;

  return `
    <div class="customize-panel-title">⚙ Customize: ${issue.title}</div>
    <div class="customize-grid">
      ${group.options.map(o => `
        <label class="option-item${strat === o.value ? ' selected' : ''}" data-value="${o.value}">
          <input type="radio" name="strat_${issue.id}" value="${o.value}" ${strat === o.value ? 'checked' : ''} style="display:none">
          ${o.label}
        </label>
      `).join('')}
    </div>
    ${group.showCustom ? `
      <div class="custom-value-row" style="display:${strat === 'custom' ? 'flex' : 'none'}; margin-top:10px;">
        <input class="custom-input" type="text" placeholder="Enter custom fill value…">
      </div>
    ` : ''}
    <div style="margin-top:12px; display:flex; justify-content:flex-end;">
      <button class="btn btn-primary btn-sm save-customize-btn">Save & Approve</button>
    </div>
  `;
}

// ── Apply Cleaning ─────────────────────────────────────────────────────
applyCleaningBtn.addEventListener('click', applyCleaning);

function applyCleaning() {
  const approvedIssues = state.issues.filter(i => i.approved);
  if (!approvedIssues.length) { showToast('No issues approved for cleaning', 'warning'); return; }

  applyCleaningBtn.disabled = true;
  applyCleaningBtn.innerHTML = '<span class="progress-spinner" style="width:16px;height:16px;border-width:2px;"></span> Cleaning…';

  setTimeout(() => {
    let data = state.rawData.map(row => ({ ...row }));

    approvedIssues.forEach(issue => {
      const strat = state.customizations[issue.id] || issue.defaultStrategy;
      data = applyStrategy(data, issue, strat);
    });

    state.cleanedData = data;
    state.cleaningApplied = true;

    // restore button
    applyCleaningBtn.disabled = false;
    applyCleaningBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 9l4 4 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg> Apply Cleaning`;

    // Show preview
    const changes = detectChanges(state.rawData, state.cleanedData);
    renderPreview(state.cleanedData, changes);
    previewSection.style.display = 'block';
    state.currentView = 'cleaned';
    setActiveView('cleaned');
    previewSection.scrollIntoView({ behavior: 'smooth' });
    showToast(`Cleaning applied! ${approvedIssues.length} operation${approvedIssues.length > 1 ? 's' : ''} complete.`, 'success', 4000);
  }, 800);
}

function applyStrategy(data, issue, strat) {
  const col = issue.column;

  switch (strat) {
    // Missing value strategies
    case 'median': {
      const vals = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v)).sort((a, b) => a - b);
      const med  = vals.length % 2 === 0
        ? (vals[vals.length/2-1] + vals[vals.length/2]) / 2
        : vals[Math.floor(vals.length/2)];
      return data.map(r => isMissing(r[col]) ? { ...r, [col]: med } : r);
    }
    case 'mean': {
      const vals = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
      const avg  = vals.reduce((a, b) => a + b, 0) / vals.length;
      return data.map(r => isMissing(r[col]) ? { ...r, [col]: parseFloat(avg.toFixed(4)) } : r);
    }
    case 'mode': {
      const freq = {};
      data.forEach(r => { const v = String(r[col] ?? '').trim(); if (v) freq[v] = (freq[v]||0)+1; });
      const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      return data.map(r => isMissing(r[col]) ? { ...r, [col]: mode } : r);
    }
    case 'custom': {
      const val = state.customizations[issue.id + '_customValue'] ?? '';
      return data.map(r => isMissing(r[col]) ? { ...r, [col]: val } : r);
    }

    // Duplicate strategies
    case 'remove':
    case 'remove_last': {
      const seen = new Map();
      const keep = strat === 'remove' ? [] : data.map((_, i) => i);
      if (strat === 'remove') {
        data.forEach((row, i) => {
          const key = state.headers.map(h => String(row[h] ?? '')).join('|||');
          if (!seen.has(key)) { seen.set(key, true); keep.push(i); }
        });
      } else {
        const seenLast = new Map();
        data.forEach((row, i) => {
          const key = state.headers.map(h => String(row[h] ?? '')).join('|||');
          seenLast.set(key, i);
        });
        return data.filter((_, i) => [...seenLast.values()].includes(i));
      }
      return keep.map(i => data[i]);
    }
    case 'flag': {
      const seen2 = new Map();
      return data.map(row => {
        const key = state.headers.map(h => String(row[h] ?? '')).join('|||');
        const isDupe = seen2.has(key);
        if (!isDupe) seen2.set(key, true);
        return { ...row, is_duplicate: isDupe ? 'true' : 'false' };
      });
    }

    // Type conversion
    case 'coerce_numeric':
    case 'to_float': {
      return data.map(r => {
        const v = parseFloat(r[col]);
        const filled = isMissing(isNaN(v) ? '' : v) || isNaN(v);
        if (filled) {
          // fill NaN created by coercion with median
          const vals2 = data.map(x => parseFloat(x[col])).filter(v2 => !isNaN(v2)).sort((a,b)=>a-b);
          const med2  = vals2.length % 2 === 0
            ? (vals2[vals2.length/2-1] + vals2[vals2.length/2]) / 2
            : vals2[Math.floor(vals2.length/2)];
          return { ...r, [col]: isNaN(v) ? med2 : v };
        }
        return { ...r, [col]: v };
      });
    }
    case 'to_integer': {
      return data.map(r => {
        const v = parseInt(r[col]);
        return { ...r, [col]: isNaN(v) ? 0 : v };
      });
    }
    case 'to_string': {
      return data.map(r => ({ ...r, [col]: String(r[col] ?? '') }));
    }

    // Outlier strategies
    case 'cap': {
      return data.map(r => {
        const v = parseFloat(r[col]);
        if (isNaN(v)) return r;
        return { ...r, [col]: Math.min(Math.max(v, issue.lo), issue.hi) };
      });
    }
    case 'remove_outliers': {
      return data.filter(r => {
        const v = parseFloat(r[col]);
        if (isNaN(v)) return true;
        return v >= issue.lo && v <= issue.hi;
      });
    }

    // Text strategies
    case 'titlecase': {
      return data.map(r => {
        const v = String(r[col] ?? '').trim();
        return { ...r, [col]: v.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()) };
      });
    }
    case 'lowercase': {
      return data.map(r => ({ ...r, [col]: String(r[col] ?? '').toLowerCase().trim() }));
    }
    case 'uppercase': {
      return data.map(r => ({ ...r, [col]: String(r[col] ?? '').toUpperCase().trim() }));
    }
    case 'trim': {
      return data.map(r => ({ ...r, [col]: String(r[col] ?? '').replace(/\s+/g, ' ').trim() }));
    }

    default: return data;
  }
}

function isMissing(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s === '' || s === 'null' || s === 'nan' || s === 'na';
}

function detectChanges(original, cleaned) {
  const changes = new Set();
  original.forEach((row, i) => {
    if (!cleaned[i]) return;
    state.headers.forEach(col => {
      if (String(row[col]) !== String(cleaned[i][col])) {
        changes.add(`${i}__${col}`);
      }
    });
  });
  return changes;
}

// ── Render Preview ─────────────────────────────────────────────────────
function renderPreview(data, changes) {
  const headers = [...state.headers];
  if (data.length > 0 && data[0].is_duplicate !== undefined && !headers.includes('is_duplicate')) {
    headers.push('is_duplicate');
  }

  // Stats
  const rows   = data.length;
  const cols   = headers.length;
  const totalCells = rows * cols;
  const missingCells = data.reduce((acc, row) =>
    acc + headers.filter(h => isMissing(row[h])).length, 0);
  const changedCount = changes ? changes.size : 0;

  statsBar.innerHTML = [
    { label: 'Rows',    value: rows.toLocaleString() },
    { label: 'Columns', value: cols },
    { label: 'Missing', value: missingCells.toLocaleString() },
    { label: 'Changed', value: changedCount.toLocaleString() },
    { label: 'Complete',value: totalCells ? ((1 - missingCells/totalCells)*100).toFixed(1)+'%' : '—' },
  ].map(s => `
    <div class="stat-item">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');

  // Table (max 100 rows shown)
  const displayRows = data.slice(0, 100);

  tableHead.innerHTML = `<tr>${headers.map(h =>
    `<th title="${h}">${h}</th>`
  ).join('')}</tr>`;

  tableBody.innerHTML = displayRows.map((row, ri) =>
    `<tr>${headers.map(col => {
      const val = row[col];
      const empty  = isMissing(val);
      const changed = changes && changes.has(`${ri}__${col}`);
      const cls = changed ? 'cell-changed' : empty ? 'cell-null' : '';
      const display = empty ? 'null' : String(val);
      return `<td class="${cls}" title="${display}">${display}</td>`;
    }).join('')}</tr>`
  ).join('');

  tableFoot.textContent = data.length > 100
    ? `Showing first 100 of ${data.length.toLocaleString()} rows`
    : `${data.length.toLocaleString()} rows total`;

  previewMeta.textContent = changes && changes.size > 0
    ? `${data.length} rows · ${headers.length} columns · ${changes.size} cells changed`
    : `${data.length} rows · ${headers.length} columns`;
}

// ── View Toggle ────────────────────────────────────────────────────────
viewOriginalBtn.addEventListener('click', () => {
  setActiveView('original');
  renderPreview(state.rawData, null);
});
viewCleanedBtn.addEventListener('click', () => {
  if (!state.cleaningApplied) { showToast('Apply cleaning first to see the cleaned view', 'warning'); return; }
  setActiveView('cleaned');
  const changes = detectChanges(state.rawData, state.cleanedData);
  renderPreview(state.cleanedData, changes);
});

function setActiveView(view) {
  state.currentView = view;
  viewOriginalBtn.classList.toggle('active', view === 'original');
  viewCleanedBtn.classList.toggle('active',  view === 'cleaned');
}

// ── Download ───────────────────────────────────────────────────────────
downloadCsvBtn.addEventListener('click', () => downloadCSV());
downloadExcelBtn.addEventListener('click', () => downloadExcel());

function getDownloadData() {
  return state.cleaningApplied ? state.cleanedData : state.rawData;
}
function getDownloadHeaders() {
  const data = getDownloadData();
  const extra = data.length && data[0].is_duplicate !== undefined ? ['is_duplicate'] : [];
  return [...state.headers, ...extra.filter(h => !state.headers.includes(h))];
}

function downloadCSV() {
  const data    = getDownloadData();
  const headers = getDownloadHeaders();
  if (!data.length || !headers.length) {
    showToast('No data to export. Load a dataset first.', 'warning'); return;
  }
  const escape = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.map(escape).join(','),
    ...data.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\r\n');
  downloadBlob(csv, 'text/csv;charset=utf-8;', 'cleaned_data.csv');
  showToast('CSV downloaded!', 'success');
}

function downloadExcel() {
  const data    = getDownloadData();
  const headers = getDownloadHeaders();
  if (!data.length || !headers.length) {
    showToast('No data to export. Load a dataset first.', 'warning'); return;
  }
  const tsv = [
    headers.join('\t'),
    ...data.map(row => headers.map(h => String(row[h] ?? '')).join('\t')),
  ].join('\r\n');
  downloadBlob(tsv, 'application/vnd.ms-excel', 'cleaned_data.xls');
  showToast('Excel file downloaded!', 'success');
}

function downloadBlob(content, mimeType, fileName) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Delay revoke so the browser has time to start the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

// ── Modal ──────────────────────────────────────────────────────────────
modalCloseBtn.addEventListener('click',  closeModal);
modalCancelBtn.addEventListener('click', closeModal);
customizeModal.addEventListener('click', e => { if (e.target === customizeModal) closeModal(); });

function closeModal() {
  customizeModal.style.display = 'none';
}

// ── Init ───────────────────────────────────────────────────────────────
(function init() {
  // Auto-load demo on first visit hint
  setTimeout(() => {
    showToast('Welcome to DataClean Pro! Upload a CSV or try our demo dataset.', 'info', 5000);
  }, 1200);
})();
