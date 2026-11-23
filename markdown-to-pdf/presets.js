'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Md2PdfPresets = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // ============================================================
  // OBSIDIAN CALLOUT DEFINITIONS (13 built-in types + aliases)
  // ============================================================
  const CALLOUT_TYPES = [
    {
      id: 'note', label: 'Note', aliases: [], defaultColor: '#448aff',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
    },
    {
      id: 'abstract', label: 'Abstract', aliases: ['summary', 'tldr'], defaultColor: '#00b0ff',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
    },
    {
      id: 'info', label: 'Info', aliases: [], defaultColor: '#0284c7',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    },
    {
      id: 'todo', label: 'Todo', aliases: [], defaultColor: '#0097a7',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    },
    {
      id: 'tip', label: 'Tip', aliases: ['hint', 'important'], defaultColor: '#00a896',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    },
    {
      id: 'success', label: 'Success', aliases: ['check', 'done'], defaultColor: '#16a34a',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    },
    {
      id: 'question', label: 'Question', aliases: ['help', 'faq'], defaultColor: '#ca8a04',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    },
    {
      id: 'warning', label: 'Warning', aliases: ['caution', 'attention'], defaultColor: '#ea580c',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    },
    {
      id: 'failure', label: 'Failure', aliases: ['fail', 'missing'], defaultColor: '#dc2626',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    },
    {
      id: 'danger', label: 'Danger', aliases: ['error'], defaultColor: '#e11d48',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    },
    {
      id: 'bug', label: 'Bug', aliases: [], defaultColor: '#db2777',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>',
    },
    {
      id: 'example', label: 'Example', aliases: [], defaultColor: '#7c3aed',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>',
    },
    {
      id: 'quote', label: 'Quote', aliases: ['cite'], defaultColor: '#64748b',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
    },
  ];

  const CALLOUT_ALIAS_MAP = {};
  const CALLOUT_ICON_MAP = {};
  const DEFAULT_CALLOUT_COLORS = {};

  CALLOUT_TYPES.forEach((ct) => {
    CALLOUT_ALIAS_MAP[ct.id] = ct.id;
    ct.aliases.forEach((al) => { CALLOUT_ALIAS_MAP[al] = ct.id; });
    CALLOUT_ICON_MAP[ct.id] = ct.icon;
    DEFAULT_CALLOUT_COLORS[ct.id] = ct.defaultColor;
  });

  function resolveCalloutType(rawType) {
    const lower = String(rawType || 'note').toLowerCase().trim();
    return CALLOUT_ALIAS_MAP[lower] || 'custom';
  }

  function getCalloutIcon(canonicalType) {
    return CALLOUT_ICON_MAP[canonicalType] || CALLOUT_ICON_MAP.info;
  }

  // ============================================================
  // PAPER SIZES (width x height in mm for portrait)
  // ============================================================
  const PAPER_SIZES = {
    A4:     { label: 'A4 (210 × 297mm)',       w: 210, h: 297 },
    B5:     { label: 'B5 JIS (182 × 257mm)',   w: 182, h: 257 },
    A5:     { label: 'A5 冊子 (148 × 210mm)',  w: 148, h: 210 },
    Letter: { label: 'Letter (216 × 279mm)',   w: 215.9, h: 279.4 },
    Wide169:{ label: '電子横画面 16:9',        w: 297, h: 167, forceLandscape: true },
  };

  // ============================================================
  // DEFAULT CONFIG
  // ============================================================
  function createDefaultConfig() {
    return {
      presetId: 'modern',
      themeMode: 'light', // 'light' | 'dark'
      page: {
        size: 'A4',           // 'A4' | 'B5' | 'A5' | 'Letter' | 'Wide169'
        orientation: 'portrait', // 'portrait' | 'landscape'
        margin: 'normal',     // 'narrow' | 'normal' | 'wide'
        showHeader: true,
        showPageNumber: true,
        showTocBackLink: true,
      },
      pagination: {
        breakBeforeH1: true,
        breakBeforeH2: false,
        keepHeadingWithNext: true,
        avoidBreakBlocks: true,
        avoidBreakParagraphs: false,
      },
      cover: {
        enabled: true,
        style: 'modern',      // 'modern' | 'classic' | 'cyber' | 'minimal'
        title: '',            // empty -> frontmatter or first H1
        subtitle: '',         // empty -> frontmatter subtitle
        author: '',           // empty -> frontmatter author
        meta: '',             // empty -> frontmatter date/version
      },
      toc: {
        enabled: true,
        title: '目次',
        maxDepth: 3,          // 2 | 3 | 6
        columns: '1',         // '1' | '2' | 'auto'
      },
      outline: {
        includeCoverAndToc: true,
        openPanelOnStart: true,
      },
      colors: {
        light: {
          pageBg: '#ffffff',
          surfaceBg: '#f6f8fa',
          text: '#1f2328',
          heading: '#111827',
          accent: '#2563eb',
          link: '#2563eb',
        },
        dark: {
          pageBg: '#0f141d',
          surfaceBg: '#171e2b',
          text: '#e6edf3',
          heading: '#f0f6fc',
          accent: '#58a6ff',
          link: '#58a6ff',
        },
      },
      typography: {
        bodyFont: 'gothic',
        headingFont: 'inherit',
        fontSize: 'md',       // 'sm' (9.5pt) | 'md' (10.5pt) | 'lg' (11.5pt)
        lineHeight: 1.75,
      },
      headings: {
        h1Style: 'underline',
        h2Style: 'left-bar',
        h3Style: 'simple',
        topSpace: 1.0,
      },
      callout: {
        style: 'obsidian',
        colors: Object.assign({}, DEFAULT_CALLOUT_COLORS),
        expandFolded: true,
      },
      elements: {
        blockquoteStyle: 'border',
        boldStyle: 'normal',
        hrStyle: 'solid',
        tableStyle: 'clean',
        codeWrap: 'wrap',
      },
      texture: {
        type: 'none',         // 'none' | 'paper' | 'cyberpunk' | 'dot-grid' | 'lined'
        intensity: 50,
      },
      output: {
        breaks: true,
        stripComments: true,
        stripFrontmatter: true,
        includeWebFonts: true,
      },
    };
  }

  // ============================================================
  // THEME PRESETS
  // ============================================================
  const THEME_PRESETS = [
    {
      id: 'modern',
      name: 'モダン',
      desc: '電子閲覧に最適なクリアで読みやすい紙面',
      swatch: ['#ffffff', '#2563eb', '#111827'],
      apply: {
        themeMode: 'light',
        cover: { style: 'modern' },
        colors: {
          light: { pageBg: '#ffffff', surfaceBg: '#f6f8fa', text: '#1f2328', heading: '#111827', accent: '#2563eb', link: '#2563eb' },
          dark:  { pageBg: '#0f141d', surfaceBg: '#171e2b', text: '#e6edf3', heading: '#f0f6fc', accent: '#58a6ff', link: '#58a6ff' },
        },
        typography: { bodyFont: 'gothic', headingFont: 'inherit', fontSize: 'md', lineHeight: 1.75 },
        headings: { h1Style: 'underline', h2Style: 'left-bar', h3Style: 'simple', topSpace: 1.0 },
        callout: { style: 'obsidian', colors: Object.assign({}, DEFAULT_CALLOUT_COLORS) },
        elements: { blockquoteStyle: 'border', boldStyle: 'normal', hrStyle: 'solid', tableStyle: 'clean', codeWrap: 'wrap' },
        texture: { type: 'none', intensity: 45 },
      },
    },
    {
      id: 'parchment',
      name: '古書・羊皮紙',
      desc: '紙の質感＋明朝体。TRPGシナリオ冊子向け',
      swatch: ['#f6efde', '#8b3a2b', '#2c241b'],
      apply: {
        themeMode: 'light',
        cover: { style: 'classic' },
        colors: {
          light: { pageBg: '#f6efde', surfaceBg: '#ede2c8', text: '#2c241b', heading: '#4a2117', accent: '#8b3a2b', link: '#7c2d12' },
          dark:  { pageBg: '#1c1713', surfaceBg: '#27201a', text: '#e5dac8', heading: '#f3e5cc', accent: '#d98a5f', link: '#e6a57e' },
        },
        typography: { bodyFont: 'serif', headingFont: 'serif', fontSize: 'md', lineHeight: 1.85 },
        headings: { h1Style: 'double-line', h2Style: 'left-bar', h3Style: 'dot', topSpace: 1.0 },
        callout: {
          style: 'left-border',
          colors: Object.assign({}, DEFAULT_CALLOUT_COLORS, {
            note: '#5b6d8a', tip: '#3c7a67', warning: '#b45309', danger: '#9f2b2b', quote: '#786b5c',
          }),
        },
        elements: { blockquoteStyle: 'quote-icon', boldStyle: 'accent', hrStyle: 'ornament', tableStyle: 'bordered', codeWrap: 'wrap' },
        texture: { type: 'paper', intensity: 60 },
      },
    },
    {
      id: 'cyberpunk',
      name: 'サイバーパンク',
      desc: 'ダーク電子資料＋ネオングリッド。SF・近未来向け',
      swatch: ['#090f1d', '#00e5ff', '#ff2a85'],
      apply: {
        themeMode: 'dark',
        cover: { style: 'cyber' },
        colors: {
          light: { pageBg: '#eef4fa', surfaceBg: '#e1ebf5', text: '#0f172a', heading: '#0284c7', accent: '#0284c7', link: '#db2777' },
          dark:  { pageBg: '#090f1d', surfaceBg: '#111b31', text: '#d8e9ff', heading: '#00e5ff', accent: '#00e5ff', link: '#ff3b9a' },
        },
        typography: { bodyFont: 'gothic', headingFont: 'mono', fontSize: 'md', lineHeight: 1.72 },
        headings: { h1Style: 'cyber', h2Style: 'cyber', h3Style: 'cyber', topSpace: 1.0 },
        callout: {
          style: 'outline',
          colors: Object.assign({}, DEFAULT_CALLOUT_COLORS, {
            note: '#00d2ff', info: '#00e5ff', tip: '#00ffa3', warning: '#ffbe0b', danger: '#ff2a85', example: '#b56bff',
          }),
        },
        elements: { blockquoteStyle: 'card', boldStyle: 'accent', hrStyle: 'dashed', tableStyle: 'striped', codeWrap: 'wrap' },
        texture: { type: 'cyberpunk', intensity: 65 },
      },
    },
    {
      id: 'novel',
      name: '文芸ノベル',
      desc: '上品な明朝体と装飾見出し。読み物・ハンドアウト向け',
      swatch: ['#faf8f3', '#2e4c6d', '#1d3557'],
      apply: {
        themeMode: 'light',
        cover: { style: 'classic' },
        colors: {
          light: { pageBg: '#faf8f3', surfaceBg: '#f0ece3', text: '#262626', heading: '#1d3557', accent: '#3d5a80', link: '#2b507e' },
          dark:  { pageBg: '#151920', surfaceBg: '#1e242e', text: '#dce1e8', heading: '#e8eef5', accent: '#7da7d9', link: '#8fb9ea' },
        },
        typography: { bodyFont: 'serif', headingFont: 'serif', fontSize: 'lg', lineHeight: 1.9 },
        headings: { h1Style: 'center-ornament', h2Style: 'underline', h3Style: 'dot', topSpace: 1.1 },
        callout: { style: 'obsidian', colors: Object.assign({}, DEFAULT_CALLOUT_COLORS) },
        elements: { blockquoteStyle: 'quote-icon', boldStyle: 'marker', hrStyle: 'ornament', tableStyle: 'clean', codeWrap: 'wrap' },
        texture: { type: 'paper', intensity: 30 },
      },
    },
    {
      id: 'monochrome',
      name: 'モノクロ印刷',
      desc: '紙印刷にも最適な高コントラスト白黒資料',
      swatch: ['#ffffff', '#171717', '#525252'],
      apply: {
        themeMode: 'light',
        cover: { style: 'minimal' },
        colors: {
          light: { pageBg: '#ffffff', surfaceBg: '#f3f4f6', text: '#171717', heading: '#0a0a0a', accent: '#171717', link: '#333333' },
          dark:  { pageBg: '#111111', surfaceBg: '#1c1c1c', text: '#e5e5e5', heading: '#ffffff', accent: '#d4d4d4', link: '#a3a3a3' },
        },
        typography: { bodyFont: 'gothic', headingFont: 'gothic', fontSize: 'md', lineHeight: 1.72 },
        headings: { h1Style: 'box', h2Style: 'underline', h3Style: 'left-bar', topSpace: 1.0 },
        callout: {
          style: 'left-border',
          colors: Object.assign({}, DEFAULT_CALLOUT_COLORS, { note: '#525252', info: '#525252', quote: '#525252' }),
        },
        elements: { blockquoteStyle: 'border', boldStyle: 'normal', hrStyle: 'solid', tableStyle: 'bordered', codeWrap: 'wrap' },
        texture: { type: 'none', intensity: 0 },
      },
    },
  ];

  // ============================================================
  // SAMPLE MARKDOWN (PDF Pagination, Cover, TOC, Callouts Showcase)
  // ============================================================
  const SAMPLE_MARKDOWN = `---
title: 霧の灯台と消えた航路
subtitle: 現代日本クローズド・ミステリー TRPG シナリオ資料
author: TRPG シナリオ制作部
date: 2026-11-23 / Ver 1.0
---

# 第1章：導入とセッション概要

このドキュメントは **Md2Pdf** のページ組版プレビュー用サンプルです。
表紙ページ・==ページ番号付きクリック目次==・改ページ制御・Obsidian コールアウト・PDFしおり埋め込みまでをブラウザ単体で完結できます。

%%この行はObsidianコメントです。出力設定で自動的にPDFから除外されます。%%

> [!info] セッションスペック
> - **推奨人数**: 2〜4人
> - **想定時間**: ボイスセッション 3〜4時間
> - **舞台**: 現代日本・寂れた港町の古い灯台
> - **推奨技能**: 〈目星〉〈図書館〉〈聞き耳〉

## 1-1. 探索前の準備チェックリスト

- [x] 探索者シートの作成と提出
- [x] 導入ハンドアウトの確認
- [ ] 灯台守の日誌を入手・解読する
- [ ] 地下室の鍵を探し出す

## 1-2. 探索のルールとコールアウト

> [!tip]+ 探索のヒント（PDFでは自動展開できます）
> 怪しいと感じた場所では **〈目星〉** または **〈聞き耳〉** を宣言してください。
> 判定に失敗した場合でも、時間をかけたり別のアプローチを試すことで代替情報が得られる場合があります。

> [!warning]- KP専用メモ（折りたたみ記法にも対応）
> 探索者が2回以上同じエリアを調べた場合、外から霧笛の音が響き、NPC「霧島 透」が灯台の入口に現れます。
>
> > [!danger] ネストされた警告
> > 深夜0時を過ぎると1階の鉄扉が外から施錠され、**SANチェック（1/1d4）** が発生します。

# 第2章：主な登場人物と調査資料

設定パネルの「H1 の前で自動改ページ」が ON の場合、この章は自動的に新しいページから開始されます。
また、任意の箇所に \`\\pagebreak\` と書くと手動で改ページを差し込むこともできます。

## 2-1. NPC一覧

| 名前 | 立場 | 特徴 | 初期態度 |
| :--- | :--- | :--- | :---: |
| 霧島 透 | 元・灯台守の孫 | 常に古い懐中時計を持ち歩いている | 普通 |
| 潮見 紗枝 | 地元紙の記者 | 20年前の海難事故を独自に追っている | 協力的 |
| 船長（氏名不詳） | 定期船の操舵手 | 霧の夜は決して港に出ようとしない | 警戒 |

## 2-2. 残された手記

> 霧が深くなる夜、灯台の光は海ではなく、町の方を向く。
> 決して光の中を覗き込んではならない。そこには、帰らぬ船の乗客たちが立っているのだから。

## 2-3. 解読メモ（コードブロック途中分割防止）

コードブロックは長い行でも自動で折り返され、かつページ境界で途中分断されにくいよう制御されています。

\`\`\`text
LIGHTHOUSE_LOG // 1998-11-23 23:40:00 JST
SIGNAL : -- .- -.-- -.. .- -.-- (EMERGENCY BROADCAST REPEATING ON CHANNEL 16)
DEPTH  : 42.8m (ANOMALY DETECTED NEAR REEF SECTOR-04 / DO NOT APPROACH)
STATUS : LENS ROTATION LOCKED TOWARD HARBOR
\`\`\`

\\pagebreak

# 第3章：結末とアフタープレイ

ここは直前の \`\\pagebreak\` によって手動で新しいページから始まっています。

## 3-1. エンディング分岐

> [!success] トゥルーエンド条件
> 灯台の回転歯車を止め、霧島に20年前の日誌を手渡したうえで夜明けを迎える。

> [!failure] バッドエンド条件
> 深夜3時までに脱出経路を確保できず、霧の中へ取り込まれる。

## 3-2. 配布用PDFしおり（アウトライン）の付け方

1. 上部の **「PDF を保存（印刷）」** から印刷ダイアログを開き、「PDFに保存」を実行します（**背景のグラフィック ON / 余白 なし** 推奨）。
2. 右パネルの **「しおり」タブ**（または上部の **「しおり埋め込み」**）に、保存した PDF をドロップします。
3. プレビューで確定した正確なページ番号と階層見出しツリーが **PDFの左しおり** として埋め込まれたファイルが即座にダウンロードされます。
`;

  function deepMergeConfig(base, override) {
    const out = JSON.parse(JSON.stringify(base));
    if (!override || typeof override !== 'object') return out;
    function mergeObj(target, src) {
      Object.keys(src).forEach((key) => {
        const val = src[key];
        if (val && typeof val === 'object' && !Array.isArray(val) && target[key] && typeof target[key] === 'object') {
          mergeObj(target[key], val);
        } else if (val !== undefined) {
          target[key] = val;
        }
      });
    }
    mergeObj(out, override);
    return out;
  }

  return {
    CALLOUT_TYPES,
    CALLOUT_ALIAS_MAP,
    CALLOUT_ICON_MAP,
    DEFAULT_CALLOUT_COLORS,
    PAPER_SIZES,
    THEME_PRESETS,
    SAMPLE_MARKDOWN,
    createDefaultConfig,
    deepMergeConfig,
    resolveCalloutType,
    getCalloutIcon,
  };
}));
