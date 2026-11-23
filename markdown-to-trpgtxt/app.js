'use strict';

// ============================================================
// DEFAULT SETTINGS (Backward-compatible with md2trpg-settings-v3)
// ============================================================
const DEFAULT_SETTINGS = {
  presetId: 'standard',
  indentUnit: 2,
  indentChar: 'half', // 'half' | 'full'
  stripFrontmatter: true,
  stripComments: true,
  outputFileName: '',
  previewSize: 'md', // 'sm' | 'md' | 'lg'
  rules: [
    // ── Block rules ─────────────────────────────────────────
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
      name: 'アラート / コールアウト',
      type: 'block',
      blockType: 'alert',
      enabled: true,
      outputTemplate: '▄▄▄▄▄▄▄▄▄▄\n[ {type}{label}]\n{content}\n▀▀▀▀▀▀▀▀▀▀',
    },
    // ── List rules ──────────────────────────────────────────
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
      inputPattern: '---',
      enabled: true,
      outputTemplate: '──────────────────────────────',
    },
    // ── Inline rules ────────────────────────────────────────
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
// PRESETS
// ============================================================
function cloneRulesWithOverrides(overrides) {
  return DEFAULT_SETTINGS.rules.map((r) => {
    const patch = overrides[r.id];
    return patch ? Object.assign({}, r, patch) : Object.assign({}, r);
  });
}

const TXT_PRESETS = [
  {
    id: 'standard',
    name: '標準（TRPG汎用）',
    desc: '従来のデフォルト設定。見出し・枠線の視認性バランス型',
    sample: '━━━━━━ / 【H2】 / ■ H3 / 《太字》',
    build: () => ({
      indentUnit: 2,
      indentChar: 'half',
      rules: cloneRulesWithOverrides({}),
    }),
  },
  {
    id: 'scenario',
    name: '豪華シナリオ装飾',
    desc: '配布用テキストシナリオ向け。章区切りと注釈を強調',
    sample: '╔═══ / ▣ H2 / ▸ H3 / 【! TYPE】',
    build: () => ({
      indentUnit: 2,
      indentChar: 'full',
      rules: cloneRulesWithOverrides({
        h1: { outputTemplate: '════════════════════════════\n  {text}\n════════════════════════════' },
        h2: { outputTemplate: '━━━ 【{text}】 ━━━' },
        h3: { outputTemplate: '▣ {text}' },
        h4: { outputTemplate: '▸ {text}' },
        alert: { outputTemplate: '┌─── [ {type}{label} ] ───\n{content}\n└────────────────────' },
        blockquote: { outputTemplate: '┃\n{content}\n┃' },
        'code-block': { outputTemplate: '┏━━━━━━━━━━━━━━━━━━\n{content}\n┗━━━━━━━━━━━━━━━━━━' },
        hr: { outputTemplate: '────────── ✦ ──────────' },
        bold: { outputTemplate: '『{text}』' },
      }),
    }),
  },
  {
    id: 'simple',
    name: 'シンプル・軽量',
    desc: '装飾記号を最小限に抑えたメモ・議事録向け',
    sample: '■ H1 / ● H2 / ・箇条書き',
    build: () => ({
      indentUnit: 2,
      indentChar: 'half',
      rules: cloneRulesWithOverrides({
        h1: { outputTemplate: '■ {text}\n------------------------------' },
        h2: { outputTemplate: '● {text}' },
        h3: { outputTemplate: '・{text}' },
        h4: { outputTemplate: '- {text}' },
        alert: { outputTemplate: '[{type}{label}]\n{content}' },
        blockquote: { outputTemplate: '---\n{content}\n---' },
        'code-block': { outputTemplate: '---\n{content}\n---' },
        hr: { outputTemplate: '------------------------------' },
        bold: { outputTemplate: '「{text}」' },
        italic: { outputTemplate: '{text}' },
      }),
    }),
  },
  {
    id: 'chat',
    name: 'Discord / ココフォリア貼付向け',
    desc: '横幅をコンパクトに収め、チャット欄で崩れにくい装飾',
    sample: '【H1】 / ◆ H2 / ▌引用',
    build: () => ({
      indentUnit: 1,
      indentChar: 'full',
      rules: cloneRulesWithOverrides({
        h1: { outputTemplate: '━━━━━━━━━━━━━━\n【{text}】\n━━━━━━━━━━━━━━' },
        h2: { outputTemplate: '◆ {text}' },
        h3: { outputTemplate: '◇ {text}' },
        h4: { outputTemplate: '・{text}' },
        alert: { outputTemplate: '▼ {type}{label}\n{content}\n▲' },
        blockquote: { outputTemplate: '「\n{content}\n」' },
        'code-block': { outputTemplate: '┌──────────\n{content}\n└──────────' },
        hr: { outputTemplate: '──────────────' },
        bold: { outputTemplate: '《{text}》' },
      }),
    }),
  },
];

