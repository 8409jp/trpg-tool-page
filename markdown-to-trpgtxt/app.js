'use strict';

// ============================================================
// DEFAULT SETTINGS
// ============================================================
const DEFAULT_SETTINGS = {
  indentUnit: 2,
  indentChar: 'half', // 'half' | 'full'
  rules: [
    // ── Block rules ─────────────────────────────────────────
    // output template uses {content}
    {
      id: 'code-block',
      name: 'コードブロック',
      type: 'block',
      blockType: 'code',
      enabled: true,
      outputTemplate: '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n{content}\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄',
    },
    {
      id: 'blockquote',
      name: '引用',
      type: 'block',
      blockType: 'blockquote',
      enabled: true,
      outputTemplate: '╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌\n{content}\n╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌',
    },
    {
      id: 'alert',
      name: 'アラート（汎用）',
      type: 'block',
      blockType: 'alert',
      enabled: true,
      // {type} = NOTE/TIP etc., {label} = ": タイトル" or "", {content} = body
      outputTemplate: '▄▄▄▄▄▄▄▄▄▄\n[ {type}{label}]\n{content}\n▀▀▀▀▀▀▀▀▀▀',
    },
    // ── List rules ──────────────────────────────────────────
    // output template uses {text} (and {num} for ol)
    // indentation is applied automatically by the engine
    {
      id: 'ul',
      name: '箇条書き',
      type: 'list',
      listType: 'ul',
      enabled: true,
      outputTemplate: '・{text}',
    },
    {
      id: 'ol',
      name: '番号付きリスト',
      type: 'list',
      listType: 'ol',
      enabled: true,
      outputTemplate: '({num}). {text}',
    },
    // ── Line rules ──────────────────────────────────────────
    // output template uses {text}
    // inputPattern uses {text} as placeholder for matched content
    {
      id: 'h1',
      name: '見出し H1',
      type: 'line',
      inputPattern: '# {text}',
      enabled: true,
      outputTemplate: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n{text}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    },
    {
      id: 'h2',
      name: '見出し H2',
      type: 'line',
      inputPattern: '## {text}',
      enabled: true,
      outputTemplate: '【{text}】',
    },
    {
      id: 'h3',
      name: '見出し H3',
      type: 'line',
      inputPattern: '### {text}',
      enabled: true,
      outputTemplate: '■ {text}',
    },
    {
      id: 'h4',
      name: '見出し H4',
      type: 'line',
      inputPattern: '#### {text}',
      enabled: true,
      outputTemplate: '◆ {text}',
    },
    {
      id: 'h5',
      name: '見出し H5',
      type: 'line',
      inputPattern: '##### {text}',
      enabled: true,
      outputTemplate: '◇ {text}',
    },
    {
      id: 'h6',
      name: '見出し H6',
      type: 'line',
      inputPattern: '###### {text}',
      enabled: true,
      outputTemplate: '○ {text}',
    },
    {
      id: 'hr',
      name: '水平線',
      type: 'line',
      inputPattern: '---', // detected by engine's own regex; user edits outputTemplate only
      enabled: true,
      outputTemplate: '──────────────────────────────',
    },
    // ── Inline rules ────────────────────────────────────────
    // output template uses {text}
    // These are applied within each line after line-level rules
    {
      id: 'bold',
      name: '太字',
      type: 'inline',
      inputPattern: '**{text}**',
      enabled: true,
      outputTemplate: '《{text}》',
    },
    {
      id: 'italic',
      name: '斜体',
      type: 'inline',
      inputPattern: '*{text}*',
      enabled: true,
      outputTemplate: '_{text}_',
    },
    {
      id: 'inline-code',
      name: 'インラインコード',
      type: 'inline',
      inputPattern: '`{text}`',
      enabled: true,
      outputTemplate: '[{text}]',
    },
    {
      id: 'link',
      name: 'リンク',
      type: 'inline',
      inputPattern: '[{text}]({url})',
      enabled: true,
      outputTemplate: '{text}（{url}）',
    },
  ],
};

// ============================================================
// CONVERSION ENGINE
// ============================================================

