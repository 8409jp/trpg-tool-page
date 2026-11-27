'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Md2HtmlPresets = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // ============================================================
  // OBSIDIAN CALLOUT DEFINITIONS (13 built-in types + aliases)
  // ============================================================
  const CALLOUT_TYPES = [
    {
      id: 'note',
      label: 'Note',
      aliases: [],
      defaultColor: '#448aff',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
    },
    {
      id: 'abstract',
      label: 'Abstract',
      aliases: ['summary', 'tldr'],
      defaultColor: '#00b0ff',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
    },
    {
      id: 'info',
      label: 'Info',
      aliases: [],
      defaultColor: '#0284c7',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    },
    {
      id: 'todo',
      label: 'Todo',
      aliases: [],
      defaultColor: '#0097a7',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    },
    {
      id: 'tip',
      label: 'Tip',
      aliases: ['hint', 'important'],
      defaultColor: '#00a896',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    },
    {
      id: 'success',
      label: 'Success',
      aliases: ['check', 'done'],
      defaultColor: '#16a34a',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    },
    {
      id: 'question',
      label: 'Question',
      aliases: ['help', 'faq'],
      defaultColor: '#ca8a04',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    },
    {
      id: 'warning',
      label: 'Warning',
      aliases: ['caution', 'attention'],
      defaultColor: '#ea580c',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    },
    {
      id: 'failure',
      label: 'Failure',
      aliases: ['fail', 'missing'],
      defaultColor: '#dc2626',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    },
    {
      id: 'danger',
      label: 'Danger',
      aliases: ['error'],
      defaultColor: '#e11d48',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    },
    {
      id: 'bug',
      label: 'Bug',
      aliases: [],
      defaultColor: '#db2777',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>',
    },
    {
      id: 'example',
      label: 'Example',
      aliases: [],
      defaultColor: '#7c3aed',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>',
    },
    {
      id: 'quote',
      label: 'Quote',
      aliases: ['cite'],
      defaultColor: '#64748b',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
    },
  ];

  const CALLOUT_ALIAS_MAP = {};
  const CALLOUT_ICON_MAP = {};
  const DEFAULT_CALLOUT_COLORS = {};

  CALLOUT_TYPES.forEach((ct) => {
    CALLOUT_ALIAS_MAP[ct.id] = ct.id;
    ct.aliases.forEach((al) => {
      CALLOUT_ALIAS_MAP[al] = ct.id;
    });
    CALLOUT_ICON_MAP[ct.id] = ct.icon;
    DEFAULT_CALLOUT_COLORS[ct.id] = ct.defaultColor;
  });

  const FALLBACK_CALLOUT_ICON = CALLOUT_ICON_MAP.info;

  function resolveCalloutType(rawType) {
    const lower = String(rawType || 'note').toLowerCase().trim();
    return CALLOUT_ALIAS_MAP[lower] || 'custom';
  }

  function getCalloutIcon(canonicalType) {
    return CALLOUT_ICON_MAP[canonicalType] || FALLBACK_CALLOUT_ICON;
  }

  // ============================================================
  // DEFAULT CONFIG
  // ============================================================
  function createDefaultConfig() {
    return {
      presetId: 'modern',
      colors: {
        light: {
          pageBg: '#f4f5f7',
          surfaceBg: '#ffffff',
          text: '#1f2328',
          heading: '#111827',
          accent: '#2563eb',
          link: '#2563eb',
        },
        dark: {
          pageBg: '#0d1117',
          surfaceBg: '#161b22',
          text: '#e6edf3',
          heading: '#f0f6fc',
          accent: '#58a6ff',
          link: '#58a6ff',
        },
      },
      typography: {
        bodyFont: 'gothic',       // 'gothic' | 'serif' | 'rounded' | 'mono'
        headingFont: 'inherit',   // 'inherit' | 'gothic' | 'serif' | 'mono'
        fontSize: 'md',           // 'sm' | 'md' | 'lg'
        contentWidth: 'normal',   // 'narrow' | 'normal' | 'wide'
        lineHeight: 1.8,
      },
      headings: {
        h1Style: 'underline',     // 'simple' | 'underline' | 'left-bar' | 'box' | 'double-line' | 'center-ornament' | 'cyber'
        h2Style: 'left-bar',      // 'simple' | 'underline' | 'left-bar' | 'box' | 'double-line' | 'cyber'
        h3Style: 'simple',        // 'simple' | 'underline' | 'left-bar' | 'dot' | 'cyber'
        topSpace: 1.0,            // 0.5 - 2.0 multiplier for heading top spacing
      },
      callout: {
        style: 'obsidian',        // 'obsidian' | 'left-border' | 'outline' | 'filled'
        colors: Object.assign({}, DEFAULT_CALLOUT_COLORS),
      },
      elements: {
        blockquoteStyle: 'border', // 'border' | 'quote-icon' | 'card'
        boldStyle: 'normal',       // 'normal' | 'accent' | 'marker'
        hrStyle: 'solid',          // 'solid' | 'dashed' | 'ornament'
        tableStyle: 'clean',       // 'clean' | 'striped' | 'bordered'
        codeWrap: 'wrap',          // 'wrap' | 'scroll'
      },
      texture: {
        type: 'none',              // 'none' | 'paper' | 'cyberpunk' | 'dot-grid' | 'lined'
        intensity: 55,             // 0 - 100
        cardStyle: 'elevated',     // 'elevated' | 'flat'
      },
      output: {
        docTitle: '',
        fileName: '',
        initialTheme: 'auto',      // 'auto' | 'light' | 'dark'
        initialSidebar: 'open',    // 'open' | 'closed'
        breaks: true,
        stripComments: true,
        stripFrontmatter: true,
        includeWebFonts: true,
        hoverPreview: true,        // Obsidian-style heading link hover popup
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
      desc: 'Obsidian風のクリーンなドキュメント',
      swatch: ['#f4f5f7', '#2563eb', '#0d1117'],
      apply: {
        colors: {
          light: { pageBg: '#f4f5f7', surfaceBg: '#ffffff', text: '#1f2328', heading: '#111827', accent: '#2563eb', link: '#2563eb' },
          dark:  { pageBg: '#0d1117', surfaceBg: '#161b22', text: '#e6edf3', heading: '#f0f6fc', accent: '#58a6ff', link: '#58a6ff' },
        },
        typography: { bodyFont: 'gothic', headingFont: 'inherit', fontSize: 'md', contentWidth: 'normal', lineHeight: 1.8 },
        headings: { h1Style: 'underline', h2Style: 'left-bar', h3Style: 'simple' },
        callout: { style: 'obsidian', colors: Object.assign({}, DEFAULT_CALLOUT_COLORS) },
        elements: { blockquoteStyle: 'border', boldStyle: 'normal', hrStyle: 'solid', tableStyle: 'clean' },
        texture: { type: 'none', intensity: 50, cardStyle: 'elevated' },
        output: { initialTheme: 'auto' },
      },
    },
    {
      id: 'parchment',
      name: '古書・羊皮紙',
      desc: '紙の質感＋明朝体。CoC・ファンタジー向け',
      swatch: ['#f3ebd8', '#8b3a2b', '#1e1915'],
      apply: {
        colors: {
          light: { pageBg: '#ebe1cc', surfaceBg: '#f8f2e4', text: '#2c241b', heading: '#4a2117', accent: '#8b3a2b', link: '#7c2d12' },
          dark:  { pageBg: '#191512', surfaceBg: '#231d18', text: '#e5dac8', heading: '#f3e5cc', accent: '#d98a5f', link: '#e6a57e' },
        },
        typography: { bodyFont: 'serif', headingFont: 'serif', fontSize: 'md', contentWidth: 'normal', lineHeight: 1.9 },
        headings: { h1Style: 'double-line', h2Style: 'left-bar', h3Style: 'dot' },
        callout: {
          style: 'left-border',
          colors: Object.assign({}, DEFAULT_CALLOUT_COLORS, {
            note: '#5b6d8a',
            tip: '#3c7a67',
            warning: '#b45309',
            danger: '#9f2b2b',
            quote: '#786b5c',
          }),
        },
        elements: { blockquoteStyle: 'quote-icon', boldStyle: 'accent', hrStyle: 'ornament', tableStyle: 'bordered' },
        texture: { type: 'paper', intensity: 68, cardStyle: 'elevated' },
        output: { initialTheme: 'light' },
      },
    },
    {
      id: 'cyberpunk',
      name: 'サイバーパンク',
      desc: 'ネオングリッド＋発光見出し。SF・近未来向け',
      swatch: ['#070b14', '#00f0ff', '#ff2a85'],
      apply: {
        colors: {
          light: { pageBg: '#e8eef5', surfaceBg: '#f4f8fc', text: '#0f172a', heading: '#0284c7', accent: '#0284c7', link: '#db2777' },
          dark:  { pageBg: '#060913', surfaceBg: '#0c1324', text: '#d8e9ff', heading: '#00f0ff', accent: '#00f0ff', link: '#ff3b9a' },
        },
        typography: { bodyFont: 'gothic', headingFont: 'mono', fontSize: 'md', contentWidth: 'normal', lineHeight: 1.75 },
        headings: { h1Style: 'cyber', h2Style: 'cyber', h3Style: 'cyber' },
        callout: {
          style: 'outline',
          colors: Object.assign({}, DEFAULT_CALLOUT_COLORS, {
            note: '#00d2ff',
            info: '#00f0ff',
            tip: '#00ffa3',
            warning: '#ffbe0b',
            danger: '#ff2a85',
            example: '#b56bff',
          }),
        },
        elements: { blockquoteStyle: 'card', boldStyle: 'accent', hrStyle: 'dashed', tableStyle: 'striped' },
        texture: { type: 'cyberpunk', intensity: 72, cardStyle: 'elevated' },
        output: { initialTheme: 'dark' },
      },
    },
    {
      id: 'novel',
      name: '文芸ノベル',
      desc: '落ち着いた読み物・シナリオ本文向け',
      swatch: ['#f7f5f0', '#2e4c6d', '#1c2026'],
      apply: {
        colors: {
          light: { pageBg: '#f2efe9', surfaceBg: '#fcfbf8', text: '#262626', heading: '#1d3557', accent: '#3d5a80', link: '#2b507e' },
          dark:  { pageBg: '#14171c', surfaceBg: '#1c2128', text: '#dce1e8', heading: '#e8eef5', accent: '#7da7d9', link: '#8fb9ea' },
        },
        typography: { bodyFont: 'serif', headingFont: 'serif', fontSize: 'lg', contentWidth: 'narrow', lineHeight: 1.95 },
        headings: { h1Style: 'center-ornament', h2Style: 'underline', h3Style: 'dot' },
        callout: { style: 'obsidian', colors: Object.assign({}, DEFAULT_CALLOUT_COLORS) },
        elements: { blockquoteStyle: 'quote-icon', boldStyle: 'marker', hrStyle: 'ornament', tableStyle: 'clean' },
        texture: { type: 'paper', intensity: 35, cardStyle: 'flat' },
        output: { initialTheme: 'auto' },
      },
    },
    {
      id: 'monochrome',
      name: 'モノクロ資料',
      desc: '高コントラスト白黒。ハンドアウト・印刷向け',
      swatch: ['#f5f5f5', '#171717', '#111111'],
      apply: {
        colors: {
          light: { pageBg: '#ededed', surfaceBg: '#ffffff', text: '#171717', heading: '#0a0a0a', accent: '#171717', link: '#333333' },
          dark:  { pageBg: '#0a0a0a', surfaceBg: '#141414', text: '#e5e5e5', heading: '#ffffff', accent: '#d4d4d4', link: '#a3a3a3' },
        },
        typography: { bodyFont: 'gothic', headingFont: 'gothic', fontSize: 'md', contentWidth: 'normal', lineHeight: 1.75 },
        headings: { h1Style: 'box', h2Style: 'underline', h3Style: 'left-bar' },
        callout: {
          style: 'left-border',
          colors: Object.assign({}, DEFAULT_CALLOUT_COLORS, {
            note: '#525252',
            info: '#525252',
            quote: '#525252',
          }),
        },
        elements: { blockquoteStyle: 'border', boldStyle: 'normal', hrStyle: 'solid', tableStyle: 'bordered' },
        texture: { type: 'dot-grid', intensity: 40, cardStyle: 'elevated' },
        output: { initialTheme: 'light' },
      },
    },
  ];

  // ============================================================
  // SAMPLE MARKDOWN (Showcase of TOC Tree, Callouts, Obsidian Syntax)
  // ============================================================
  const SAMPLE_MARKDOWN = `---
title: 霧の灯台と消えた航路 ― シナリオ資料
---

# 霧の灯台と消えた航路

このドキュメントは **Md2Html** のプレビュー用サンプルです。
右側の設定パネルから==テーマ・配色・見出しデザイン・背景テクスチャ・コールアウト色==を変更すると、即座に反映されます。

%%この行はObsidianコメント記法です。出力設定の「Obsidianコメントを除外」がONのときはHTMLに出力されません。%%

> [!info] セッション概要
> - **推奨人数**: 2〜4人
> - **想定時間**: ボイスセッション 3〜4時間
> - **舞台**: 現代日本・寂れた港町の古い灯台

---

## 第1章：導入と探索の手引き

濃霧に包まれた港町「白霧港」。
定期船の欠航が続く中、探索者たちは一通の古びた手紙を受け取る。
登場人物は [2-1. NPC一覧](#2-1-npc一覧) を、手記の内容は [[#2-2. 残された手記（引用）|残された手記]] をマウスオーバーで確認できます。

### 1-1. 事前チェックリスト

出力HTML上でもチェックボックスをクリックして進捗を管理できます。

- [x] キャラクターシートの提出
- [x] 導入ハンドアウトの確認
- [ ] 灯台守の日誌を解読する
- [ ] 地下室の鍵を入手する

### 1-2. 探索フェーズのルール

> [!tip]+ 探索のヒント（クリックで折りたたみ可能）
> 怪しいと感じた場所では **〈目星〉** または **〈聞き耳〉** を宣言してください。
> 失敗した場合でも、別のアプローチや時間をかけることで情報が得られる場合があります。

> [!warning]- KP専用メモ（初期状態は閉じています）
> このエリアの調査が2回以上続いた場合、外から霧笛の音が響き、NPC「霧島」が合流します。
>
> > [!danger] ネストされたコールアウト
> > 深夜0時を過ぎると、灯台の1階扉は外から施錠され、**SANチェック（1/1d4）** が発生します。

---

## 第2章：主な登場人物と資料

### 2-1. NPC一覧

| 名前 | 立場 | 特徴 | 初期好感度 |
| :--- | :--- | :--- | :---: |
| 霧島 透 | 元・灯台守の孫 | 常に古い懐中時計を持ち歩いている | 普通 |
| 潮見 紗枝 | 地元紙の記者 | 20年前の海難事故を独自に追っている | 協力的 |
| 船長（氏名不詳） | 定期船の操舵手 | 霧の夜は決して港に出ようとしない | 警戒 |

### 2-2. 残された手記（引用）

> 霧が深くなる夜、灯台の光は海ではなく、町の方を向く。
> 決して光の中を覗き込んではならない。そこには、帰らぬ船の乗客たちが立っているのだから。

### 2-3. 暗号メモ（コードブロック）

\`\`\`text
LIGHTHOUSE_LOG // 1998-11-23
SIGNAL:  -- .- -.-- -.. .- -.--
DEPTH :  42.8m (ANOMALY DETECTED)
\`\`\`

---

## 第3章：Obsidian コールアウト一覧

右パネルの「記法デザイン」タブから、コールアウトの枠スタイルや各タイプの色を自由に調整できます。

> [!note] Note
> 標準的な補足メモや注釈に使います。

> [!abstract] Abstract / Summary / TLDR
> 要約やセクションの冒頭サマリーに適しています。

> [!success] Success / Check / Done
> 判定成功時の描写や、条件達成時のリワード表示に便利です。

> [!question] Question / Help / FAQ
> プレイヤーからのよくある質問や謎解きの設問に使えます。

> [!failure] Failure / Danger / Bug
> 判定失敗時のペナルティや、致命的な罠の警告に利用できます。

> [!example] Example
> 判定例やロールプレイの参考例をまとめるのに向いています。

> [!quote] Quote / Cite
> 手記・古文書・NPCのセリフ引用に最適です。
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
    THEME_PRESETS,
    SAMPLE_MARKDOWN,
    createDefaultConfig,
    deepMergeConfig,
    resolveCalloutType,
    getCalloutIcon,
  };
}));