// ============================================================
// SAMPLE MARKDOWN
// ============================================================
const SAMPLE_MARKDOWN = `---
title: 霧の灯台 ― テキストハンドアウト
---

# 霧の灯台と消えた航路

これは **Md2Txt** のリアルタイム変換サンプルです。
左でMarkdownを編集したり、右パネルで変換ルールを変更すると、中央の結果が即座に更新されます。

%%この行はObsidianコメントです。「基本・出力」タブの設定で除外できます。%%

> [!info] セッション概要
> - 推奨人数: 2〜4人
> - 想定時間: 3〜4時間
> - 持ち物: \`懐中電灯\` と **メモ帳**

---

## 第1章：導入

### 探索の進め方

1. 港町の聞き込みを行う
   1. 漁師に話を聞く
   2. 宿屋の主人に日誌を借りる
2. 霧が晴れる前に灯台へ移動する

> [!tip]+ KPからのヒント
> 怪しい場所では **〈目星〉** または *〈聞き耳〉* を試してみてください。

### 残された手記

> 霧が深くなる夜、灯台の光は海ではなく、町の方を向く。
> 決して光の中を覗き込んではならない。

### 暗号メモ

\`\`\`
SIGNAL: -- .- -.-- -.. .- -.--
DEPTH : 42.8m
\`\`\`

参考資料: [ルールガイド](https://example.com)
`;

// ============================================================
// CONVERSION ENGINE
// ============================================================

/** Escape special regex characters in a string. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replace all occurrences of {key} in template with vars[key]. */
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

/** Strip YAML frontmatter at top of document. */
function stripFrontmatterBlock(src) {
  return src.replace(/^---\n[\s\S]*?\n---(?:\n|$)/, '');
}

/** Strip Obsidian comments (%% ... %%) while protecting code blocks & inline code. */
function stripObsidianComments(src) {
  const lines = src.split('\n');
  const protectedBlocks = [];
  let inFence = false;
  let fenceMarker = '';
  const outLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inFence) {
      const fenceOpen = line.match(/^(\s*)(`{3,}|~{3,})/);
      if (fenceOpen) {
        inFence = true;
        fenceMarker = fenceOpen[2][0].repeat(fenceOpen[2].length);
        const idx = protectedBlocks.length;
        protectedBlocks.push([line]);
        outLines.push(`\u0000FENCE_${idx}\u0000`);
        continue;
      }
      outLines.push(line);
    } else {
      protectedBlocks[protectedBlocks.length - 1].push(line);
      const fenceClose = line.match(new RegExp('^\\s*' + fenceMarker[0] + '{' + fenceMarker.length + ',}\\s*$'));
      if (fenceClose) {
        inFence = false;
        fenceMarker = '';
      }
    }
  }

  let text = outLines.join('\n');
  const inlineCodes = [];
  text = text.replace(/(`+)([\s\S]*?)\1/g, (m) => {
    const idx = inlineCodes.length;
    inlineCodes.push(m);
    return `\u0000CODE_${idx}\u0000`;
  });

  text = text.replace(/^[ \t]*%%[\s\S]*?%%[ \t]*\n?/gm, '');
  text = text.replace(/%%[\s\S]*?%%/g, '');

  text = text.replace(/\u0000CODE_(\d+)\u0000/g, (_, idx) => inlineCodes[Number(idx)]);
  text = text.replace(/\u0000FENCE_(\d+)\u0000/g, (_, idx) => protectedBlocks[Number(idx)].join('\n'));
  return text;
}