/** Escape special regex characters in a string. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace all occurrences of {key} in template with vars[key].
 * Does NOT interpret \n – newlines should already be actual newline chars.
 */
function applyTemplate(template, vars) {
  return Object.entries(vars).reduce((result, [key, value]) => {
    return result.replaceAll('{' + key + '}', String(value ?? ''));
  }, template);
}

/** Calculate list indent level from leading whitespace. */
function getIndentLevel(leadingSpaces, settings) {
  const unit = Math.max(1, parseInt(settings.indentUnit, 10) || 2);
  return Math.floor(leadingSpaces.length / unit);
}

/** Build the indent string for a given level. */
function buildIndentStr(level, settings) {
  if (level <= 0) return '';
  const unit = Math.max(1, parseInt(settings.indentUnit, 10) || 2);
  const char = (settings.indentChar === 'full') ? '　' : ' ';
  return char.repeat(unit * level);
}

/** Return the first enabled rule matching the predicate. */
function findRule(rules, predicate) {
  return rules.find(r => r.enabled && predicate(r));
}

/** Apply all enabled inline rules to a string. */
function applyInlineRules(str, rules) {
  let result = str;

  for (const rule of rules) {
    if (!rule.enabled || rule.type !== 'inline') continue;

    try {
      if (rule.id === 'link') {
        // Special: two placeholders {text} and {url}
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
          return applyTemplate(rule.outputTemplate, { text, url });
        });
      } else if (rule.id === 'bold') {
        result = result.replace(/\*\*(.+?)\*\*/g, (_, text) =>
          applyTemplate(rule.outputTemplate, { text })
        );
      } else if (rule.id === 'italic') {
        // Use negative lookahead/lookbehind to avoid matching inside **...**
        result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, text) =>
          applyTemplate(rule.outputTemplate, { text })
        );
      } else if (rule.id === 'inline-code') {
        result = result.replace(/`([^`]+)`/g, (_, text) =>
          applyTemplate(rule.outputTemplate, { text })
        );
      } else if (rule.inputPattern && rule.inputPattern.includes('{text}')) {
        // Generic custom inline rule
        const pat = escapeRegex(rule.inputPattern)
          .replace(escapeRegex('{text}'), '(.+?)');
        const regex = new RegExp(pat, 'g');
        result = result.replace(regex, (_, text) =>
          applyTemplate(rule.outputTemplate, { text })
        );
      }
    } catch (e) {
      // Skip malformed regex
    }
  }

  return result;
}

/**
 * Convert a line-rule inputPattern (e.g. "## {text}") to a RegExp
 * that anchors to the start and end of the line.
 */
function buildLineRegex(inputPattern) {
  if (!inputPattern.includes('{text}')) {
    return new RegExp('^' + escapeRegex(inputPattern) + '$');
  }
  const escaped = escapeRegex(inputPattern)
    .replace(escapeRegex('{text}'), '(.+)');
  return new RegExp('^' + escaped + '$');
}

/**
 * Main conversion function.
 * Processes the markdown string line by line and returns the converted text.
 */
function convert(markdown, settings) {
  const rules = settings.rules || [];
  const lines = markdown.split('\n');
  const output = [];
  let i = 0;

  // Pre-sort heading rules: longest prefix first (H6 before H1) to avoid mis-matching
  const headingRules = rules
    .filter(r => r.enabled && r.type === 'line' && /^#+\s/.test(r.inputPattern))
    .sort((a, b) => {
      const lenA = (a.inputPattern.match(/^#+/) || [''])[0].length;
      const lenB = (b.inputPattern.match(/^#+/) || [''])[0].length;
      return lenB - lenA;
    });

  // Custom line rules (not heading, not hr)
  const customLineRules = rules.filter(r =>
    r.enabled &&
    r.type === 'line' &&
    r.id !== 'hr' &&
    !/^#+\s/.test(r.inputPattern)
  );

  while (i < lines.length) {
    const line = lines[i];

    // ── Code block ─────────────────────────────────────────
    const fenceMatch = line.match(/^(`{3,})/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const codeRule = findRule(rules, r => r.type === 'block' && r.blockType === 'code');
      const contentLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) {
        contentLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      if (codeRule) {
        output.push(applyTemplate(codeRule.outputTemplate, { content: contentLines.join('\n') }));
      } else {
        contentLines.forEach(l => output.push(l));
      }
      continue;
    }

    // ── GitHub-style Alerts (> [!TYPE] optional label) ────────
    // e.g. "> [!NOTE]", ">[!TIP] タイトル", "> [!HOGE]"
    const alertMatch = line.match(/^\s*>\s*\[!([a-zA-Z]+)\](?:\s+(.+))?\s*$/i);
    if (alertMatch) {
      const alertType = alertMatch[1].toUpperCase();
      const rawLabel = (alertMatch[2] ?? '').trim();
      // {label} = ": Title" when present, "" when absent
      const alertLabel = rawLabel ? ': ' + rawLabel : '';
      const alertRule = findRule(rules, r => r.type === 'block' && r.blockType === 'alert');
      const contentLines = [];
      i++;
      while (i < lines.length && /^\s*>\s*/.test(lines[i])) {
        contentLines.push(lines[i].replace(/^\s*>\s*/, ''));
        i++;
      }
      if (alertRule) {
        const content = convert(contentLines.join('\n'), settings);
        output.push(applyTemplate(alertRule.outputTemplate, { type: alertType, label: alertLabel, content }));
      } else {
        contentLines.forEach(l => output.push(l));
      }
      continue;
    }


    // ── Blockquote ─────────────────────────────────────────
    if (/^\s*>\s*/.test(line)) {
      const bqRule = findRule(rules, r => r.type === 'block' && r.blockType === 'blockquote');
      const contentLines = [];
      while (i < lines.length && /^\s*>\s*/.test(lines[i])) {
        contentLines.push(lines[i].replace(/^\s*>\s*/, ''));
        i++;
      }
      if (bqRule) {
        const content = convert(contentLines.join('\n'), settings);
        output.push(applyTemplate(bqRule.outputTemplate, { content }));
      } else {
        contentLines.forEach(l => output.push(l));
      }
      continue;
    }

    // ── Ordered list ───────────────────────────────────────
    const olMatch = line.match(/^(\s*)(\d+)\. (.+)$/);
    if (olMatch) {
      const olRule = findRule(rules, r => r.type === 'list' && r.listType === 'ol');
      if (olRule) {
        const level = getIndentLevel(olMatch[1], settings);
        const num = olMatch[2];
        const text = applyInlineRules(olMatch[3], rules);
        const indent = buildIndentStr(level, settings);
        output.push(indent + applyTemplate(olRule.outputTemplate, { text, num }));
        i++;
        continue;
      }
    }

    // ── Unordered list ─────────────────────────────────────
    const ulMatch = line.match(/^(\s*)[-*+] (.+)$/);
    if (ulMatch) {
      const ulRule = findRule(rules, r => r.type === 'list' && r.listType === 'ul');
      if (ulRule) {
        const level = getIndentLevel(ulMatch[1], settings);
        const text = applyInlineRules(ulMatch[2], rules);
        const indent = buildIndentStr(level, settings);
        output.push(indent + applyTemplate(ulRule.outputTemplate, { text }));
        i++;
        continue;
      }
    }

    // ── Horizontal rule ────────────────────────────────────
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      const hrRule = findRule(rules, r => r.id === 'hr');
      if (hrRule) {
        output.push(hrRule.outputTemplate);
        i++;
        continue;
      }
    }

    // ── Headings ───────────────────────────────────────────
    let matched = false;
    for (const rule of headingRules) {
      const regex = buildLineRegex(rule.inputPattern);
      const m = line.match(regex);
      if (m) {
        const text = applyInlineRules(m[1] ?? '', rules);
        output.push(applyTemplate(rule.outputTemplate, { text }));
        matched = true;
        break;
      }
    }
    if (matched) { i++; continue; }

    // ── Custom line rules ──────────────────────────────────
    for (const rule of customLineRules) {
      if (!rule.inputPattern) continue;
      try {
        const regex = buildLineRegex(rule.inputPattern);
        const m = line.match(regex);
        if (m) {
          const text = m[1] !== undefined ? applyInlineRules(m[1], rules) : '';
          output.push(applyTemplate(rule.outputTemplate, { text }));
          matched = true;
          break;
        }
      } catch (e) {
        // Skip malformed pattern
      }
    }
    if (matched) { i++; continue; }

    // ── Default: pass through with inline rules ────────────
    output.push(applyInlineRules(line, rules));
    i++;
  }

  return output.join('\n');
}

