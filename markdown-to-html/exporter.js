'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('./presets.js'),
      require('./parser.js')
    );
  } else {
    root.Md2HtmlExporter = factory(root.Md2HtmlPresets, root.Md2HtmlParser);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (Presets, Parser) {

  const escapeHtml = Parser.escapeHtml;

  // ============================================================
  // COLOR UTILITIES
  // ============================================================
  function normalizeHex(hex, fallback) {
    if (typeof hex !== 'string') return fallback || '#000000';
    const clean = hex.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
      return '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
    }
    return fallback || '#000000';
  }

  function hexToRgb(hex) {
    const h = normalizeHex(hex, '#000000').slice(1);
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }

  function hexToRgbStr(hex) {
    return hexToRgb(hex).join(', ');
  }

  function mixHex(hexA, hexB, ratioB) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    const t = Math.max(0, Math.min(1, ratioB));
    const r = Math.round(a[0] * (1 - t) + b[0] * t);
    const g = Math.round(a[1] * (1 - t) + b[1] * t);
    const bl = Math.round(a[2] * (1 - t) + b[2] * t);
    return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  // ============================================================
  // FONT STACKS & GOOGLE FONTS
  // ============================================================
  const FONT_STACKS = {
    gothic: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', sans-serif",
    serif: "'Shippori Mincho', 'Noto Serif JP', 'Yu Mincho', 'Hiragino Mincho ProN', Georgia, serif",
    rounded: "'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', 'Yu Gothic UI', sans-serif",
    mono: "'JetBrains Mono', 'Noto Sans Mono', 'Consolas', 'BIZ UDGothic', monospace",
  };

  function buildGoogleFontsLinks(config) {
    if (!config.output.includeWebFonts) return '';
    const needed = new Set();
    const bodyF = config.typography.bodyFont;
    const headF = config.typography.headingFont === 'inherit' ? bodyF : config.typography.headingFont;

    [bodyF, headF].forEach((f) => {
      if (f === 'gothic') needed.add('family=Noto+Sans+JP:wght@400;500;700');
      else if (f === 'serif') needed.add('family=Shippori+Mincho:wght@400;600;700');
      else if (f === 'rounded') needed.add('family=M+PLUS+Rounded+1c:wght@400;500;700');
      else if (f === 'mono') needed.add('family=JetBrains+Mono:wght@400;600;700');
    });
    // Always add a lightweight monospace for code blocks if mono wasn't included
    needed.add('family=JetBrains+Mono:wght@400;600');

    const query = Array.from(needed).join('&') + '&display=swap';
    return `  <link rel="preconnect" href="https://fonts.googleapis.com">\n` +
      `  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n` +
      `  <link href="https://fonts.googleapis.com/css2?${query}" rel="stylesheet">\n`;
  }

  // ============================================================
  // DYNAMIC THEME CSS (Variables only — supports live preview diffing)
  // ============================================================
  function buildThemeVarsCss(config) {
    const light = config.colors.light;
    const dark = config.colors.dark;
    const typo = config.typography;
    const tex = config.texture;

    const fontSizeMap = { sm: '14.5px', md: '16px', lg: '17.5px' };
    const widthMap = { narrow: '680px', normal: '820px', wide: '980px' };

    const bodyFontStack = FONT_STACKS[typo.bodyFont] || FONT_STACKS.gothic;
    const headingFontStack = typo.headingFont === 'inherit'
      ? bodyFontStack
      : (FONT_STACKS[typo.headingFont] || bodyFontStack);

    const texStrength = Math.max(0, Math.min(100, Number(tex.intensity) || 0)) / 100;

    function buildPaletteVars(p, isDark) {
      const pageBg = normalizeHex(p.pageBg, isDark ? '#0d1117' : '#f4f5f7');
      const surfaceBg = normalizeHex(p.surfaceBg, isDark ? '#161b22' : '#ffffff');
      const text = normalizeHex(p.text, isDark ? '#e6edf3' : '#1f2328');
      const heading = normalizeHex(p.heading, isDark ? '#f0f6fc' : '#111827');
      const accent = normalizeHex(p.accent, isDark ? '#58a6ff' : '#2563eb');
      const link = normalizeHex(p.link, accent);

      const textMuted = mixHex(text, surfaceBg, isDark ? 0.36 : 0.42);
      const textFaint = mixHex(text, surfaceBg, isDark ? 0.56 : 0.60);
      const border = mixHex(surfaceBg, text, isDark ? 0.16 : 0.13);
      const borderStrong = mixHex(surfaceBg, text, isDark ? 0.28 : 0.24);
      const surfaceAlt = mixHex(surfaceBg, text, isDark ? 0.055 : 0.035);
      const codeBg = mixHex(surfaceBg, text, isDark ? 0.09 : 0.055);
      const sidebarBg = mixHex(pageBg, surfaceBg, 0.55);
      const headerBg = `rgba(${hexToRgbStr(surfaceBg)}, 0.86)`;
      const markBg = isDark
        ? `rgba(${hexToRgbStr(accent)}, 0.30)`
        : `rgba(${hexToRgbStr('#facc15')}, 0.42)`;
      const markText = text;
      const cardShadow = isDark
        ? '0 8px 30px rgba(0, 0, 0, 0.38)'
        : '0 4px 24px rgba(15, 23, 42, 0.07)';

      return [
        `  --page-bg: ${pageBg};`,
        `  --page-bg-rgb: ${hexToRgbStr(pageBg)};`,
        `  --surface-bg: ${surfaceBg};`,
        `  --surface-bg-rgb: ${hexToRgbStr(surfaceBg)};`,
        `  --surface-alt: ${surfaceAlt};`,
        `  --sidebar-bg: ${sidebarBg};`,
        `  --header-bg: ${headerBg};`,
        `  --text: ${text};`,
        `  --text-rgb: ${hexToRgbStr(text)};`,
        `  --text-muted: ${textMuted};`,
        `  --text-faint: ${textFaint};`,
        `  --heading: ${heading};`,
        `  --heading-rgb: ${hexToRgbStr(heading)};`,
        `  --accent: ${accent};`,
        `  --accent-rgb: ${hexToRgbStr(accent)};`,
        `  --link: ${link};`,
        `  --border: ${border};`,
        `  --border-strong: ${borderStrong};`,
        `  --code-bg: ${codeBg};`,
        `  --mark-bg: ${markBg};`,
        `  --mark-text: ${markText};`,
        `  --card-shadow: ${cardShadow};`,
      ].join('\n');
    }

    // Callout colors as RGB triplets so both light & dark modes harmonize
    const calloutVars = Presets.CALLOUT_TYPES.map((ct) => {
      const hex = normalizeHex((config.callout.colors && config.callout.colors[ct.id]) || ct.defaultColor, ct.defaultColor);
      return `  --callout-${ct.id}: ${hexToRgbStr(hex)};`;
    }).join('\n');

    return `:root {\n` +
      `  --font-body: ${bodyFontStack};\n` +
      `  --font-heading: ${headingFontStack};\n` +
      `  --font-mono: ${FONT_STACKS.mono};\n` +
      `  --font-size-base: ${fontSizeMap[typo.fontSize] || '16px'};\n` +
      `  --content-max-width: ${widthMap[typo.contentWidth] || '820px'};\n` +
      `  --line-height: ${Number(typo.lineHeight) || 1.8};\n` +
      `  --heading-space: ${(config.headings && config.headings.topSpace !== undefined ? Number(config.headings.topSpace) : 1).toFixed(2)};\n` +
      `  --tex-strength: ${texStrength.toFixed(3)};\n` +
      `  --sidebar-width: 280px;\n` +
      `  --header-height: 52px;\n` +
      `${calloutVars}\n` +
      `  --callout-custom: var(--accent-rgb);\n` +
      `${buildPaletteVars(light, false)}\n` +
      `}\n\n` +
      `html[data-theme="dark"] {\n` +
      `${buildPaletteVars(dark, true)}\n` +
      `}\n`;
  }

  // ============================================================
  // HTML ROOT DATA ATTRIBUTES (Style toggles)
  // ============================================================
  function getStyleAttributes(config) {
    return {
      'data-h1-style': config.headings.h1Style,
      'data-h2-style': config.headings.h2Style,
      'data-h3-style': config.headings.h3Style,
      'data-callout-style': config.callout.style,
      'data-blockquote-style': config.elements.blockquoteStyle,
      'data-bold-style': config.elements.boldStyle,
      'data-hr-style': config.elements.hrStyle,
      'data-table-style': config.elements.tableStyle,
      'data-code-wrap': config.elements.codeWrap || 'wrap',
      'data-hover-preview': config.output.hoverPreview === false ? 'false' : 'true',
      'data-texture': config.texture.type,
      'data-card-style': config.texture.cardStyle,
    };
  }

  // ============================================================
  // BASE STYLESHEET FOR STANDALONE DOCUMENT
  // ============================================================
  const PAPER_NOISE_SVG_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E";

  function buildBaseDocumentCss() {
    return `
*, *::before, *::after { box-sizing: border-box; }

html {
  scroll-behavior: smooth;
  font-size: 16px;
}

body {
  margin: 0;
  min-height: 100vh;
  background-color: var(--page-bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: calc(var(--font-size-base) * var(--font-scale, 1));
  line-height: var(--line-height);
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.2s ease, color 0.2s ease;
  position: relative;
}

/* ============================================================
   BACKGROUND TEXTURES (Pure CSS / Inline SVG — Zero External Assets)
   ============================================================ */
body::before,
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.25s ease;
}

html[data-texture="none"] body::before,
html[data-texture="none"] body::after {
  display: none;
}

/* 1. Paper / Parchment Grain Texture */
html[data-texture="paper"] body::before {
  background-image: url("${PAPER_NOISE_SVG_URI}");
  background-repeat: repeat;
  background-size: 220px 220px;
  opacity: calc(var(--tex-strength) * 0.42);
  mix-blend-mode: multiply;
}
html[data-theme="dark"][data-texture="paper"] body::before {
  opacity: calc(var(--tex-strength) * 0.24);
  mix-blend-mode: screen;
}
html[data-texture="paper"] body::after {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(var(--accent-rgb), calc(var(--tex-strength) * 0.05)), transparent 65%),
    radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0, 0, 0, calc(var(--tex-strength) * 0.14)) 100%);
}
html[data-theme="dark"][data-texture="paper"] body::after {
  background:
    radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0, 0, 0, calc(var(--tex-strength) * 0.42)) 100%);
}

/* 2. Cyberpunk Grid & Scanlines */
html[data-texture="cyberpunk"] body::before {
  background-image:
    linear-gradient(to right, rgba(var(--accent-rgb), calc(var(--tex-strength) * 0.15)) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(var(--accent-rgb), calc(var(--tex-strength) * 0.15)) 1px, transparent 1px),
    linear-gradient(to right, rgba(var(--accent-rgb), calc(var(--tex-strength) * 0.05)) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(var(--accent-rgb), calc(var(--tex-strength) * 0.05)) 1px, transparent 1px);
  background-size: 48px 48px, 48px 48px, 12px 12px, 12px 12px;
}
html[data-texture="cyberpunk"] body::after {
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 2px,
      rgba(var(--text-rgb), calc(var(--tex-strength) * 0.03)) 3px,
      transparent 4px
    ),
    radial-gradient(circle at 12% 10%, rgba(var(--accent-rgb), calc(var(--tex-strength) * 0.16)), transparent 42%),
    radial-gradient(circle at 88% 85%, rgba(255, 42, 133, calc(var(--tex-strength) * 0.12)), transparent 45%);
}

/* 3. Dot Grid */
html[data-texture="dot-grid"] body::before {
  background-image: radial-gradient(rgba(var(--text-rgb), calc(var(--tex-strength) * 0.24)) 1.15px, transparent 1.15px);
  background-size: 22px 22px;
}
html[data-texture="dot-grid"] body::after {
  display: none;
}

/* 4. Lined Notebook */
html[data-texture="lined"] body::before {
  background-image:
    linear-gradient(to bottom, transparent calc(100% - 1px), rgba(var(--text-rgb), calc(var(--tex-strength) * 0.14)) 100%);
  background-size: 100% 32px;
  background-position: 0 12px;
}
html[data-texture="lined"] body::after {
  background-image: linear-gradient(to right, transparent 44px, rgba(var(--accent-rgb), calc(var(--tex-strength) * 0.22)) 44px, rgba(var(--accent-rgb), calc(var(--tex-strength) * 0.22)) 46px, transparent 46px);
}

/* ============================================================
   TOP BAR
   ============================================================ */
.doc-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  background: var(--header-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  transition: left 0.25s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.2s ease;
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.topbar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 4px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface-bg);
  color: var(--text);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.icon-btn:hover {
  background: var(--surface-alt);
  border-color: var(--border-strong);
}

.icon-btn svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.icon-btn.is-active {
  border-color: var(--accent);
  color: var(--accent);
}

.font-size-group {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 7px;
  overflow: hidden;
  background: var(--surface-bg);
}

.font-size-group button {
  height: 32px;
  padding: 0 9px;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.font-size-group button:hover {
  background: var(--surface-alt);
}

.font-size-group button + button {
  border-left: 1px solid var(--border);
}

/* Theme icons visibility */
.theme-icon-sun { display: none; }
.theme-icon-moon { display: block; }
html[data-theme="dark"] .theme-icon-sun { display: block; }
html[data-theme="dark"] .theme-icon-moon { display: none; }

/* ============================================================
   LEFT SIDEBAR (OUTLINE / TOC TREE)
   ============================================================ */
.toc-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(2px);
  z-index: 340;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease;
}

.toc-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  max-width: 85vw;
  z-index: 350;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  transform: translateX(-100%);
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.2s ease;
}

body.sidebar-open .toc-sidebar {
  transform: translateX(0);
}

.toc-header {
  height: var(--header-height);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid var(--border);
}

.toc-header-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--heading);
}

.toc-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toc-mini-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.toc-mini-btn:hover {
  background: var(--surface-alt);
  color: var(--text);
}

.toc-mini-btn svg {
  width: 15px;
  height: 15px;
}

.toc-search-wrap {
  padding: 10px 12px 6px;
  flex-shrink: 0;
}

.toc-search {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-bg);
  color: var(--text);
  font-family: inherit;
  font-size: 12.5px;
  outline: none;
  transition: border-color 0.15s ease;
}

.toc-search:focus {
  border-color: var(--accent);
}

.toc-search::placeholder {
  color: var(--text-faint);
}

.toc-nav {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px 24px;
  scrollbar-width: thin;
}

.toc-empty {
  padding: 18px 10px;
  font-size: 12.5px;
  color: var(--text-faint);
  text-align: center;
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-children {
  margin-left: 11px;
  padding-left: 10px;
  border-left: 1px solid var(--border);
}

.toc-item.is-collapsed > .toc-children {
  display: none;
}

.toc-row {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  border-radius: 6px;
  transition: background-color 0.14s ease;
}

.toc-row:hover {
  background: var(--surface-alt);
}

.toc-toggle {
  flex-shrink: 0;
  width: 22px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  padding: 0;
  border-radius: 4px;
}

.toc-toggle:hover {
  color: var(--text);
}

.toc-toggle svg {
  width: 13px;
  height: 13px;
  transform: rotate(90deg);
  transition: transform 0.16s ease;
}

.toc-item.is-collapsed > .toc-row > .toc-toggle svg {
  transform: rotate(0deg);
}

.toc-leaf-spacer {
  flex-shrink: 0;
  width: 22px;
  height: 26px;
  position: relative;
}

.toc-leaf-spacer::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--border-strong);
  transform: translate(-50%, -50%);
}

.toc-link {
  flex: 1;
  min-width: 0;
  padding: 4px 8px 4px 2px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 13px;
  line-height: 1.45;
  word-break: break-word;
  transition: color 0.14s ease;
}

.toc-level-1 > .toc-row > .toc-link {
  font-weight: 700;
  color: var(--text);
}

.toc-level-2 > .toc-row > .toc-link {
  font-weight: 500;
}

.toc-link:hover {
  color: var(--accent);
}

.toc-row.is-active {
  background: rgba(var(--accent-rgb), 0.12);
}

.toc-row.is-active > .toc-link {
  color: var(--accent);
  font-weight: 700;
}

.toc-row.is-active > .toc-leaf-spacer::after {
  background: var(--accent);
}

.toc-item.is-filtered-out {
  display: none;
}

/* ============================================================
   MAIN LAYOUT (Push on desktop >= 960px, Drawer on narrow screens)
   ============================================================ */
.doc-main {
  position: relative;
  z-index: 1;
  padding: calc(var(--header-height) + 28px) 24px 84px;
  transition: margin-left 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (min-width: 960px) {
  body.sidebar-open .doc-main {
    margin-left: var(--sidebar-width);
  }
  body.sidebar-open .doc-topbar {
    left: var(--sidebar-width);
  }
}

@media (max-width: 959px) {
  body.sidebar-open .toc-backdrop {
    opacity: 1;
    pointer-events: auto;
  }
  .doc-main {
    padding: calc(var(--header-height) + 16px) 14px 64px;
  }
  .btn-label-hide-sm {
    display: none;
  }
}

/* ============================================================
   ARTICLE CONTAINER (Card vs Flat)
   ============================================================ */
.doc-article {
  max-width: var(--content-max-width);
  margin: 0 auto;
  border-radius: 12px;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

html[data-card-style="elevated"] .doc-article {
  background: var(--surface-bg);
  border: 1px solid var(--border);
  box-shadow: var(--card-shadow);
  padding: 44px 52px;
}

html[data-card-style="flat"] .doc-article {
  background: transparent;
  padding: 16px 8px;
}

@media (max-width: 680px) {
  html[data-card-style="elevated"] .doc-article {
    padding: 24px 18px;
    border-radius: 8px;
  }
}

/* ============================================================
   MARKDOWN TYPOGRAPHY
   ============================================================ */
.markdown-body > *:first-child { margin-top: 0; }
.markdown-body > *:last-child { margin-bottom: 0; }

.markdown-body p {
  margin: 0 0 1.15em;
}

.markdown-body a {
  color: var(--link);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: rgba(var(--accent-rgb), 0.45);
  transition: text-decoration-color 0.15s ease;
}
.markdown-body a:hover {
  text-decoration-color: currentColor;
}

.markdown-body mark {
  background: var(--mark-bg);
  color: var(--mark-text);
  padding: 0.1em 0.35em;
  border-radius: 3px;
}

/* Bold styles */
.markdown-body strong {
  font-weight: 700;
}
html[data-bold-style="accent"] .markdown-body strong {
  color: var(--accent);
}
html[data-bold-style="marker"] .markdown-body strong {
  background: linear-gradient(transparent 62%, rgba(var(--accent-rgb), 0.28) 62%);
  padding: 0 2px;
}

.markdown-body del {
  opacity: 0.65;
}

/* ============================================================
   HEADINGS (H1 - H6 + Custom Design Presets)
   ============================================================ */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  font-family: var(--font-heading);
  color: var(--heading);
  font-weight: 700;
  line-height: 1.38;
  scroll-margin-top: calc(var(--header-height) + 20px);
}

.markdown-body h1 { font-size: 1.9em; margin: calc(2.4em * var(--heading-space, 1)) 0 0.85em; letter-spacing: 0.01em; }
.markdown-body h2 { font-size: 1.45em; margin: calc(2.7em * var(--heading-space, 1)) 0 0.75em; }
.markdown-body h3 { font-size: 1.18em; margin: calc(2.4em * var(--heading-space, 1)) 0 0.6em; }
.markdown-body h4 { font-size: 1.04em; margin: calc(2.1em * var(--heading-space, 1)) 0 0.5em; }
.markdown-body h5 { font-size: 0.95em; margin: calc(1.9em * var(--heading-space, 1)) 0 0.45em; color: var(--text-muted); }
.markdown-body h6 { font-size: 0.88em; margin: calc(1.7em * var(--heading-space, 1)) 0 0.4em; color: var(--text-muted); }

/* Keep consecutive headings & post-HR headings balanced */
.markdown-body h1 + h2,
.markdown-body h2 + h3,
.markdown-body h3 + h4,
.markdown-body h4 + h5,
.markdown-body h5 + h6 {
  margin-top: calc(1.1em * var(--heading-space, 1));
}
.markdown-body hr + h1,
.markdown-body hr + h2,
.markdown-body hr + h3 {
  margin-top: calc(1.3em * var(--heading-space, 1));
}

/* H1 Styles */
html[data-h1-style="underline"] .markdown-body h1 {
  padding-bottom: 0.35em;
  border-bottom: 2.5px solid var(--accent);
}
html[data-h1-style="left-bar"] .markdown-body h1 {
  padding: 0.3em 0 0.3em 0.7em;
  border-left: 6px solid var(--accent);
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.11), transparent 85%);
  border-radius: 0 6px 6px 0;
}
html[data-h1-style="box"] .markdown-body h1 {
  padding: 0.55em 0.85em;
  background: rgba(var(--accent-rgb), 0.12);
  border: 1px solid rgba(var(--accent-rgb), 0.32);
  border-left: 6px solid var(--accent);
  border-radius: 6px;
}
html[data-h1-style="double-line"] .markdown-body h1 {
  padding: 0.45em 0.2em;
  border-top: 3px double var(--accent);
  border-bottom: 3px double var(--accent);
  text-align: center;
}
html[data-h1-style="center-ornament"] .markdown-body h1 {
  text-align: center;
  padding-bottom: 0.55em;
  position: relative;
}
html[data-h1-style="center-ornament"] .markdown-body h1::after {
  content: '◆';
  display: block;
  font-size: 0.42em;
  color: var(--accent);
  margin-top: 0.6em;
  letter-spacing: 0.3em;
  background: linear-gradient(to right, transparent 15%, var(--border-strong) 44%, transparent 45%, transparent 55%, var(--border-strong) 56%, transparent 85%) no-repeat center / 100% 1px;
}
html[data-h1-style="cyber"] .markdown-body h1 {
  padding: 0.45em 0.85em;
  border-left: 4px solid var(--accent);
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.5);
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.18), rgba(var(--accent-rgb), 0.02));
  text-shadow: 0 0 14px rgba(var(--accent-rgb), 0.35);
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
}

/* H2 Styles */
html[data-h2-style="underline"] .markdown-body h2 {
  padding-bottom: 0.3em;
  border-bottom: 2px solid var(--border-strong);
  position: relative;
}
html[data-h2-style="underline"] .markdown-body h2::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 72px;
  height: 2px;
  background: var(--accent);
}
html[data-h2-style="left-bar"] .markdown-body h2 {
  padding: 0.2em 0 0.2em 0.65em;
  border-left: 4px solid var(--accent);
}
html[data-h2-style="box"] .markdown-body h2 {
  padding: 0.4em 0.75em;
  background: var(--surface-alt);
  border-left: 4px solid var(--accent);
  border-radius: 4px;
}
html[data-h2-style="double-line"] .markdown-body h2 {
  padding-bottom: 0.25em;
  border-bottom: 3px double rgba(var(--accent-rgb), 0.55);
}
html[data-h2-style="cyber"] .markdown-body h2 {
  padding: 0.25em 0.6em;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.45);
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.10), transparent 70%);
}
html[data-h2-style="cyber"] .markdown-body h2::before {
  content: '// ';
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.85em;
}

/* H3 Styles */
html[data-h3-style="underline"] .markdown-body h3 {
  padding-bottom: 0.22em;
  border-bottom: 1px dashed var(--border-strong);
}
html[data-h3-style="left-bar"] .markdown-body h3 {
  padding-left: 0.55em;
  border-left: 3px solid rgba(var(--accent-rgb), 0.7);
}
html[data-h3-style="dot"] .markdown-body h3::before {
  content: '◆';
  color: var(--accent);
  font-size: 0.72em;
  margin-right: 0.48em;
  vertical-align: 0.1em;
}
html[data-h3-style="cyber"] .markdown-body h3::before {
  content: '> ';
  color: var(--accent);
  font-family: var(--font-mono);
}

/* ============================================================
   LISTS & INTERACTIVE TASK LISTS
   ============================================================ */
.markdown-body ul,
.markdown-body ol {
  margin: 0 0 1.15em;
  padding-left: 1.6em;
}

.markdown-body li {
  margin: 0.28em 0;
}

.markdown-body li > ul,
.markdown-body li > ol {
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}

.markdown-body ul.task-list {
  list-style: none;
  padding-left: 0.3em;
}

.markdown-body li.task-list-item {
  display: flex;
  align-items: flex-start;
  gap: 0.55em;
}

.markdown-body li.task-list-item > p {
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.55em;
  flex-wrap: wrap;
}

.markdown-body .task-list-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 1.1em;
  height: 1.1em;
  margin-top: 0.34em;
  flex-shrink: 0;
  border: 1.8px solid var(--border-strong);
  border-radius: 4px;
  background: var(--surface-bg);
  cursor: pointer;
  position: relative;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.markdown-body .task-list-checkbox:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.markdown-body .task-list-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 32%;
  top: 12%;
  width: 34%;
  height: 64%;
  border: solid #ffffff;
  border-width: 0 2px 2px 0;
  transform: rotate(42deg);
}

.markdown-body li.task-list-item.is-checked {
  color: var(--text-muted);
  text-decoration: line-through;
  text-decoration-color: var(--text-faint);
}

/* ============================================================
   HORIZONTAL RULE
   ============================================================ */
.markdown-body hr {
  border: none;
  margin: 2em 0;
  height: 1px;
  background: var(--border);
}

html[data-hr-style="dashed"] .markdown-body hr {
  background: none;
  border-top: 1.5px dashed var(--border-strong);
}

html[data-hr-style="ornament"] .markdown-body hr {
  height: auto;
  background: none;
  text-align: center;
  position: relative;
}
html[data-hr-style="ornament"] .markdown-body hr::before {
  content: '✦   ✦   ✦';
  display: inline-block;
  color: var(--accent);
  opacity: 0.65;
  font-size: 0.8em;
  letter-spacing: 0.35em;
}

/* ============================================================
   BLOCKQUOTES (Standard Quotes)
   ============================================================ */
.markdown-body blockquote {
  margin: 1.25em 0;
  padding: 0.7em 1.1em;
  border-left: 4px solid var(--border-strong);
  color: var(--text-muted);
  background: var(--surface-alt);
  border-radius: 0 6px 6px 0;
}

.markdown-body blockquote > *:first-child {
  margin-top: 0;
}

.markdown-body blockquote > *:last-child {
  margin-bottom: 0;
}

html[data-blockquote-style="quote-icon"] .markdown-body blockquote {
  position: relative;
  padding: 1em 1.2em 1em 2.5em;
  border-left: 3px solid var(--accent);
  font-style: italic;
}
html[data-blockquote-style="quote-icon"] .markdown-body blockquote::before {
  content: '“';
  position: absolute;
  left: 0.32em;
  top: 0.05em;
  font-family: Georgia, serif;
  font-size: 2.4em;
  line-height: 1;
  color: var(--accent);
  opacity: 0.45;
}

html[data-blockquote-style="card"] .markdown-body blockquote {
  border-left: 4px solid var(--accent);
  border-top: 1px solid var(--border);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  border-radius: 8px;
  padding: 1em 1.25em;
}

/* ============================================================
   OBSIDIAN CALLOUTS
   ============================================================ */
.callout {
  --callout-color: var(--callout-note);
  margin: 1.3em 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(var(--callout-color), 0.25);
  background: rgba(var(--callout-color), 0.08);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

html[data-theme="dark"] .callout {
  background: rgba(var(--callout-color), 0.11);
  border-color: rgba(var(--callout-color), 0.32);
}

.callout[data-callout="note"]     { --callout-color: var(--callout-note); }
.callout[data-callout="abstract"] { --callout-color: var(--callout-abstract); }
.callout[data-callout="info"]     { --callout-color: var(--callout-info); }
.callout[data-callout="todo"]     { --callout-color: var(--callout-todo); }
.callout[data-callout="tip"]      { --callout-color: var(--callout-tip); }
.callout[data-callout="success"]  { --callout-color: var(--callout-success); }
.callout[data-callout="question"] { --callout-color: var(--callout-question); }
.callout[data-callout="warning"]  { --callout-color: var(--callout-warning); }
.callout[data-callout="failure"]  { --callout-color: var(--callout-failure); }
.callout[data-callout="danger"]   { --callout-color: var(--callout-danger); }
.callout[data-callout="bug"]      { --callout-color: var(--callout-bug); }
.callout[data-callout="example"]  { --callout-color: var(--callout-example); }
.callout[data-callout="quote"]    { --callout-color: var(--callout-quote); }
.callout[data-callout="custom"]   { --callout-color: var(--callout-custom); }

.callout-title {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 15px;
  font-weight: 700;
  font-size: 0.96em;
  line-height: 1.4;
  color: rgb(var(--callout-color));
  list-style: none;
}

summary.callout-title {
  cursor: pointer;
  user-select: none;
}

summary.callout-title::-webkit-details-marker,
summary.callout-title::marker {
  display: none;
  content: '';
}

summary.callout-title:hover {
  background: rgba(var(--callout-color), 0.08);
}

.callout-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.callout-icon svg {
  width: 18px;
  height: 18px;
}

.callout-title-inner {
  flex: 1;
  min-width: 0;
}

.callout-fold {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.75;
}

.callout-fold-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.18s ease;
}

details.callout[open] > summary.callout-title .callout-fold-icon {
  transform: rotate(90deg);
}

.callout-content {
  padding: 2px 16px 14px 16px;
  color: var(--text);
}

.callout-content > *:first-child { margin-top: 0; }
.callout-content > *:last-child { margin-bottom: 0; }

/* Callout style variations */
html[data-callout-style="left-border"] .callout {
  border-radius: 4px 8px 8px 4px;
  border-top-color: var(--border);
  border-right-color: var(--border);
  border-bottom-color: var(--border);
  border-left: 4px solid rgb(var(--callout-color));
  background: rgba(var(--callout-color), 0.05);
}

html[data-callout-style="outline"] .callout {
  background: var(--surface-bg);
  border: 1.5px solid rgba(var(--callout-color), 0.65);
  box-shadow: 0 0 12px rgba(var(--callout-color), 0.08);
}
html[data-callout-style="outline"] .callout-title {
  background: rgba(var(--callout-color), 0.10);
  border-bottom: 1px solid rgba(var(--callout-color), 0.22);
}
html[data-callout-style="outline"] .callout.is-title-only .callout-title,
html[data-callout-style="outline"] details.callout:not([open]) .callout-title {
  border-bottom: none;
}
html[data-callout-style="outline"] .callout-content {
  padding-top: 12px;
}

html[data-callout-style="filled"] .callout {
  background: var(--surface-bg);
  border: 1px solid rgba(var(--callout-color), 0.45);
}
html[data-callout-style="filled"] .callout-title {
  background: rgb(var(--callout-color));
  color: #ffffff;
}
html[data-callout-style="filled"] summary.callout-title:hover {
  filter: brightness(1.06);
  background: rgb(var(--callout-color));
}
html[data-callout-style="filled"] .callout-content {
  padding-top: 13px;
}

/* ============================================================
   CODE & CODE BLOCKS
   ============================================================ */
.markdown-body code {
  font-family: var(--font-mono);
  font-size: 0.88em;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  overflow-wrap: anywhere;
}

.markdown-body pre {
  margin: 1.25em 0;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--code-bg);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  overflow-x: hidden;
}

.markdown-body pre code {
  padding: 0;
  background: none;
  border: none;
  font-size: 0.87em;
  white-space: inherit;
  overflow-wrap: inherit;
  word-break: inherit;
}

.code-block {
  margin: 1.25em 0;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--code-bg);
  overflow: hidden;
}

.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-alt);
}

.code-lang {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.code-copy-btn {
  padding: 3px 9px;
  border-radius: 5px;
  border: 1px solid var(--border);
  background: var(--surface-bg);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 11.5px;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.code-copy-btn:hover {
  color: var(--text);
  border-color: var(--border-strong);
}

.code-copy-btn.is-copied {
  color: #16a34a;
  border-color: #16a34a;
}

.code-block pre {
  margin: 0;
  border: none;
  border-radius: 0;
  background: none;
}

html[data-code-wrap="scroll"] .markdown-body pre,
html[data-code-wrap="scroll"] .code-block pre {
  white-space: pre;
  overflow-wrap: normal;
  word-break: normal;
  overflow-x: auto;
}

/* ============================================================
   TABLES
   ============================================================ */
.table-wrap {
  margin: 1.3em 0;
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.94em;
}

.markdown-body th,
.markdown-body td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

.markdown-body th {
  font-weight: 700;
  color: var(--heading);
  background: var(--surface-alt);
}

.markdown-body tr:last-child td {
  border-bottom: none;
}

html[data-table-style="striped"] .markdown-body tbody tr:nth-child(even) {
  background: var(--surface-alt);
}

html[data-table-style="bordered"] .markdown-body th,
html[data-table-style="bordered"] .markdown-body td {
  border: 1px solid var(--border);
}

/* ============================================================
   IMAGES
   ============================================================ */
.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
}

/* ============================================================
   BACK TO TOP BUTTON
   ============================================================ */
.back-to-top {
  position: fixed;
  right: 22px;
  bottom: 22px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface-bg);
  color: var(--text);
  box-shadow: var(--card-shadow);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 250;
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease, border-color 0.15s ease;
}

.back-to-top.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.back-to-top:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.back-to-top svg {
  width: 18px;
  height: 18px;
}

/* Internal heading link subtle affordance */
.markdown-body a.internal-heading-link {
  text-decoration-style: dashed;
  text-decoration-thickness: 1.5px;
  border-radius: 3px;
  padding: 0 2px;
  transition: background-color 0.15s ease, text-decoration-color 0.15s ease;
}
.markdown-body a.internal-heading-link:hover {
  background: rgba(var(--accent-rgb), 0.12);
  text-decoration-style: solid;
}

/* ============================================================
   OBSIDIAN-STYLE HEADING HOVER POPOVER
   ============================================================ */
.heading-popover {
  position: fixed;
  z-index: 600;
  width: min(460px, calc(100vw - 24px));
  max-height: min(390px, 56vh);
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: var(--surface-bg);
  color: var(--text);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.24), 0 2px 8px rgba(0, 0, 0, 0.10);
  opacity: 0;
  transform: translateY(4px) scale(0.985);
  pointer-events: none;
  visibility: hidden;
  transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s ease;
  overflow: hidden;
}

html[data-theme="dark"] .heading-popover {
  box-shadow: 0 16px 46px rgba(0, 0, 0, 0.58), 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.heading-popover.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
  visibility: visible;
}

.heading-popover-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px 8px 12px;
  background: var(--surface-alt);
  border-bottom: 1px solid var(--border);
}

.heading-popover-meta {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  flex: 1;
}

.heading-popover-level {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--accent);
}

.heading-popover-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.heading-popover-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.heading-popover-jump {
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.10);
  border: 1px solid rgba(var(--accent-rgb), 0.28);
  border-radius: 5px;
  padding: 2px 8px;
  cursor: pointer;
  transition: background-color 0.14s ease;
}
.heading-popover-jump:hover {
  background: rgba(var(--accent-rgb), 0.20);
}

.heading-popover-close {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.heading-popover-close:hover {
  background: var(--border);
  color: var(--text);
}

.heading-popover-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px 16px;
  font-size: 0.9em;
  line-height: 1.7;
  scrollbar-width: thin;
}

.heading-popover-body > h1:first-child,
.heading-popover-body > h2:first-child,
.heading-popover-body > h3:first-child,
.heading-popover-body > h4:first-child,
.heading-popover-body > h5:first-child,
.heading-popover-body > h6:first-child {
  margin-top: 0 !important;
}

.heading-popover-empty {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-faint);
}

/* ============================================================
   PRINT STYLES
   ============================================================ */
@media print {
  body::before,
  body::after,
  .doc-topbar,
  .toc-sidebar,
  .toc-backdrop,
  .back-to-top,
  .code-copy-btn,
  .heading-popover {
    display: none !important;
  }
  .doc-main {
    margin: 0 !important;
    padding: 0 !important;
  }
  .doc-article {
    max-width: none !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  .callout, .code-block, .table-wrap {
    break-inside: avoid;
  }
}
`;
  }

  // ============================================================
  // INLINE RUNTIME SCRIPT FOR STANDALONE HTML
  // ============================================================
  function buildDocumentScript(options) {
    const initialTheme = options.initialTheme || 'auto';
    const initialSidebar = options.initialSidebar || 'open';
    const isPreview = Boolean(options.isPreview);

    return `(function () {
  'use strict';

  var IS_PREVIEW = ${isPreview ? 'true' : 'false'};
  var INITIAL_THEME = ${JSON.stringify(initialTheme)};
  var INITIAL_SIDEBAR = ${JSON.stringify(initialSidebar)};
  var STORAGE_PREFIX = 'md2html_doc_';

  function safeGet(key) {
    if (IS_PREVIEW) return null;
    try { return window.localStorage.getItem(STORAGE_PREFIX + key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    if (IS_PREVIEW) return;
    try { window.localStorage.setItem(STORAGE_PREFIX + key, val); } catch (e) {}
  }

  // ── Theme (Light / Dark) ───────────────────────────────────
  var htmlEl = document.documentElement;
  function resolveInitialTheme() {
    var saved = safeGet('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (INITIAL_THEME === 'light' || INITIAL_THEME === 'dark') return INITIAL_THEME;
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (e) {}
    return 'light';
  }

  function applyTheme(mode, persist) {
    htmlEl.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
    if (persist) safeSet('theme', mode);
    var btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      btn.setAttribute('aria-label', mode === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
      btn.title = mode === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え';
    }
  }

  applyTheme(resolveInitialTheme(), false);

  var themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
      if (IS_PREVIEW && window.parent && window.parent !== window) {
        try { window.parent.postMessage({ type: 'md2html:preview-theme', theme: next }, '*'); } catch (e) {}
      }
    });
  }

  // ── Sidebar / Outline Navigation ───────────────────────────
  var bodyEl = document.body;
  var sidebarToggleBtn = document.getElementById('btn-sidebar-toggle');
  var sidebarCloseBtn = document.getElementById('btn-sidebar-close');
  var backdrop = document.getElementById('toc-backdrop');

  function setSidebar(open) {
    bodyEl.classList.toggle('sidebar-open', open);
    if (sidebarToggleBtn) {
      sidebarToggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      sidebarToggleBtn.classList.toggle('is-active', open);
    }
  }

  var isDesktop = window.innerWidth >= 960;
  setSidebar(isDesktop && INITIAL_SIDEBAR === 'open');

  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', function () {
      setSidebar(!bodyEl.classList.contains('sidebar-open'));
    });
  }
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', function () { setSidebar(false); });
  }
  if (backdrop) {
    backdrop.addEventListener('click', function () { setSidebar(false); });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && window.innerWidth < 960 && bodyEl.classList.contains('sidebar-open')) {
      setSidebar(false);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '\\\\') {
      e.preventDefault();
      setSidebar(!bodyEl.classList.contains('sidebar-open'));
    }
  });

  // ── Safe In-Page Anchor Scroll (prevents srcdoc iframe navigation bug) ──
  function scrollToTargetId(targetId) {
    if (!targetId) return;
    var el = document.getElementById(targetId);
    if (!el) {
      try { el = document.getElementById(decodeURIComponent(targetId)); } catch (err) {}
    }
    if (!el) return;
    // Open any collapsed ancestor <details> (e.g. headings inside foldable callouts)
    var parent = el.parentElement;
    while (parent) {
      if (parent.tagName === 'DETAILS') parent.open = true;
      parent = parent.parentElement;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!IS_PREVIEW) {
      try { history.replaceState(null, '', '#' + encodeURIComponent(el.id)); } catch (err) {}
    }
  }

  // ── TOC Tree Interactions (Delegated so dynamic updates work) ──
  var tocNav = document.getElementById('toc-nav');
  if (tocNav) {
    tocNav.addEventListener('click', function (e) {
      var toggle = e.target.closest('.toc-toggle');
      if (toggle) {
        var item = toggle.closest('.toc-item');
        if (item) {
          var collapsed = item.classList.toggle('is-collapsed');
          toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }
        return;
      }
      var link = e.target.closest('.toc-link');
      if (link) {
        e.preventDefault();
        var targetId = link.getAttribute('data-target') || (link.getAttribute('href') || '').replace(/^#/, '');
        scrollToTargetId(targetId);
        if (window.innerWidth < 960) setSidebar(false);
      }
    });
  }

  // Expand / Collapse all TOC branches
  var expandAllBtn = document.getElementById('btn-toc-expand');
  var collapseAllBtn = document.getElementById('btn-toc-collapse');
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', function () {
      document.querySelectorAll('.toc-item.has-children').forEach(function (el) {
        el.classList.remove('is-collapsed');
        var t = el.querySelector(':scope > .toc-row > .toc-toggle');
        if (t) t.setAttribute('aria-expanded', 'true');
      });
    });
  }
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', function () {
      document.querySelectorAll('.toc-item.has-children').forEach(function (el) {
        el.classList.add('is-collapsed');
        var t = el.querySelector(':scope > .toc-row > .toc-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // TOC Search Filter
  var searchInput = document.getElementById('toc-search');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim().toLowerCase();
      var items = document.querySelectorAll('#toc-nav .toc-item');
      if (!q) {
        items.forEach(function (el) { el.classList.remove('is-filtered-out'); });
        return;
      }
      items.forEach(function (el) {
        var link = el.querySelector(':scope > .toc-row > .toc-link');
        var selfMatch = link && link.textContent.toLowerCase().indexOf(q) !== -1;
        var childMatch = false;
        el.querySelectorAll('.toc-link').forEach(function (cl) {
          if (cl.textContent.toLowerCase().indexOf(q) !== -1) childMatch = true;
        });
        el.classList.toggle('is-filtered-out', !(selfMatch || childMatch));
        if (childMatch) el.classList.remove('is-collapsed');
      });
    });
  }

  // ── Active Heading Scroll Spy ──────────────────────────────
  function updateActiveToc() {
    var headings = document.querySelectorAll('#doc-content h1[id], #doc-content h2[id], #doc-content h3[id], #doc-content h4[id], #doc-content h5[id], #doc-content h6[id]');
    if (!headings.length) return;
    var offset = 96;
    var currentId = headings[0].id;
    for (var i = 0; i < headings.length; i++) {
      var rect = headings[i].getBoundingClientRect();
      if (rect.top <= offset) {
        currentId = headings[i].id;
      } else {
        break;
      }
    }
    var rows = document.querySelectorAll('#toc-nav .toc-row.is-active');
    rows.forEach(function (r) { r.classList.remove('is-active'); });
    var activeLink = document.querySelector('#toc-nav .toc-link[data-target="' + CSS.escape(currentId) + '"]');
    if (activeLink && activeLink.parentElement) {
      activeLink.parentElement.classList.add('is-active');
    }
  }

  var scrollTicking = false;
  var backToTopBtn = document.getElementById('btn-back-to-top');
  window.addEventListener('scroll', function () {
    if (!scrollTicking) {
      window.requestAnimationFrame(function () {
        updateActiveToc();
        if (backToTopBtn) {
          backToTopBtn.classList.toggle('is-visible', window.scrollY > 360);
        }
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });
  updateActiveToc();

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── Font Scale Controls ────────────────────────────────────
  var fontScale = 1;
  var btnSmaller = document.getElementById('btn-font-dec');
  var btnLarger = document.getElementById('btn-font-inc');
  function setScale(s) {
    fontScale = Math.max(0.85, Math.min(1.3, Math.round(s * 100) / 100));
    htmlEl.style.setProperty('--font-scale', String(fontScale));
  }
  if (btnSmaller) btnSmaller.addEventListener('click', function () { setScale(fontScale - 0.08); });
  if (btnLarger) btnLarger.addEventListener('click', function () { setScale(fontScale + 0.08); });

  // ── Interactive Task Checkboxes & Code Copy (Delegated) ────
  var contentEl = document.getElementById('doc-content');
  if (contentEl) {
    contentEl.addEventListener('change', function (e) {
      if (e.target.classList && e.target.classList.contains('task-list-checkbox')) {
        var li = e.target.closest('.task-list-item');
        if (li) li.classList.toggle('is-checked', e.target.checked);
      }
    });

    contentEl.addEventListener('click', function (e) {
      var anchor = e.target.closest('a[href^="#"]');
      if (anchor) {
        var hashId = (anchor.getAttribute('href') || '').slice(1);
        if (hashId) {
          e.preventDefault();
          scrollToTargetId(hashId);
          return;
        }
      }
      var copyBtn = e.target.closest('.code-copy-btn');
      if (!copyBtn) return;
      var block = copyBtn.closest('.code-block');
      var codeEl = block && block.querySelector('pre code');
      if (!codeEl) return;
      var text = codeEl.textContent || '';

      function markCopied() {
        copyBtn.textContent = 'コピー済';
        copyBtn.classList.add('is-copied');
        setTimeout(function () {
          copyBtn.textContent = 'コピー';
          copyBtn.classList.remove('is-copied');
        }, 1600);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(markCopied).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }

      function fallbackCopy() {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          markCopied();
        } catch (err) {}
      }
    });
  }

  // ── Obsidian-Style Heading Link Hover Popover ──────────────
  var popoverEl = document.getElementById('heading-popover');
  var popoverLevelEl = document.getElementById('heading-popover-level');
  var popoverTitleEl = document.getElementById('heading-popover-title');
  var popoverBodyEl = document.getElementById('heading-popover-body');
  var popoverJumpBtn = document.getElementById('heading-popover-jump');
  var popoverCloseBtn = document.getElementById('heading-popover-close');

  var hoverShowTimer = null;
  var hoverHideTimer = null;
  var activePopoverAnchor = null;
  var activePopoverTargetId = '';

  function getHeadingLevel(el) {
    if (!el || !el.tagName) return 0;
    var m = el.tagName.match(/^H([1-6])$/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function findHeadingTargetElement(anchor) {
    if (!anchor) return null;
    var raw = anchor.getAttribute('data-heading-target') || (anchor.getAttribute('href') || '').slice(1);
    if (!raw) return null;
    var el = document.getElementById(raw);
    if (!el) {
      try { el = document.getElementById(decodeURIComponent(raw)); } catch (err) {}
    }
    if (!el || getHeadingLevel(el) === 0) return null;
    return el;
  }

  function stripDuplicateIds(node) {
    if (node.removeAttribute) node.removeAttribute('id');
    if (node.querySelectorAll) {
      node.querySelectorAll('[id]').forEach(function (child) {
        child.removeAttribute('id');
      });
    }
    return node;
  }

  function buildSectionPreviewFragment(headingEl) {
    var frag = document.createDocumentFragment();
    var targetLevel = getHeadingLevel(headingEl);
    frag.appendChild(stripDuplicateIds(headingEl.cloneNode(true)));

    var sib = headingEl.nextElementSibling;
    var count = 0;
    while (sib && count < 60) {
      var lv = getHeadingLevel(sib);
      if (lv > 0 && lv <= targetLevel) break;
      frag.appendChild(stripDuplicateIds(sib.cloneNode(true)));
      sib = sib.nextElementSibling;
      count++;
    }
    return frag;
  }

  function positionPopover(anchor) {
    if (!popoverEl || !anchor) return;
    var rect = anchor.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var margin = 12;
    var gap = 8;

    var popW = Math.min(460, vw - margin * 2);
    popoverEl.style.width = popW + 'px';

    // Measure natural height while invisible
    var popH = Math.min(popoverEl.scrollHeight || 260, Math.min(390, Math.floor(vh * 0.56)));
    var spaceBelow = vh - rect.bottom - margin;
    var spaceAbove = rect.top - margin;

    var top;
    if (spaceBelow >= popH + gap || spaceBelow >= spaceAbove) {
      top = Math.min(vh - margin - popH, rect.bottom + gap);
    } else {
      top = Math.max(margin, rect.top - gap - popH);
    }
    if (top < margin) top = margin;

    var left = rect.left;
    if (left + popW > vw - margin) left = vw - margin - popW;
    if (left < margin) left = margin;

    popoverEl.style.left = Math.round(left) + 'px';
    popoverEl.style.top = Math.round(top) + 'px';
  }

  function hidePopoverNow() {
    clearTimeout(hoverShowTimer);
    clearTimeout(hoverHideTimer);
    activePopoverAnchor = null;
    activePopoverTargetId = '';
    if (popoverEl) {
      popoverEl.classList.remove('is-visible');
      popoverEl.setAttribute('aria-hidden', 'true');
    }
  }

  function scheduleHidePopover() {
    clearTimeout(hoverShowTimer);
    clearTimeout(hoverHideTimer);
    hoverHideTimer = setTimeout(hidePopoverNow, 240);
  }

  function showPopoverForAnchor(anchor) {
    if (!popoverEl || htmlEl.getAttribute('data-hover-preview') === 'false') return;
    var headingEl = findHeadingTargetElement(anchor);
    if (!headingEl) return;

    activePopoverAnchor = anchor;
    activePopoverTargetId = headingEl.id;

    var lv = getHeadingLevel(headingEl);
    if (popoverLevelEl) popoverLevelEl.textContent = 'H' + lv;
    if (popoverTitleEl) popoverTitleEl.textContent = (headingEl.textContent || '').trim();

    if (popoverBodyEl) {
      popoverBodyEl.innerHTML = '';
      popoverBodyEl.appendChild(buildSectionPreviewFragment(headingEl));
      popoverBodyEl.scrollTop = 0;
    }

    positionPopover(anchor);
    popoverEl.classList.add('is-visible');
    popoverEl.setAttribute('aria-hidden', 'false');
    // Re-position once rendered in case height changed with wrapped content
    requestAnimationFrame(function () {
      if (activePopoverAnchor === anchor) positionPopover(anchor);
    });
  }

  if (contentEl && popoverEl) {
    contentEl.addEventListener('mouseover', function (e) {
      if (htmlEl.getAttribute('data-hover-preview') === 'false') return;
      var anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;
      if (anchor === activePopoverAnchor && popoverEl.classList.contains('is-visible')) {
        clearTimeout(hoverHideTimer);
        return;
      }
      if (!findHeadingTargetElement(anchor)) return;
      clearTimeout(hoverHideTimer);
      clearTimeout(hoverShowTimer);
      hoverShowTimer = setTimeout(function () {
        showPopoverForAnchor(anchor);
      }, 210);
    });

    contentEl.addEventListener('mouseout', function (e) {
      var anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;
      var toEl = e.relatedTarget;
      if (toEl && (anchor.contains(toEl) || popoverEl.contains(toEl))) return;
      scheduleHidePopover();
    });

    popoverEl.addEventListener('mouseenter', function () {
      clearTimeout(hoverHideTimer);
    });
    popoverEl.addEventListener('mouseleave', function (e) {
      var toEl = e.relatedTarget;
      if (toEl && activePopoverAnchor && activePopoverAnchor.contains(toEl)) return;
      scheduleHidePopover();
    });

    if (popoverJumpBtn) {
      popoverJumpBtn.addEventListener('click', function () {
        var tid = activePopoverTargetId;
        hidePopoverNow();
        if (tid) scrollToTargetId(tid);
      });
    }
    if (popoverCloseBtn) {
      popoverCloseBtn.addEventListener('click', hidePopoverNow);
    }

    // Handle clicks inside popover (in-page anchor jump & code copy)
    popoverEl.addEventListener('click', function (e) {
      var anchor = e.target.closest('a[href^="#"]');
      if (anchor) {
        var hashId = (anchor.getAttribute('href') || '').slice(1);
        if (hashId) {
          e.preventDefault();
          hidePopoverNow();
          scrollToTargetId(hashId);
          return;
        }
      }
      var copyBtn = e.target.closest('.code-copy-btn');
      if (copyBtn) {
        var block = copyBtn.closest('.code-block');
        var codeEl = block && block.querySelector('pre code');
        if (!codeEl) return;
        var text = codeEl.textContent || '';
        function copied() {
          copyBtn.textContent = 'コピー済';
          copyBtn.classList.add('is-copied');
          setTimeout(function () { copyBtn.textContent = 'コピー'; copyBtn.classList.remove('is-copied'); }, 1400);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(copied).catch(function () {});
        }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && popoverEl.classList.contains('is-visible')) {
        hidePopoverNow();
      }
    });
  }

  // Expose helper for live preview host updates
  window.__md2htmlUpdateSpy = updateActiveToc;
})();`;
  }

  // ============================================================
  // GENERATE STANDALONE HTML DOCUMENT
  // ============================================================
  function generateStandaloneHtml(markdownText, config, options) {
    const opts = Object.assign({ isPreview: false, forceTheme: null }, options || {});
    const parsed = Parser.parseMarkdown(markdownText, {
      breaks: config.output.breaks,
      stripComments: config.output.stripComments,
      stripFrontmatter: config.output.stripFrontmatter,
    });

    const title = (config.output.docTitle || '').trim() || parsed.inferredTitle || 'Document';
    const styleAttrs = getStyleAttributes(config);
    const initialTheme = opts.forceTheme || config.output.initialTheme || 'auto';
    const attrStr = Object.entries(styleAttrs)
      .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
      .join(' ');

    const themeVarsCss = buildThemeVarsCss(config);
    const baseCss = buildBaseDocumentCss();
    const fontsHtml = buildGoogleFontsLinks(config);
    const scriptJs = buildDocumentScript({
      initialTheme,
      initialSidebar: config.output.initialSidebar,
      isPreview: opts.isPreview,
    });

    const initialDataTheme = initialTheme === 'dark' ? 'dark' : 'light';

    const html = `<!DOCTYPE html>
<html lang="ja" data-theme="${initialDataTheme}" ${attrStr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
${fontsHtml}  <style id="md2html-theme">
${themeVarsCss}  </style>
  <style id="md2html-base">
${baseCss}  </style>
</head>
<body>
  <div id="toc-backdrop" class="toc-backdrop" aria-hidden="true"></div>

  <aside id="toc-sidebar" class="toc-sidebar" aria-label="目次ナビゲーション">
    <div class="toc-header">
      <div class="toc-header-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
        <span>アウトライン</span>
      </div>
      <div class="toc-header-actions">
        <button type="button" id="btn-toc-expand" class="toc-mini-btn" title="すべて展開" aria-label="すべて展開">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
        </button>
        <button type="button" id="btn-toc-collapse" class="toc-mini-btn" title="すべて折りたたむ" aria-label="すべて折りたたむ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 20 5-5 5 5"/><path d="m7 4 5 5 5-5"/></svg>
        </button>
        <button type="button" id="btn-sidebar-close" class="toc-mini-btn" title="目次を閉じる" aria-label="目次を閉じる">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
    <div class="toc-search-wrap">
      <input type="search" id="toc-search" class="toc-search" placeholder="見出しを絞り込み..." aria-label="見出しを絞り込み">
    </div>
    <nav id="toc-nav" class="toc-nav" aria-label="見出しツリー">
${parsed.tocHtml}
    </nav>
  </aside>

  <header class="doc-topbar">
    <div class="topbar-left">
      <button type="button" id="btn-sidebar-toggle" class="icon-btn" aria-expanded="false" aria-controls="toc-sidebar" title="目次を開閉 (Ctrl+\\)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
        <span class="btn-label-hide-sm">目次</span>
      </button>
      <span id="topbar-title" class="topbar-title">${escapeHtml(title)}</span>
    </div>
    <div class="topbar-right">
      <div class="font-size-group" aria-label="文字サイズ調整">
        <button type="button" id="btn-font-dec" title="文字を小さく" aria-label="文字を小さく">A-</button>
        <button type="button" id="btn-font-inc" title="文字を大きく" aria-label="文字を大きく">A+</button>
      </div>
      <button type="button" id="btn-theme-toggle" class="icon-btn" aria-label="テーマ切り替え" title="テーマ切り替え">
        <svg class="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        <svg class="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        <span class="btn-label-hide-sm">テーマ</span>
      </button>
    </div>
  </header>

  <main class="doc-main">
    <article id="doc-content" class="doc-article markdown-body">
${parsed.html}
    </article>
  </main>

  <div id="heading-popover" class="heading-popover" role="dialog" aria-label="見出しリンクプレビュー" aria-hidden="true">
    <div class="heading-popover-header">
      <div class="heading-popover-meta">
        <span id="heading-popover-level" class="heading-popover-level">H2</span>
        <span id="heading-popover-title" class="heading-popover-title"></span>
      </div>
      <div class="heading-popover-actions">
        <button type="button" id="heading-popover-jump" class="heading-popover-jump" title="この見出しへ移動">移動 ↗</button>
        <button type="button" id="heading-popover-close" class="heading-popover-close" aria-label="プレビューを閉じる">✕</button>
      </div>
    </div>
    <div id="heading-popover-body" class="heading-popover-body markdown-body"></div>
  </div>

  <button type="button" id="btn-back-to-top" class="back-to-top" title="先頭へ戻る" aria-label="先頭へ戻る">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
  </button>

  <script>
${scriptJs}
  </script>
</body>
</html>
`;

    return {
      html,
      parsed,
      title,
    };
  }

  return {
    generateStandaloneHtml,
    buildThemeVarsCss,
    getStyleAttributes,
    hexToRgbStr,
    normalizeHex,
  };
}));