/** Apply all enabled inline rules to a string. */
function applyInlineRules(str, rules) {
  let result = str;

  for (const rule of rules) {
    if (!rule.enabled || rule.type !== 'inline') continue;

    try {
      if (rule.id === 'link') {
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
          return applyTemplate(rule.outputTemplate, { text, url });
        });
      } else if (rule.id === 'bold') {
        result = result.replace(/\*\*(.+?)\*\*/g, (_, text) =>
          applyTemplate(rule.outputTemplate, { text })
        );
      } else if (rule.id === 'italic') {
        result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, text) =>
          applyTemplate(rule.outputTemplate, { text })
        );
      } else if (rule.id === 'inline-code') {
        result = result.replace(/`([^`]+)`/g, (_, text) =>
          applyTemplate(rule.outputTemplate, { text })
        );
      } else if (rule.inputPattern && rule.inputPattern.includes('{text}')) {
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
function convert(markdown, settings, isNested) {
  let source = String(markdown ?? '').replace(/\r\n/g, '\n');

  if (!isNested) {
    if (settings.stripFrontmatter) {
      source = stripFrontmatterBlock(source);
    }
    if (settings.stripComments) {
      source = stripObsidianComments(source);
    }
  }

  const rules = settings.rules || [];
  const lines = source.split('\n');
  const output = [];
  let i = 0;

  // Pre-sort heading rules: longest prefix first (H6 before H1)
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

    // ── GitHub Alerts & Obsidian Callouts (> [!TYPE][+-]? optional label) ──
    const alertMatch = line.match(/^\s*>\s*\[!([a-zA-Z0-9_-]+)\][+-]?(?:\s+(.+))?\s*$/i);
    if (alertMatch) {
      const alertType = alertMatch[1].toUpperCase();
      const rawLabel = (alertMatch[2] ?? '').trim();
      const alertLabel = rawLabel ? ': ' + rawLabel : '';
      const alertRule = findRule(rules, r => r.type === 'block' && r.blockType === 'alert');
      const contentLines = [];
      i++;
      while (i < lines.length && /^\s*>\s*/.test(lines[i])) {
        contentLines.push(lines[i].replace(/^\s*>\s*/, ''));
        i++;
      }
      if (alertRule) {
        const content = convert(contentLines.join('\n'), settings, true);
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
        const content = convert(contentLines.join('\n'), settings, true);
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

function normalizeLoadedSettings(rawObj) {
  const base = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!rawObj || typeof rawObj !== 'object') return base;
  return {
    presetId: rawObj.presetId ?? base.presetId,
    indentUnit: Math.max(1, parseInt(rawObj.indentUnit, 10) || base.indentUnit),
    indentChar: rawObj.indentChar === 'full' ? 'full' : 'half',
    stripFrontmatter: rawObj.stripFrontmatter !== undefined ? Boolean(rawObj.stripFrontmatter) : base.stripFrontmatter,
    stripComments: rawObj.stripComments !== undefined ? Boolean(rawObj.stripComments) : base.stripComments,
    outputFileName: typeof rawObj.outputFileName === 'string' ? rawObj.outputFileName : '',
    previewSize: ['sm', 'md', 'lg'].includes(rawObj.previewSize) ? rawObj.previewSize : 'md',
    rules: Array.isArray(rawObj.rules) ? rawObj.rules : base.rules,
  };
}

// Export for Node.js tests if running outside browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_SETTINGS,
    TXT_PRESETS,
    SAMPLE_MARKDOWN,
    convert,
    normalizeLoadedSettings,
  };
}

// ============================================================
// BROWSER UI CONTROLLER
// ============================================================
if (typeof document !== 'undefined') (function initBrowserApp() {
  const STORAGE_KEY = 'md2trpg-settings-v3';
  const STORAGE_KEY_MARKDOWN = 'md2trpg-markdown-v1';

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalizeLoadedSettings(JSON.parse(raw));
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

  function loadSavedMarkdown() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MARKDOWN);
      if (saved !== null) return saved;
    } catch (e) {}
    return SAMPLE_MARKDOWN;
  }

  function saveMarkdown(text) {
    try {
      localStorage.setItem(STORAGE_KEY_MARKDOWN, text);
    } catch (e) {}
  }

  // ── State ──────────────────────────────────────────────────
  let settings = loadSettings();
  let currentContent = loadSavedMarkdown();
  let convertedContent = '';
  let loadedFileBaseName = '';
  let activeRuleFilter = 'all';
  let syncScrollEnabled = true;
  let wrapEnabled = true;
  let previewTheme = 'light';
  let expandedRuleIds = new Set();

  // ── DOM References ─────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  const mdInput = $('md-input');
  const previewEl = $('preview');
  const previewStage = $('preview-stage');
  const editorPane = $('editor-pane');
  const settingsPane = $('settings-pane');
  const btnToggleEditor = $('btn-toggle-editor');
  const btnToggleSettings = $('btn-toggle-settings');
  const btnLoadFile = $('btn-load-file');
  const fileInput = $('file-input');
  const btnLoadSample = $('btn-load-sample');
  const btnCopy = $('btn-copy');
  const btnCopyInline = $('btn-copy-inline');
  const btnDownload = $('btn-download');
  const btnClearEditor = $('btn-clear-editor');
  const loadedFileBadge = $('loaded-file-badge');
  const statSrcChars = $('stat-src-chars');
  const statSrcLines = $('stat-src-lines');
  const statOutChars = $('stat-out-chars');
  const statOutLines = $('stat-out-lines');
  const btnSyncScroll = $('btn-sync-scroll');
  const btnWrapToggle = $('btn-wrap-toggle');
  const btnPreviewLight = $('btn-preview-light');
  const btnPreviewDark = $('btn-preview-dark');
  const globalDropOverlay = $('global-drop-overlay');
  const toastEl = $('toast');

  const rulesList = $('rules-list');
  const btnAddRule = $('btn-add-rule');
  const presetGrid = $('preset-grid');
  const indentUnitEl = $('indent-unit');
  const indentCharEl = $('indent-char');
  const inpFileName = $('inp-file-name');
  const selPreviewSize = $('sel-preview-size');
  const chkStripFrontmatter = $('chk-strip-frontmatter');
  const chkStripComments = $('chk-strip-comments');
  const btnExportConfig = $('btn-export-config');
  const btnImportConfig = $('btn-import-config');
  const configFileInput = $('config-file-input');
  const btnResetSettings = $('btn-reset-settings');

  // ── Toast ──────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 2200);
  }

  // ── Convert & Render Preview ───────────────────────────────
  function runConvert() {
    convertedContent = convert(currentContent, settings, false);

    if (currentContent.length === 0) {
      previewEl.textContent = '左の入力欄にMarkdownを入力するか、.mdファイルをドロップしてください';
      previewEl.classList.add('is-empty');
      btnDownload.disabled = true;
      btnCopy.disabled = true;
    } else {
      previewEl.textContent = convertedContent;
      previewEl.classList.remove('is-empty');
      btnDownload.disabled = false;
      btnCopy.disabled = false;
    }

    const srcLines = currentContent ? currentContent.split('\n').length : 0;
    const outLines = convertedContent ? convertedContent.split('\n').length : 0;
    statSrcChars.textContent = `${currentContent.length.toLocaleString()} 文字`;
    statSrcLines.textContent = `${srcLines.toLocaleString()} 行`;
    statOutChars.textContent = `出力 ${convertedContent.length.toLocaleString()} 文字`;
    statOutLines.textContent = `${outLines.toLocaleString()} 行`;
  }

  function applyPreviewSize() {
    const sizeMap = { sm: '12px', md: '13.5px', lg: '15px' };
    previewEl.style.setProperty('--preview-font-size', sizeMap[settings.previewSize] || '13.5px');
  }

  // ── Synchronized Scroll (Editor ↔ Preview Stage) ───────────
  let isSyncing = false;
  function syncScroll(source, target) {
    if (!syncScrollEnabled || isSyncing) return;
    isSyncing = true;
    const pct = source.scrollTop / Math.max(1, source.scrollHeight - source.clientHeight);
    target.scrollTop = pct * Math.max(1, target.scrollHeight - target.clientHeight);
    requestAnimationFrame(() => { isSyncing = false; });
  }
  mdInput.addEventListener('scroll', () => syncScroll(mdInput, previewStage));
  previewStage.addEventListener('scroll', () => syncScroll(previewStage, mdInput));

  // ── Rule Categorization & Rendering ────────────────────────
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

  function getRuleCategory(rule) {
    if (rule.type === 'block') return 'block';
    if (rule.type === 'list') return 'list';
    if (rule.type === 'inline') return 'inline';
    if (rule.type === 'line' && /^#+\s/.test(rule.inputPattern || '')) return 'heading';
    return 'other';
  }

  function applyRuleFilter() {
    rulesList.querySelectorAll('.rule-card').forEach((card) => {
      const cat = card.dataset.ruleCategory;
      const show = activeRuleFilter === 'all' || cat === activeRuleFilter;
      card.classList.toggle('is-filtered-out', !show);
    });
  }

  function createRuleCard(rule) {
    const card = document.createElement('div');
    const isExpanded = expandedRuleIds.has(rule.id);
    card.className = `rule-card${rule.enabled ? '' : ' is-disabled'}`;
    card.dataset.ruleId = rule.id;
    card.dataset.ruleCategory = getRuleCategory(rule);
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
        <button type="button" class="rule-expand-btn" aria-label="展開/折りたたみ" aria-expanded="${isExpanded ? 'true' : 'false'}">${isExpanded ? '▴' : '▾'}</button>
        <button type="button" class="rule-delete-btn" title="このルールを削除" aria-label="削除">✕</button>
      </div>
      <div class="rule-card-body${isExpanded ? '' : ' is-hidden'}">
        <div class="rule-field">
          <label>ルール名</label>
          <input type="text" class="rule-body-name" value="${escapeAttr(rule.name)}" aria-label="ルール名">
        </div>
        <div class="rule-field">
          <label>入力パターン${patternReadonly ? '（自動検出）' : ''}</label>
          <textarea class="rule-pattern" ${patternReadonly ? 'readonly' : ''} aria-label="入力パターン" rows="2">${escapeHtml(patternHint)}</textarea>
        </div>
        <div class="rule-field">
          <label>出力テンプレート</label>
          <textarea class="rule-template" aria-label="出力テンプレート" rows="3">${escapeHtml(rule.outputTemplate ?? '')}</textarea>
        </div>
      </div>
    `;

    const header = card.querySelector('.rule-card-header');
    const body = card.querySelector('.rule-card-body');
    const toggle = card.querySelector('.rule-toggle');
    const expandBtn = card.querySelector('.rule-expand-btn');
    const deleteBtn = card.querySelector('.rule-delete-btn');
    const nameInput = card.querySelector('.rule-body-name');
    const nameDisplay = card.querySelector('.rule-name-display');
    const patternArea = card.querySelector('.rule-pattern');
    const templateArea = card.querySelector('.rule-template');

    function toggleBody() {
      const hidden = body.classList.toggle('is-hidden');
      expandBtn.textContent = hidden ? '▾' : '▴';
      expandBtn.setAttribute('aria-expanded', String(!hidden));
      if (hidden) expandedRuleIds.delete(rule.id);
      else expandedRuleIds.add(rule.id);
    }

    function commitRuleChange() {
      settings.presetId = 'custom';
      saveSettings(settings);
      updatePresetHighlight();
      runConvert();
    }

    expandBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleBody(); });
    header.addEventListener('click', (e) => {
      if (e.target.closest('label.rule-toggle-wrap') || ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(e.target.tagName)) return;
      toggleBody();
    });

    toggle.addEventListener('change', () => {
      rule.enabled = toggle.checked;
      card.classList.toggle('is-disabled', !rule.enabled);
      commitRuleChange();
    });

    nameInput.addEventListener('input', () => {
      rule.name = nameInput.value;
      nameDisplay.textContent = nameInput.value || '(無題)';
      commitRuleChange();
    });

    if (!patternReadonly) {
      patternArea.addEventListener('input', () => {
        rule.inputPattern = patternArea.value;
        card.dataset.ruleCategory = getRuleCategory(rule);
        commitRuleChange();
      });
    }

    templateArea.addEventListener('input', () => {
      rule.outputTemplate = templateArea.value;
      commitRuleChange();
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`ルール「${rule.name}」を削除しますか？`)) return;
      const idx = settings.rules.findIndex((r) => r.id === rule.id);
      if (idx !== -1) {
        settings.rules.splice(idx, 1);
        expandedRuleIds.delete(rule.id);
        renderRules();
        commitRuleChange();
        showToast(`「${rule.name}」を削除しました`);
      }
    });

    return card;
  }

  function renderRules() {
    rulesList.innerHTML = '';
    settings.rules.forEach((rule) => {
      rulesList.appendChild(createRuleCard(rule));
    });
    applyRuleFilter();
  }

  // ── Presets UI ─────────────────────────────────────────────
  function updatePresetHighlight() {
    presetGrid.querySelectorAll('.preset-card').forEach((card) => {
      card.classList.toggle('is-active', card.dataset.presetId === settings.presetId);
    });
  }

  function buildPresetCards() {
    presetGrid.innerHTML = '';
    TXT_PRESETS.forEach((preset) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-card';
      btn.dataset.presetId = preset.id;
      btn.innerHTML =
        `<span class="preset-name">${escapeHtml(preset.name)}</span>` +
        `<span class="preset-desc">${escapeHtml(preset.desc)}</span>` +
        `<span class="preset-sample">${escapeHtml(preset.sample)}</span>`;

      btn.addEventListener('click', () => {
        const built = preset.build();
        settings.presetId = preset.id;
        settings.indentUnit = built.indentUnit;
        settings.indentChar = built.indentChar;
        settings.rules = built.rules;
        saveSettings(settings);
        syncUiFromSettings();
        runConvert();
        showToast(`プリセット「${preset.name}」を適用しました`);
      });

      presetGrid.appendChild(btn);
    });
  }

  function syncUiFromSettings() {
    indentUnitEl.value = String(settings.indentUnit);
    indentCharEl.value = settings.indentChar;
    inpFileName.value = settings.outputFileName || '';
    selPreviewSize.value = settings.previewSize || 'md';
    chkStripFrontmatter.checked = Boolean(settings.stripFrontmatter);
    chkStripComments.checked = Boolean(settings.stripComments);
    applyPreviewSize();
    updatePresetHighlight();
    renderRules();
  }

  // ── Event Bindings: Editor & Files ─────────────────────────
  mdInput.addEventListener('input', () => {
    currentContent = mdInput.value;
    saveMarkdown(currentContent);
    runConvert();
  });

  mdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = mdInput.selectionStart;
      const end = mdInput.selectionEnd;
      mdInput.value = mdInput.value.slice(0, start) + '  ' + mdInput.value.slice(end);
      mdInput.selectionStart = mdInput.selectionEnd = start + 2;
      currentContent = mdInput.value;
      saveMarkdown(currentContent);
      runConvert();
    }
  });

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentContent = String(e.target.result || '');
      mdInput.value = currentContent;
      loadedFileBaseName = file.name.replace(/\.(md|markdown|txt)$/i, '');
      loadedFileBadge.textContent = file.name;
      loadedFileBadge.classList.remove('hidden');
      saveMarkdown(currentContent);
      runConvert();
      showToast(`「${file.name}」を読み込みました`);
    };
    reader.onerror = () => showToast('ファイルの読み込みに失敗しました');
    reader.readAsText(file, 'UTF-8');
  }

  btnLoadFile.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    e.target.value = '';
  });

  // Global drag & drop
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    dragDepth++;
    globalDropOverlay.classList.remove('hidden');
  });
  window.addEventListener('dragover', (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
  });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) globalDropOverlay.classList.add('hidden');
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    globalDropOverlay.classList.add('hidden');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  btnLoadSample.addEventListener('click', () => {
    currentContent = SAMPLE_MARKDOWN;
    mdInput.value = currentContent;
    loadedFileBaseName = '';
    loadedFileBadge.classList.add('hidden');
    saveMarkdown(currentContent);
    runConvert();
    showToast('サンプルMarkdownを読み込みました');
  });

  btnClearEditor.addEventListener('click', () => {
    currentContent = '';
    mdInput.value = '';
    loadedFileBaseName = '';
    loadedFileBadge.classList.add('hidden');
    saveMarkdown(currentContent);
    runConvert();
    mdInput.focus();
  });

  // ── Copy & Download ────────────────────────────────────────
  function copyConvertedText() {
    if (!convertedContent) return;
    function done() { showToast('変換結果をクリップボードにコピーしました'); }
    function fallback() {
      try {
        const ta = document.createElement('textarea');
        ta.value = convertedContent;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch (err) {
        showToast('コピーに失敗しました');
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(convertedContent).then(done).catch(fallback);
    } else {
      fallback();
    }
  }

  btnCopy.addEventListener('click', copyConvertedText);
  btnCopyInline.addEventListener('click', copyConvertedText);

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  btnDownload.addEventListener('click', () => {
    if (!convertedContent) return;
    const rawName = (settings.outputFileName || '').trim() || loadedFileBaseName || 'output';
    const safeName = rawName.replace(/[\\/:*?"<>|]/g, '_').replace(/\.txt$/i, '') || 'output';
    const fileName = safeName + '.txt';
    const blob = new Blob([convertedContent], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, fileName);
    showToast(`「${fileName}」をダウンロードしました`);
  });

  // ── Pane & Preview Bar Controls ────────────────────────────
  btnToggleEditor.addEventListener('click', () => {
    const hidden = editorPane.classList.toggle('is-hidden');
    btnToggleEditor.classList.toggle('is-active', !hidden);
    btnToggleEditor.setAttribute('aria-pressed', hidden ? 'false' : 'true');
  });

  btnToggleSettings.addEventListener('click', () => {
    const hidden = settingsPane.classList.toggle('is-hidden');
    btnToggleSettings.classList.toggle('is-active', !hidden);
    btnToggleSettings.setAttribute('aria-pressed', hidden ? 'false' : 'true');
  });

  btnSyncScroll.addEventListener('click', () => {
    syncScrollEnabled = !syncScrollEnabled;
    btnSyncScroll.classList.toggle('is-active', syncScrollEnabled);
    btnSyncScroll.setAttribute('aria-pressed', String(syncScrollEnabled));
  });

  btnWrapToggle.addEventListener('click', () => {
    wrapEnabled = !wrapEnabled;
    previewEl.classList.toggle('is-wrapped', wrapEnabled);
    btnWrapToggle.classList.toggle('is-active', wrapEnabled);
    btnWrapToggle.setAttribute('aria-pressed', String(wrapEnabled));
  });

  function setPreviewTheme(mode) {
    previewTheme = mode === 'dark' ? 'dark' : 'light';
    previewStage.dataset.theme = previewTheme;
    btnPreviewLight.classList.toggle('is-active', previewTheme === 'light');
    btnPreviewDark.classList.toggle('is-active', previewTheme === 'dark');
  }
  btnPreviewLight.addEventListener('click', () => setPreviewTheme('light'));
  btnPreviewDark.addEventListener('click', () => setPreviewTheme('dark'));

  // ── Settings Tabs & Filters ────────────────────────────────
  document.querySelectorAll('.settings-tabs .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.settings-tabs .tab-btn').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.panel === target);
      });
    });
  });

  document.querySelectorAll('#rule-filter-pills .pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeRuleFilter = btn.dataset.filter;
      document.querySelectorAll('#rule-filter-pills .pill-btn').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
      });
      applyRuleFilter();
    });
  });

  btnAddRule.addEventListener('click', () => {
    const newRule = {
      id: 'custom-' + Date.now(),
      name: '新しいルール',
      type: 'line',
      inputPattern: '{text}',
      outputTemplate: '{text}',
      enabled: true,
    };
    settings.rules.push(newRule);
    settings.presetId = 'custom';
    expandedRuleIds.add(newRule.id);
    activeRuleFilter = 'all';
    document.querySelectorAll('#rule-filter-pills .pill-btn').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.filter === 'all');
    });
    saveSettings(settings);
    updatePresetHighlight();
    renderRules();
    runConvert();
    const last = rulesList.lastElementChild;
    if (last) last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ── Global & Output Option Listeners ───────────────────────
  indentUnitEl.addEventListener('input', () => {
    settings.indentUnit = Math.max(1, Math.min(8, parseInt(indentUnitEl.value, 10) || 2));
    saveSettings(settings);
    runConvert();
  });

  indentCharEl.addEventListener('change', () => {
    settings.indentChar = indentCharEl.value === 'full' ? 'full' : 'half';
    saveSettings(settings);
    runConvert();
  });

  inpFileName.addEventListener('input', () => {
    settings.outputFileName = inpFileName.value;
    saveSettings(settings);
  });

  selPreviewSize.addEventListener('change', () => {
    settings.previewSize = selPreviewSize.value;
    saveSettings(settings);
    applyPreviewSize();
  });

  chkStripFrontmatter.addEventListener('change', () => {
    settings.stripFrontmatter = chkStripFrontmatter.checked;
    saveSettings(settings);
    runConvert();
  });

  chkStripComments.addEventListener('change', () => {
    settings.stripComments = chkStripComments.checked;
    saveSettings(settings);
    runConvert();
  });

  // ── Backup / Import / Reset ────────────────────────────────
  btnExportConfig.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json;charset=utf-8' });
    triggerDownload(blob, 'md2txt-settings.json');
    showToast('設定JSONを書き出しました');
  });

  btnImportConfig.addEventListener('click', () => configFileInput.click());
  configFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        settings = normalizeLoadedSettings(parsed);
        saveSettings(settings);
        syncUiFromSettings();
        runConvert();
        showToast('設定を読み込みました');
      } catch (err) {
        showToast('設定JSONの読み込みに失敗しました');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  });

  btnResetSettings.addEventListener('click', () => {
    if (!confirm('すべての変換ルールと設定をデフォルトに戻しますか？')) return;
    settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    expandedRuleIds.clear();
    saveSettings(settings);
    syncUiFromSettings();
    runConvert();
    showToast('設定をデフォルトに戻しました');
  });

  // ── Initialize ─────────────────────────────────────────────
  buildPresetCards();
  mdInput.value = currentContent;

  if (window.innerWidth <= 1140) {
    settingsPane.classList.add('is-hidden');
    btnToggleSettings.classList.remove('is-active');
    btnToggleSettings.setAttribute('aria-pressed', 'false');
  }

  syncUiFromSettings();
  runConvert();
})();