// ============================================================
// SETTINGS PERSISTENCE
// ============================================================
const STORAGE_KEY = 'md2trpg-settings-v3'; // bumped: changed default alert template


function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('設定の読み込みに失敗しました:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function saveSettings(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn('設定の保存に失敗しました:', e);
  }
}

// ============================================================
// APPLICATION STATE
// ============================================================
let settings = loadSettings();
let currentFile = null;
let currentContent = '';
let convertedContent = '';
let settingsDraft = null; // working copy while modal is open

// ============================================================
// DOM REFERENCES
// ============================================================
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileNameEl = document.getElementById('file-name');
const btnChangeFile = document.getElementById('btn-change-file');
const previewEl = document.getElementById('preview');
const previewSourceEl = document.getElementById('preview-source'); // left pane
const previewEmpty = document.getElementById('preview-empty');
const btnClear = document.getElementById('btn-clear');
const btnDownload = document.getElementById('btn-download');
const btnSettings = document.getElementById('btn-settings');

const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const btnSave = document.getElementById('btn-save-settings');
const btnCancel = document.getElementById('btn-cancel-settings');
const btnReset = document.getElementById('btn-reset-settings');
const btnAddRule = document.getElementById('btn-add-rule');
const rulesList = document.getElementById('rules-list');
const indentUnitEl = document.getElementById('indent-unit');
const indentCharEl = document.getElementById('indent-char');

// ============================================================
// SYNCHRONIZED SCROLL (left ↔ right pane)
// ============================================================
let isSyncing = false;
function syncScroll(source, target) {
  if (isSyncing) return;
  isSyncing = true;
  const pct = source.scrollTop / Math.max(1, source.scrollHeight - source.clientHeight);
  target.scrollTop = pct * Math.max(1, target.scrollHeight - target.clientHeight);
  isSyncing = false;
}
previewSourceEl.addEventListener('scroll', () => syncScroll(previewSourceEl, previewEl));
previewEl.addEventListener('scroll', () => syncScroll(previewEl, previewSourceEl));

// ============================================================
// FILE HANDLING
// ============================================================
function handleFile(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'md' && ext !== 'txt') {
    alert('.md または .txt ファイルを選択してください。');
    return;
  }
  currentFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    currentContent = e.target.result;
    showFileInfo(file.name);
    runConvert();
  };
  reader.onerror = () => alert('ファイルの読み込みに失敗しました。');
  reader.readAsText(file, 'UTF-8');
}

function showFileInfo(name) {
  fileNameEl.textContent = name;
  dropZone.classList.add('hidden');
  fileInfo.classList.remove('hidden');
}

function runConvert() {
  convertedContent = convert(currentContent, settings);

  // Left pane: show original Markdown source
  const srcEmpty = document.getElementById('preview-source-empty');
  if (srcEmpty) srcEmpty.remove();
  previewSourceEl.textContent = currentContent;

  // Right pane: show converted result
  const resultEmpty = document.getElementById('preview-empty');
  if (resultEmpty) resultEmpty.remove();
  previewEl.textContent = convertedContent;

  btnClear.disabled = false;
  btnDownload.disabled = false;
}

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
  // Reset so same file can be re-selected
  e.target.value = '';
});

// Drop zone: click to open file dialog
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

// Drag and drop — use a counter to avoid false dragleave on child elements
let dragCounter = 0;

dropZone.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropZone.classList.remove('drag-over');
  }
});
dropZone.addEventListener('dragover', (e) => {
  // Must call preventDefault to allow drop
  e.preventDefault();
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});


// "変更" button in file info bar
btnChangeFile.addEventListener('click', () => fileInput.click());

// Clear button
btnClear.addEventListener('click', () => {
  currentFile = null;
  currentContent = '';
  convertedContent = '';
  fileInfo.classList.add('hidden');
  dropZone.classList.remove('hidden');
  fileNameEl.textContent = '';
  // Reset left pane
  previewSourceEl.innerHTML = '<p class="preview-empty" id="preview-source-empty">ファイルをアップロードすると元のMarkdownが表示されます</p>';
  // Reset right pane
  previewEl.innerHTML = '<p class="preview-empty" id="preview-empty">ファイルをアップロードすると変換結果が表示されます</p>';
  btnClear.disabled = true;
  btnDownload.disabled = true;
});

// Download button
btnDownload.addEventListener('click', () => {
  if (!convertedContent) return;
  const blob = new Blob([convertedContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const base = currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'output';
  a.download = base + '.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// ============================================================
// SETTINGS MODAL
// ============================================================
function openModal() {
  settingsDraft = JSON.parse(JSON.stringify(settings));
  indentUnitEl.value = settingsDraft.indentUnit ?? 2;
  indentCharEl.value = settingsDraft.indentChar ?? 'half';
  renderRules();
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  settingsDraft = null;
}

btnSettings.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// Save
btnSave.addEventListener('click', () => {
  collectRulesFromDOM();
  settings = {
    ...settingsDraft,
    indentUnit: Math.max(1, parseInt(indentUnitEl.value, 10) || 2),
    indentChar: indentCharEl.value || 'half',
  };
  saveSettings(settings);
  closeModal();
  if (currentContent) runConvert();
});

// Reset to defaults
btnReset.addEventListener('click', () => {
  if (!confirm('設定をデフォルトに戻しますか？現在の設定は失われます。')) return;
  settingsDraft = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  indentUnitEl.value = settingsDraft.indentUnit;
  indentCharEl.value = settingsDraft.indentChar;
  renderRules();
});

// Add new rule
btnAddRule.addEventListener('click', () => {
  collectRulesFromDOM();
  settingsDraft.rules.push({
    id: 'custom-' + Date.now(),
    name: '新しいルール',
    type: 'line',
    inputPattern: '{text}',
    outputTemplate: '{text}',
    enabled: true,
  });
  renderRules();
  // Scroll newly added card into view
  const cards = rulesList.querySelectorAll('.rule-card');
  const last = cards[cards.length - 1];
  if (last) last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// ── Collect current DOM values into settingsDraft.rules ─────
function collectRulesFromDOM() {
  if (!settingsDraft) return;
  const cards = Array.from(rulesList.querySelectorAll('.rule-card'));
  settingsDraft.rules = cards.map((card) => {
    const id = card.dataset.ruleId;
    const orig = settingsDraft.rules.find(r => r.id === id) || {};
    const toggle = card.querySelector('.rule-toggle');
    const nameInput = card.querySelector('.rule-body-name'); // moved to body
    const patternArea = card.querySelector('.rule-pattern');
    const templateArea = card.querySelector('.rule-template');
    return {
      ...orig,
      enabled: toggle ? toggle.checked : orig.enabled,
      name: nameInput ? nameInput.value : orig.name,
      // Only update inputPattern for editable (line) rules
      inputPattern: (patternArea && !patternArea.readOnly)
        ? patternArea.value
        : orig.inputPattern,
      outputTemplate: templateArea ? templateArea.value : orig.outputTemplate,
    };
  });
}

// ── Render all rule cards ────────────────────────────────────
function renderRules() {
  rulesList.innerHTML = '';
  settingsDraft.rules.forEach((rule) => {
    rulesList.appendChild(createRuleCard(rule));
  });
}

// ── Human-readable pattern descriptions for read-only rules ─
const BLOCK_PATTERN_HINTS = {
  code: '```\nテキスト\n```',
  blockquote: '> テキスト\n> テキスト',
  alert: '> [!TIP] タイトル(省略可)\n> テキスト',
};
const INLINE_PATTERN_HINTS = {
  bold: '**テキスト**',
  italic: '*テキスト*',
  'inline-code': '`テキスト`',
  link: '[テキスト](URL)',
};
const LIST_PATTERN_HINTS = {
  ul: '- テキスト\n  - ネスト',
  ol: '1. テキスト\n   1. ネスト',
};
const TYPE_BADGE_LABELS = {
  block: 'ブロック',
  list: 'リスト',
  inline: 'インライン',
  line: '行',
};

function createRuleCard(rule) {
  const card = document.createElement('div');
  card.className = 'rule-card';
  card.dataset.ruleId = rule.id;
  card.setAttribute('role', 'listitem');

  const isBlock = rule.type === 'block';
  const isList = rule.type === 'list';
  const isInline = rule.type === 'inline';
  const patternReadonly = isBlock || isList || isInline;

  let patternHint;
  if (isBlock) patternHint = BLOCK_PATTERN_HINTS[rule.blockType] ?? rule.blockType ?? '';
  else if (isList) patternHint = LIST_PATTERN_HINTS[rule.listType] ?? '';
  else if (isInline) patternHint = INLINE_PATTERN_HINTS[rule.id] ?? rule.inputPattern ?? '';
  else patternHint = rule.inputPattern ?? '';

  const badge = TYPE_BADGE_LABELS[rule.type] ?? rule.type;

  card.innerHTML = `
    <div class="rule-card-header">
      <label class="rule-toggle-wrap" title="${rule.enabled ? '有効' : '無効'}">
        <input type="checkbox" class="rule-toggle" ${rule.enabled ? 'checked' : ''} aria-label="${escapeAttr(rule.name)} の有効/無効">
        <span class="rule-toggle-track"></span>
      </label>
      <span class="rule-name-display">${escapeHtml(rule.name)}</span>
      <span class="rule-type-badge">${escapeHtml(badge)}</span>
      <button class="rule-expand-btn" aria-label="展開/折りたたみ" aria-expanded="false">▾</button>
      <button class="rule-delete-btn" title="このルールを削除">✕</button>
    </div>
    <div class="rule-card-body is-hidden">
      <div class="rule-field rule-field--full">
        <label>ルール名</label>
        <input type="text" class="rule-body-name" value="${escapeAttr(rule.name)}" aria-label="ルール名">
      </div>
      <div class="rule-field">
        <label>入力パターン${patternReadonly ? '（自動検出）' : ''}</label>
        <textarea
          class="rule-pattern"
          ${patternReadonly ? 'readonly' : ''}
          aria-label="入力パターン"
          rows="3"
        >${escapeHtml(patternHint)}</textarea>
      </div>
      <div class="rule-field">
        <label>出力テンプレート</label>
        <textarea
          class="rule-template"
          aria-label="出力テンプレート"
          rows="3"
        >${escapeHtml(rule.outputTemplate ?? '')}</textarea>
      </div>
    </div>
  `;

  // --- Event listeners ---
  const header = card.querySelector('.rule-card-header');
  const body = card.querySelector('.rule-card-body');
  const expandBtn = card.querySelector('.rule-expand-btn');
  const deleteBtn = card.querySelector('.rule-delete-btn');
  const orderBtns = card.querySelectorAll('.rule-order-btn');

  function toggleBody() {
    const hidden = body.classList.toggle('is-hidden');
    expandBtn.textContent = hidden ? '▾' : '▴';
    expandBtn.setAttribute('aria-expanded', String(!hidden));
  }

  expandBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleBody(); });
  header.addEventListener('click', (e) => {
    // Don't toggle if user clicked on an interactive child
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(e.target.tagName)) return;
    toggleBody();
  });

  // Sync body name input → header display span
  const bodyNameInput = card.querySelector('.rule-body-name');
  const nameDisplay = card.querySelector('.rule-name-display');
  if (bodyNameInput && nameDisplay) {
    bodyNameInput.addEventListener('input', () => {
      nameDisplay.textContent = bodyNameInput.value;
    });
  }

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentName = card.querySelector('.rule-body-name')?.value ?? rule.name;
    if (!confirm(`「${currentName}」を削除しますか？`)) return;
    collectRulesFromDOM();
    const idx = settingsDraft.rules.findIndex(r => r.id === rule.id);
    if (idx !== -1) settingsDraft.rules.splice(idx, 1);
    renderRules();
  });

  return card;
}

// ============================================================
// UTILITIES
// ============================================================
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
