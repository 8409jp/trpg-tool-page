'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('./presets.js'),
      require('./parser.js'),
      require('./vendor/pdf-lib.min.js')
    );
  } else {
    root.Md2PdfBuilder = factory(root.Md2PdfPresets, root.Md2PdfParser, root.PDFLib);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (Presets, Parser, PDFLib) {

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

  function getGoogleFontsUrl(config) {
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
    needed.add('family=JetBrains+Mono:wght@400;600');
    return 'https://fonts.googleapis.com/css2?' + Array.from(needed).join('&') + '&display=swap';
  }

  // ============================================================
  // PAGE DIMENSIONS & MARGINS
  // ============================================================
  function resolvePaperDimensions(pageCfg) {
    const spec = Presets.PAPER_SIZES[pageCfg.size] || Presets.PAPER_SIZES.A4;
    const isLandscape = spec.forceLandscape || pageCfg.orientation === 'landscape';
    const widthMm = spec.forceLandscape ? spec.w : (isLandscape ? spec.h : spec.w);
    const heightMm = spec.forceLandscape ? spec.h : (isLandscape ? spec.w : spec.h);
    const marginMap = {
      narrow: { top: '14mm', side: '14mm', bottom: '15mm' },
      normal: { top: '20mm', side: '18mm', bottom: '20mm' },
      wide:   { top: '25mm', side: '24mm', bottom: '25mm' },
    };
    const m = marginMap[pageCfg.margin] || marginMap.normal;
    return {
      widthMm,
      heightMm,
      sizeCss: `${widthMm}mm ${heightMm}mm`,
      marginTop: m.top,
      marginSide: m.side,
      marginBottom: m.bottom,
      label: `${spec.label.split(' ')[0]} ${isLandscape ? '横' : '縦'}`,
    };
  }

  // ============================================================
  // COVER PAGE HTML
  // ============================================================
  function buildCoverHtml(config, parsed) {
    if (!config.cover.enabled) return '';
    const fm = parsed.frontmatter || {};
    const title = (config.cover.title || '').trim() || parsed.inferredTitle || 'Untitled Document';
    const subtitle = (config.cover.subtitle || '').trim() || fm.subtitle || '';
    const author = (config.cover.author || '').trim() || fm.author || '';
    const meta = (config.cover.meta || '').trim() || fm.date || fm.version || '';

    return `<section id="pdf-cover" class="pdf-cover pdf-cover--${escapeHtml(config.cover.style || 'modern')}">
  <div class="cover-frame">
    <div class="cover-top-ornament" aria-hidden="true"></div>
    <div class="cover-main">
      ${meta ? `<div class="cover-kicker">${escapeHtml(meta)}</div>` : ''}
      <h1 class="cover-title">${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="cover-subtitle">${escapeHtml(subtitle)}</p>` : ''}
    </div>
    <div class="cover-footer">
      ${author ? `<div class="cover-author">${escapeHtml(author)}</div>` : ''}
      <div class="cover-bottom-bar" aria-hidden="true"></div>
    </div>
  </div>
</section>\n`;
  }

  // ============================================================
  // TOC PAGE HTML (Page numbers filled accurately after Paged.js layout)
  // ============================================================
  function buildTocPageHtml(config, parsed) {
    if (!config.toc.enabled) return '';
    const maxDepth = Number(config.toc.maxDepth) || 3;
    const items = parsed.headings.filter((h) => h.level <= maxDepth);
    const tocTitle = (config.toc.title || '').trim() || '目次';
    const colMode = config.toc.columns || '1';
    const isTwoCol = colMode === '2' || (colMode === 'auto' && items.length >= 18);

    const listHtml = items.length > 0
      ? `<ul class="pdf-toc-list${isTwoCol ? ' is-two-col' : ''}">\n` +
        items.map((h) => {
          return `<li class="pdf-toc-item pdf-toc-lv-${h.level}">` +
            `<a class="pdf-toc-link" href="#${escapeHtml(h.id)}">` +
            `<span class="pdf-toc-text">${escapeHtml(h.text)}</span>` +
            `<span class="pdf-toc-leader" aria-hidden="true"></span>` +
            `<span class="pdf-toc-pagenum" data-toc-target="${escapeHtml(h.id)}">–</span>` +
            `</a></li>`;
        }).join('\n') +
        `\n</ul>`
      : `<p class="pdf-toc-empty">見出しがありません</p>`;

    return `<section id="pdf-toc" class="pdf-toc-page">
  <div class="pdf-toc-header">
    <h2 class="pdf-toc-heading">${escapeHtml(tocTitle)}</h2>
  </div>
  ${listHtml}
</section>\n`;
  }

  // ============================================================
  // BUILD PAGED.JS STYLESHEET
  // ============================================================
  const PAPER_NOISE_SVG_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E";

  // ============================================================
  // BUILD MINIMAL PAGED.JS CORE CSS (Fast css-tree parse: @page & breaks only!)
  // ============================================================
  function buildPagedCoreCss(config, docTitle) {
    const isDark = config.themeMode === 'dark';
    const pal = isDark ? config.colors.dark : config.colors.light;
    const pageBg = normalizeHex(pal.pageBg, isDark ? '#0f141d' : '#ffffff');
    const text = normalizeHex(pal.text, isDark ? '#e6edf3' : '#1f2328');
    const textMuted = mixHex(text, pageBg, isDark ? 0.38 : 0.44);
    const textFaint = mixHex(text, pageBg, isDark ? 0.56 : 0.62);

    const dims = resolvePaperDimensions(config.page);
    const bodyFontStack = FONT_STACKS[config.typography.bodyFont] || FONT_STACKS.gothic;

    const safeHeaderTitle = String(docTitle || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const headerRule = config.page.showHeader
      ? `  @top-right { content: "${safeHeaderTitle}"; font-family: ${bodyFontStack}; font-size: 7.5pt; color: ${textFaint}; vertical-align: bottom; padding-bottom: 4mm; }\n`
      : `  @top-right { content: none; }\n`;
    const footerRule = config.page.showPageNumber
      ? `  @bottom-center { content: counter(page) " / " counter(pages); font-family: ${FONT_STACKS.mono}; font-size: 8pt; color: ${textMuted}; vertical-align: top; padding-top: 4mm; }\n`
      : `  @bottom-center { content: none; }\n`;

    const breakH1Css = config.pagination.breakBeforeH1
      ? `.markdown-body > h1:not(:first-child), .markdown-body > .keep-h1:not(:first-child) { break-before: page; page-break-before: always; }\n`
      : '';
    const breakH2Css = config.pagination.breakBeforeH2
      ? `.markdown-body > h2:not(:first-child), .markdown-body > .keep-h2:not(:first-child) { break-before: page; page-break-before: always; }\n`
      : '';
    const avoidBlocksCss = config.pagination.avoidBreakBlocks
      ? `.code-block, .markdown-body pre, .callout, .markdown-body blockquote, .markdown-body tr, .markdown-body img { break-inside: avoid; page-break-inside: avoid; }\n`
      : '';
    const avoidParagraphsCss = config.pagination.avoidBreakParagraphs
      ? `.markdown-body p { break-inside: avoid; page-break-inside: avoid; }\n`
      : '';

    return `
@page {
  size: ${dims.sizeCss};
  margin: ${dims.marginTop} ${dims.marginSide} ${dims.marginBottom} ${dims.marginSide};
  background-color: ${pageBg};
${headerRule}${footerRule}}

@page cover {
  margin: 14mm;
  background-color: ${pageBg};
  @top-right { content: none; }
  @bottom-center { content: none; }
}

@page toc {
  margin: ${dims.marginTop} ${dims.marginSide} ${dims.marginBottom} ${dims.marginSide};
  background-color: ${pageBg};
  @top-right { content: none; }
${footerRule}}

.pdf-cover { page: cover; break-after: page; page-break-after: always; }
.pdf-toc-page { page: toc; break-after: page; page-break-after: always; }
.pdf-page-break { break-before: page; page-break-before: always; }
.keep-heading-group { break-inside: avoid; page-break-inside: avoid; }
.pdf-toc-item { break-inside: avoid; page-break-inside: avoid; }
.pdf-toc-lv-1 { break-after: avoid; page-break-after: avoid; }
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 { break-after: avoid; page-break-after: avoid; }
.markdown-body p { orphans: 3; widows: 3; }
${breakH1Css}${breakH2Css}${avoidBlocksCss}${avoidParagraphsCss}`;
  }

  // ============================================================
  // BUILD VISUAL STYLESHEET (Native browser <style> — instant live updates!)
  // ============================================================
  function buildVisualCss(config) {
    const isDark = config.themeMode === 'dark';
    const pal = isDark ? config.colors.dark : config.colors.light;
    const pageBg = normalizeHex(pal.pageBg, isDark ? '#0f141d' : '#ffffff');
    const surfaceBg = normalizeHex(pal.surfaceBg, isDark ? '#171e2b' : '#f6f8fa');
    const text = normalizeHex(pal.text, isDark ? '#e6edf3' : '#1f2328');
    const heading = normalizeHex(pal.heading, isDark ? '#f0f6fc' : '#111827');
    const accent = normalizeHex(pal.accent, isDark ? '#58a6ff' : '#2563eb');
    const link = normalizeHex(pal.link, accent);

    const textMuted = mixHex(text, pageBg, isDark ? 0.38 : 0.44);
    const textFaint = mixHex(text, pageBg, isDark ? 0.56 : 0.62);
    const border = mixHex(pageBg, text, isDark ? 0.20 : 0.16);
    const borderStrong = mixHex(pageBg, text, isDark ? 0.34 : 0.28);
    const codeBg = mixHex(pageBg, text, isDark ? 0.08 : 0.045);
    const markBg = isDark
      ? `rgba(${hexToRgbStr(accent)}, 0.30)`
      : `rgba(250, 204, 21, 0.42)`;

    const dims = resolvePaperDimensions(config.page);
    const fontSizeMap = { sm: '9.5pt', md: '10.5pt', lg: '11.5pt' };
    const bodyFontStack = FONT_STACKS[config.typography.bodyFont] || FONT_STACKS.gothic;
    const headingFontStack = config.typography.headingFont === 'inherit'
      ? bodyFontStack
      : (FONT_STACKS[config.typography.headingFont] || bodyFontStack);
    const texStrength = Math.max(0, Math.min(100, Number(config.texture.intensity) || 0)) / 100;
    const headingSpace = config.headings && config.headings.topSpace !== undefined
      ? Number(config.headings.topSpace).toFixed(2)
      : '1.00';

    const calloutVars = Presets.CALLOUT_TYPES.map((ct) => {
      const hex = normalizeHex((config.callout.colors && config.callout.colors[ct.id]) || ct.defaultColor, ct.defaultColor);
      return `  --callout-${ct.id}: ${hexToRgbStr(hex)};`;
    }).join('\n');

    let textureCss = '';
    if (config.texture.type === 'paper') {
      const op = (texStrength * (isDark ? 0.24 : 0.36)).toFixed(3);
      const vig = (texStrength * (isDark ? 0.35 : 0.12)).toFixed(3);
      textureCss = `
.pagedjs_pagebox::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("${PAPER_NOISE_SVG_URI}");
  background-repeat: repeat;
  background-size: 220px 220px;
  opacity: ${op};
  pointer-events: none;
  z-index: 0;
}
.pagedjs_pagebox::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0, 0, 0, ${vig}) 100%);
  pointer-events: none;
  z-index: 0;
}`;
    } else if (config.texture.type === 'cyberpunk') {
      const maj = (texStrength * 0.16).toFixed(3);
      const min = (texStrength * 0.05).toFixed(3);
      const g1 = (texStrength * 0.15).toFixed(3);
      const g2 = (texStrength * 0.10).toFixed(3);
      textureCss = `
.pagedjs_pagebox::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(${hexToRgbStr(accent)}, ${maj}) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(${hexToRgbStr(accent)}, ${maj}) 1px, transparent 1px),
    linear-gradient(to right, rgba(${hexToRgbStr(accent)}, ${min}) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(${hexToRgbStr(accent)}, ${min}) 1px, transparent 1px);
  background-size: 36px 36px, 36px 36px, 9px 9px, 9px 9px;
  pointer-events: none;
  z-index: 0;
}
.pagedjs_pagebox::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 10% 8%, rgba(${hexToRgbStr(accent)}, ${g1}), transparent 42%),
    radial-gradient(circle at 90% 92%, rgba(255, 42, 133, ${g2}), transparent 45%);
  pointer-events: none;
  z-index: 0;
}`;
    } else if (config.texture.type === 'dot-grid') {
      const op = (texStrength * 0.25).toFixed(3);
      textureCss = `
.pagedjs_pagebox::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(${hexToRgbStr(text)}, ${op}) 1px, transparent 1px);
  background-size: 18px 18px;
  pointer-events: none;
  z-index: 0;
}`;
    } else if (config.texture.type === 'lined') {
      const op = (texStrength * 0.15).toFixed(3);
      const acc = (texStrength * 0.22).toFixed(3);
      textureCss = `
.pagedjs_pagebox::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, transparent 14mm, rgba(${hexToRgbStr(accent)}, ${acc}) 14mm, rgba(${hexToRgbStr(accent)}, ${acc}) 14.4mm, transparent 14.4mm),
    linear-gradient(to bottom, transparent calc(100% - 1px), rgba(${hexToRgbStr(text)}, ${op}) 100%);
  background-size: 100% 100%, 100% 8mm;
  pointer-events: none;
  z-index: 0;
}`;
    }

    return `
:root {
  --page-bg: ${pageBg};
  --page-bg-rgb: ${hexToRgbStr(pageBg)};
  --surface-bg: ${surfaceBg};
  --text: ${text};
  --text-rgb: ${hexToRgbStr(text)};
  --text-muted: ${textMuted};
  --text-faint: ${textFaint};
  --heading: ${heading};
  --accent: ${accent};
  --accent-rgb: ${hexToRgbStr(accent)};
  --link: ${link};
  --border: ${border};
  --border-strong: ${borderStrong};
  --code-bg: ${codeBg};
  --mark-bg: ${markBg};
  --font-body: ${bodyFontStack};
  --font-heading: ${headingFontStack};
  --font-mono: ${FONT_STACKS.mono};
  --font-size-base: ${fontSizeMap[config.typography.fontSize] || '10.5pt'};
  --line-height: ${Number(config.typography.lineHeight) || 1.75};
  --heading-space: ${headingSpace};
${calloutVars}
  --callout-custom: var(--accent-rgb);
}

*, *::before, *::after {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

body {
  margin: 0;
  color: var(--text);
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  line-height: var(--line-height);
}

.pagedjs_page {
  background-color: var(--page-bg) !important;
}
.pagedjs_pagebox {
  position: relative;
  background-color: var(--page-bg) !important;
}
.pagedjs_margin-top-right-corner-holder,
.pagedjs_margin-top-right > .pagedjs_margin-content {
  color: var(--text-faint) !important;
}
.pagedjs_margin-bottom-center > .pagedjs_margin-content {
  color: var(--text-muted) !important;
}
.pagedjs_area,
.pagedjs_margin-top,
.pagedjs_margin-bottom,
.pagedjs_margin-left,
.pagedjs_margin-right {
  position: relative;
  z-index: 1;
}
${textureCss}

/* ============================================================
   COVER PAGE
   ============================================================ */
.pdf-cover {
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.cover-frame {
  width: 100%;
  min-height: calc(${dims.heightMm}mm - 29mm);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18mm 14mm;
  position: relative;
}

.cover-kicker {
  font-family: var(--font-mono);
  font-size: 9pt;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 6mm;
}

.cover-title {
  font-family: var(--font-heading);
  font-size: 28pt;
  font-weight: 700;
  line-height: 1.3;
  color: var(--heading);
  margin: 0 0 6mm;
  word-break: auto-phrase;
}

.cover-subtitle {
  font-size: 12pt;
  line-height: 1.65;
  color: var(--text-muted);
  margin: 0;
}

.cover-author {
  font-size: 11pt;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.04em;
}

.pdf-cover--modern .cover-frame {
  border-left: 5mm solid var(--accent);
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.08), transparent 55%);
  padding-left: 16mm;
}
.pdf-cover--modern .cover-main { margin: auto 0; }
.pdf-cover--modern .cover-bottom-bar {
  height: 1.5px; width: 48mm; background: var(--accent); margin-top: 4mm;
}

.pdf-cover--classic .cover-frame {
  border: 3px double var(--accent);
  text-align: center;
  padding: 20mm 16mm;
}
.pdf-cover--classic .cover-top-ornament::after {
  content: '✦   ◆   ✦';
  color: var(--accent);
  font-size: 11pt;
  letter-spacing: 0.35em;
  opacity: 0.75;
}
.pdf-cover--classic .cover-main { margin: auto 0; }
.pdf-cover--classic .cover-title {
  padding: 6mm 0;
  border-top: 1px solid var(--border-strong);
  border-bottom: 1px solid var(--border-strong);
}
.pdf-cover--classic .cover-bottom-bar {
  margin: 4mm auto 0; width: 36mm; height: 1px; background: var(--accent);
}

.pdf-cover--cyber .cover-frame {
  border: 1.5px solid rgba(var(--accent-rgb), 0.65);
  background: linear-gradient(160deg, rgba(var(--accent-rgb), 0.12), transparent 50%, rgba(255, 42, 133, 0.08));
}
.pdf-cover--cyber .cover-top-ornament::before {
  content: '// CLASSIFIED DOCUMENT //';
  font-family: var(--font-mono);
  font-size: 8.5pt;
  letter-spacing: 0.2em;
  color: var(--accent);
}
.pdf-cover--cyber .cover-main {
  margin: auto 0; border-left: 3px solid var(--accent); padding-left: 8mm;
}
.pdf-cover--cyber .cover-title {
  text-shadow: 0 0 12px rgba(var(--accent-rgb), 0.35);
}
.pdf-cover--cyber .cover-bottom-bar {
  height: 2px; width: 100%; background: linear-gradient(90deg, var(--accent), transparent); margin-top: 4mm;
}

.pdf-cover--minimal .cover-frame { padding: 22mm 10mm; }
.pdf-cover--minimal .cover-main { margin: auto 0; }
.pdf-cover--minimal .cover-bottom-bar {
  height: 1px; width: 100%; background: var(--border-strong); margin-top: 5mm;
}

/* ============================================================
   TOC PAGE
   ============================================================ */
.pdf-toc-header {
  margin-bottom: 6mm;
  padding-bottom: 3mm;
  border-bottom: 2px solid var(--accent);
}
.pdf-toc-heading {
  font-family: var(--font-heading);
  font-size: 16pt;
  font-weight: 700;
  color: var(--heading);
  margin: 0;
}
.pdf-toc-list { list-style: none; margin: 0; padding: 0; }
.pdf-toc-list.is-two-col {
  column-count: 2;
  column-gap: 8mm;
  column-rule: 1px solid var(--border);
  column-fill: balance;
}
.pdf-toc-item { margin: 0; }
.pdf-toc-link {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 2.2mm 1mm;
  color: var(--text);
  text-decoration: none;
}
.pdf-toc-lv-1 .pdf-toc-link { font-weight: 700; font-size: 10.5pt; padding-top: 3.2mm; color: var(--heading); }
.pdf-toc-lv-2 .pdf-toc-link { padding-left: 6mm; font-size: 9.8pt; }
.pdf-toc-lv-3 .pdf-toc-link { padding-left: 12mm; font-size: 9.2pt; color: var(--text-muted); }
.pdf-toc-lv-4 .pdf-toc-link,
.pdf-toc-lv-5 .pdf-toc-link,
.pdf-toc-lv-6 .pdf-toc-link { padding-left: 17mm; font-size: 8.8pt; color: var(--text-muted); }

/* Compact typography & indentation for 2-column TOC */
.pdf-toc-list.is-two-col .pdf-toc-link { gap: 4px; padding: 1.5mm 0.5mm; }
.pdf-toc-list.is-two-col .pdf-toc-lv-1 .pdf-toc-link { font-size: 9.5pt; padding-top: 2.4mm; }
.pdf-toc-list.is-two-col .pdf-toc-lv-2 .pdf-toc-link { padding-left: 3.8mm; font-size: 8.8pt; }
.pdf-toc-list.is-two-col .pdf-toc-lv-3 .pdf-toc-link { padding-left: 7.2mm; font-size: 8.3pt; }
.pdf-toc-list.is-two-col .pdf-toc-lv-4 .pdf-toc-link,
.pdf-toc-list.is-two-col .pdf-toc-lv-5 .pdf-toc-link,
.pdf-toc-list.is-two-col .pdf-toc-lv-6 .pdf-toc-link { padding-left: 10mm; font-size: 8pt; }
.pdf-toc-list.is-two-col .pdf-toc-leader { min-width: 4mm; }
.pdf-toc-list.is-two-col .pdf-toc-pagenum { font-size: 8.2pt; }
.pdf-toc-text { flex-shrink: 1; }
.pdf-toc-leader {
  flex: 1;
  min-width: 10mm;
  border-bottom: 1px dotted var(--border-strong);
  transform: translateY(-2px);
}
.pdf-toc-pagenum {
  font-family: var(--font-mono);
  font-size: 9pt;
  font-weight: 600;
  color: var(--accent);
  flex-shrink: 0;
}
.pdf-toc-empty { color: var(--text-faint); font-size: 9.5pt; }

/* ============================================================
   DOCUMENT BODY
   ============================================================ */
.pdf-page-break { height: 0; margin: 0; padding: 0; }
.markdown-body > *:first-child { margin-top: 0 !important; }
.keep-heading-group > *:first-child { margin-top: inherit; }
.markdown-body > .keep-heading-group:first-child > *:first-child { margin-top: 0 !important; }
.markdown-body p { margin: 0 0 0.95em; }
.markdown-body a { color: var(--link); text-decoration: underline; text-underline-offset: 2px; }
.markdown-body mark { background: var(--mark-bg); color: var(--text); padding: 0.08em 0.3em; border-radius: 3px; }
.markdown-body strong { font-weight: 700; }
.pdf-root[data-bold-style="accent"] .markdown-body strong { color: var(--accent); }
.pdf-root[data-bold-style="marker"] .markdown-body strong {
  background: linear-gradient(transparent 62%, rgba(var(--accent-rgb), 0.28) 62%);
  padding: 0 2px;
}

/* ============================================================
   HEADINGS
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
  position: relative;
}
.markdown-body h1 { font-size: 1.75em; margin: calc(2.1em * var(--heading-space, 1)) 0 0.75em; }
.markdown-body h2 { font-size: 1.35em; margin: calc(2.3em * var(--heading-space, 1)) 0 0.65em; }
.markdown-body h3 { font-size: 1.12em; margin: calc(2.0em * var(--heading-space, 1)) 0 0.5em; }
.markdown-body h4 { font-size: 1.02em; margin: calc(1.7em * var(--heading-space, 1)) 0 0.45em; }
.markdown-body h5 { font-size: 0.94em; margin: calc(1.5em * var(--heading-space, 1)) 0 0.4em; color: var(--text-muted); }
.markdown-body h6 { font-size: 0.88em; margin: calc(1.3em * var(--heading-space, 1)) 0 0.35em; color: var(--text-muted); }

.markdown-body h1 + h2,
.markdown-body h2 + h3,
.markdown-body h3 + h4,
.markdown-body h1 + .keep-h2 > h2,
.markdown-body h2 + .keep-h3 > h3 {
  margin-top: calc(0.95em * var(--heading-space, 1));
}

.pdf-back-toc {
  float: right;
  font-family: var(--font-body);
  font-size: 7.5pt;
  font-weight: 500;
  color: var(--text-faint) !important;
  text-decoration: none !important;
  margin-left: 8px;
  line-height: 2.2;
}

.pdf-root[data-h1-style="underline"] .markdown-body h1 { padding-bottom: 0.3em; border-bottom: 2px solid var(--accent); }
.pdf-root[data-h1-style="left-bar"] .markdown-body h1 {
  padding: 0.25em 0.4em 0.25em 0.65em;
  border-left: 5px solid var(--accent);
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.12), transparent 85%);
}
.pdf-root[data-h1-style="box"] .markdown-body h1 {
  padding: 0.45em 0.75em;
  background: rgba(var(--accent-rgb), 0.10);
  border: 1px solid rgba(var(--accent-rgb), 0.32);
  border-left: 5px solid var(--accent);
  border-radius: 5px;
}
.pdf-root[data-h1-style="double-line"] .markdown-body h1 {
  padding: 0.38em 0.2em;
  border-top: 3px double var(--accent);
  border-bottom: 3px double var(--accent);
  text-align: center;
}
.pdf-root[data-h1-style="center-ornament"] .markdown-body h1 { text-align: center; padding-bottom: 0.45em; }
.pdf-root[data-h1-style="center-ornament"] .markdown-body h1::after {
  content: '◆';
  display: block;
  font-size: 0.42em;
  color: var(--accent);
  margin-top: 0.5em;
  background: linear-gradient(to right, transparent 15%, var(--border-strong) 44%, transparent 45%, transparent 55%, var(--border-strong) 56%, transparent 85%) no-repeat center / 100% 1px;
}
.pdf-root[data-h1-style="cyber"] .markdown-body h1 {
  padding: 0.38em 0.75em;
  border-left: 4px solid var(--accent);
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.5);
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.18), rgba(var(--accent-rgb), 0.02));
}

.pdf-root[data-h2-style="underline"] .markdown-body h2 { padding-bottom: 0.25em; border-bottom: 1.5px solid var(--border-strong); }
.pdf-root[data-h2-style="left-bar"] .markdown-body h2 { padding: 0.16em 0 0.16em 0.6em; border-left: 3.5px solid var(--accent); }
.pdf-root[data-h2-style="box"] .markdown-body h2 {
  padding: 0.35em 0.65em; background: var(--surface-bg); border-left: 3.5px solid var(--accent); border-radius: 4px;
}
.pdf-root[data-h2-style="double-line"] .markdown-body h2 { padding-bottom: 0.22em; border-bottom: 3px double rgba(var(--accent-rgb), 0.55); }
.pdf-root[data-h2-style="cyber"] .markdown-body h2 {
  padding: 0.22em 0.55em;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.45);
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.10), transparent 70%);
}
.pdf-root[data-h2-style="cyber"] .markdown-body h2::before {
  content: '// '; color: var(--accent); font-family: var(--font-mono); font-size: 0.85em;
}

.pdf-root[data-h3-style="underline"] .markdown-body h3 { padding-bottom: 0.2em; border-bottom: 1px dashed var(--border-strong); }
.pdf-root[data-h3-style="left-bar"] .markdown-body h3 { padding-left: 0.5em; border-left: 3px solid rgba(var(--accent-rgb), 0.7); }
.pdf-root[data-h3-style="dot"] .markdown-body h3::before {
  content: '◆'; color: var(--accent); font-size: 0.72em; margin-right: 0.45em; vertical-align: 0.08em;
}
.pdf-root[data-h3-style="cyber"] .markdown-body h3::before {
  content: '> '; color: var(--accent); font-family: var(--font-mono);
}

/* ============================================================
   LISTS & TASK LISTS
   ============================================================ */
.markdown-body ul, .markdown-body ol { margin: 0 0 0.95em; padding-left: 1.5em; }
.markdown-body li { margin: 0.22em 0; }
.markdown-body ul.task-list { list-style: none; padding-left: 0.2em; }
.markdown-body li.task-list-item > p { margin: 0; }
.pdf-checkbox {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.05em; height: 1.05em; margin-right: 0.45em;
  border: 1.4px solid var(--border-strong); border-radius: 3px;
  font-size: 0.8em; font-weight: 700; line-height: 1; vertical-align: -0.1em;
}
.pdf-checkbox.is-checked { background: var(--accent); border-color: var(--accent); color: #ffffff; }
.markdown-body li.task-list-item.is-checked { color: var(--text-muted); text-decoration: line-through; }

/* ============================================================
   HR & BLOCKQUOTE
   ============================================================ */
.markdown-body hr { border: none; margin: 1.6em 0; height: 1px; background: var(--border); }
.pdf-root[data-hr-style="dashed"] .markdown-body hr { background: none; border-top: 1.2px dashed var(--border-strong); }
.pdf-root[data-hr-style="ornament"] .markdown-body hr { height: auto; background: none; text-align: center; }
.pdf-root[data-hr-style="ornament"] .markdown-body hr::before {
  content: '✦   ✦   ✦'; color: var(--accent); opacity: 0.65; font-size: 0.8em; letter-spacing: 0.35em;
}

.markdown-body blockquote {
  margin: 1.1em 0; padding: 0.6em 1em;
  border-left: 3.5px solid var(--border-strong);
  color: var(--text-muted); background: var(--surface-bg); border-radius: 0 5px 5px 0;
}
.markdown-body blockquote > *:first-child { margin-top: 0; }
.markdown-body blockquote > *:last-child { margin-bottom: 0; }
.pdf-root[data-blockquote-style="quote-icon"] .markdown-body blockquote {
  position: relative; padding: 0.8em 1em 0.8em 2.2em; border-left: 3px solid var(--accent); font-style: italic;
}
.pdf-root[data-blockquote-style="quote-icon"] .markdown-body blockquote::before {
  content: '“'; position: absolute; left: 0.28em; top: 0.02em;
  font-family: Georgia, serif; font-size: 2.2em; line-height: 1; color: var(--accent); opacity: 0.45;
}
.pdf-root[data-blockquote-style="card"] .markdown-body blockquote {
  border: 1px solid var(--border); border-left: 3.5px solid var(--accent); border-radius: 6px;
}

/* ============================================================
   OBSIDIAN CALLOUTS
   ============================================================ */
.callout {
  --callout-color: var(--callout-note);
  margin: 1.1em 0; border-radius: 6px; overflow: hidden;
  border: 1px solid rgba(var(--callout-color), 0.28);
  background: rgba(var(--callout-color), ${isDark ? '0.12' : '0.07'});
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
  display: flex; align-items: center; gap: 7px; padding: 8px 12px;
  font-weight: 700; font-size: 0.94em; line-height: 1.35; color: rgb(var(--callout-color));
}
.callout-icon { display: inline-flex; align-items: center; flex-shrink: 0; }
.callout-icon svg { width: 15px; height: 15px; }
.callout-content { padding: 1px 13px 11px; color: var(--text); }
.callout-content > *:first-child { margin-top: 0; }
.callout-content > *:last-child { margin-bottom: 0; }

.pdf-root[data-callout-style="left-border"] .callout {
  border-radius: 3px 6px 6px 3px; border-color: var(--border);
  border-left: 3.5px solid rgb(var(--callout-color)); background: rgba(var(--callout-color), 0.05);
}
.pdf-root[data-callout-style="outline"] .callout {
  background: var(--page-bg); border: 1.2px solid rgba(var(--callout-color), 0.65);
}
.pdf-root[data-callout-style="outline"] .callout-title {
  background: rgba(var(--callout-color), 0.10); border-bottom: 1px solid rgba(var(--callout-color), 0.22);
}
.pdf-root[data-callout-style="outline"] .callout-content { padding-top: 9px; }
.pdf-root[data-callout-style="filled"] .callout {
  background: var(--page-bg); border: 1px solid rgba(var(--callout-color), 0.45);
}
.pdf-root[data-callout-style="filled"] .callout-title { background: rgb(var(--callout-color)); color: #ffffff; }
.pdf-root[data-callout-style="filled"] .callout-content { padding-top: 10px; }

/* ============================================================
   CODE BLOCKS (Auto-wrap by default)
   ============================================================ */
.markdown-body code {
  font-family: var(--font-mono); font-size: 0.86em; padding: 0.12em 0.35em;
  border-radius: 3px; background: var(--code-bg); border: 1px solid var(--border);
  overflow-wrap: anywhere;
}
.markdown-body pre {
  margin: 1.05em 0; padding: 10px 12px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--code-bg); line-height: 1.55;
  white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; overflow-x: hidden;
}
.markdown-body pre code {
  padding: 0; background: none; border: none; font-size: 0.84em;
  white-space: inherit; overflow-wrap: inherit; word-break: inherit;
}
.code-block {
  margin: 1.05em 0; border-radius: 6px; border: 1px solid var(--border);
  background: var(--code-bg); overflow: hidden;
}
.code-block-header { padding: 4px 10px; border-bottom: 1px solid var(--border); background: var(--surface-bg); }
.code-lang { font-family: var(--font-mono); font-size: 8pt; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
.code-block pre { margin: 0; border: none; border-radius: 0; background: none; }

/* ============================================================
   TABLES & IMAGES
   ============================================================ */
.table-wrap { margin: 1.1em 0; border-radius: 6px; border: 1px solid var(--border); overflow: hidden; }
.markdown-body table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
.markdown-body th, .markdown-body td { padding: 6px 10px; border-bottom: 1px solid var(--border); text-align: left; }
.markdown-body th { font-weight: 700; color: var(--heading); background: var(--surface-bg); }
.markdown-body tr:last-child td { border-bottom: none; }
.pdf-root[data-table-style="striped"] .markdown-body tbody tr:nth-child(even) { background: var(--surface-bg); }
.pdf-root[data-table-style="bordered"] .markdown-body th,
.pdf-root[data-table-style="bordered"] .markdown-body td { border: 1px solid var(--border); }
.markdown-body img { max-width: 100%; height: auto; border-radius: 5px; }
`;
  }

  function buildPagedCss(config, docTitle) {
    return buildPagedCoreCss(config, docTitle) + '\n' + buildVisualCss(config);
  }

  // ============================================================
  // BUILD FULL RENDER PAYLOAD FOR preview.html
  // ============================================================
  function getVisualRootAttrs(config) {
    return {
      'data-h1-style': config.headings.h1Style,
      'data-h2-style': config.headings.h2Style,
      'data-h3-style': config.headings.h3Style,
      'data-callout-style': config.callout.style,
      'data-blockquote-style': config.elements.blockquoteStyle,
      'data-bold-style': config.elements.boldStyle,
      'data-hr-style': config.elements.hrStyle,
      'data-table-style': config.elements.tableStyle,
    };
  }

  function buildDocumentPayload(markdownText, config) {
    const parsed = Parser.parseMarkdown(markdownText, {
      breaks: config.output.breaks,
      stripComments: config.output.stripComments,
      stripFrontmatter: config.output.stripFrontmatter,
      expandFoldedCallouts: config.callout.expandFolded,
      keepHeadingWithNext: config.pagination.keepHeadingWithNext,
      showTocBackLink: config.page.showTocBackLink,
      tocEnabled: config.toc.enabled,
      tocMaxDepth: config.toc.maxDepth,
    });

    const title = (config.cover.title || '').trim() || parsed.inferredTitle || 'Document';
    const author = (config.cover.author || '').trim() || (parsed.frontmatter && parsed.frontmatter.author) || '';
    const dims = resolvePaperDimensions(config.page);
    const coverHtml = buildCoverHtml(config, parsed);
    const tocHtml = buildTocPageHtml(config, parsed);

    const rootAttrsObj = getVisualRootAttrs(config);
    const rootAttrs = Object.entries(rootAttrsObj)
      .map(([k, v]) => `${k}="${escapeHtml(v)}"`)
      .join(' ');

    const bodyHtml = `<div class="pdf-root" ${rootAttrs}>
${coverHtml}${tocHtml}<main class="markdown-body">
${parsed.html}
</main>
</div>`;

    const pagedCss = buildPagedCoreCss(config, title);
    const visualCss = buildVisualCss(config);
    const css = pagedCss + '\n' + visualCss;
    const fontsUrl = getGoogleFontsUrl(config);

    return {
      title,
      author,
      dims,
      bodyHtml,
      pagedCss,
      visualCss,
      css,
      rootAttrsObj,
      fontsUrl,
      parsed,
    };
  }

  // ============================================================
  // PDF BOOKMARK / OUTLINE TREE EMBEDDER (pdf-lib, UTF-16BE Japanese-safe!)
  // ============================================================
  function encodePdfUtf16Hex(str) {
    // PDF specification: UTF-16BE with BOM (FEFF) guarantees 100% mojibake-free Japanese bookmarks
    let hex = 'FEFF';
    const text = String(str ?? '');
    for (let i = 0; i < text.length; i++) {
      hex += text.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
    }
    return PDFLib.PDFHexString.of(hex);
  }

  /**
   * Embed hierarchical PDF bookmarks (/Outlines) into an existing PDF Uint8Array / ArrayBuffer.
   * outlineNodes: [{ text, pageNumber (1-based), children: [...] }, ...]
   */
  async function embedOutlinesIntoPdf(pdfBytes, outlineNodes, metaOptions) {
    if (!PDFLib || !PDFLib.PDFDocument) {
      throw new Error('pdf-lib が読み込まれていません');
    }
    const opts = Object.assign({ title: '', author: '', openPanelOnStart: true }, metaOptions || {});
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const pageCount = pages.length;

    if (opts.title) pdfDoc.setTitle(opts.title);
    if (opts.author) pdfDoc.setAuthor(opts.author);
    pdfDoc.setCreator('Md2Pdf');

    if (!outlineNodes || outlineNodes.length === 0 || pageCount === 0) {
      return await pdfDoc.save();
    }

    const ctx = pdfDoc.context;
    const { PDFName, PDFDict, PDFArray, PDFNumber, PDFNull } = PDFLib;

    const outlinesDict = PDFDict.withContext(ctx);
    const outlinesRef = ctx.register(outlinesDict);

    function buildLevel(nodes, parentRef) {
      const refs = [];
      const dicts = [];
      let totalCount = 0;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const dict = PDFDict.withContext(ctx);
        const ref = ctx.register(dict);
        refs.push(ref);
        dicts.push(dict);
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const dict = dicts[i];
        const ref = refs[i];

        const clampedIdx = Math.max(0, Math.min(pageCount - 1, (Number(node.pageNumber) || 1) - 1));
        const pageRef = pages[clampedIdx].ref;

        const dest = PDFArray.withContext(ctx);
        dest.push(pageRef);
        dest.push(PDFName.of('XYZ'));
        dest.push(PDFNull);
        dest.push(PDFNull);
        dest.push(PDFNull);

        dict.set(PDFName.of('Title'), encodePdfUtf16Hex(node.text || 'Section'));
        dict.set(PDFName.of('Parent'), parentRef);
        dict.set(PDFName.of('Dest'), dest);

        if (i > 0) dict.set(PDFName.of('Prev'), refs[i - 1]);
        if (i < nodes.length - 1) dict.set(PDFName.of('Next'), refs[i + 1]);

        totalCount++;

        if (node.children && node.children.length > 0) {
          const childInfo = buildLevel(node.children, ref);
          dict.set(PDFName.of('First'), childInfo.first);
          dict.set(PDFName.of('Last'), childInfo.last);
          dict.set(PDFName.of('Count'), PDFNumber.of(childInfo.count));
          totalCount += childInfo.count;
        }
      }

      return {
        first: refs[0],
        last: refs[refs.length - 1],
        count: totalCount,
      };
    }

    const rootInfo = buildLevel(outlineNodes, outlinesRef);
    outlinesDict.set(PDFName.of('Type'), PDFName.of('Outlines'));
    outlinesDict.set(PDFName.of('First'), rootInfo.first);
    outlinesDict.set(PDFName.of('Last'), rootInfo.last);
    outlinesDict.set(PDFName.of('Count'), PDFNumber.of(rootInfo.count));

    pdfDoc.catalog.set(PDFName.of('Outlines'), outlinesRef);
    if (opts.openPanelOnStart) {
      pdfDoc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
    }

    return await pdfDoc.save();
  }

  return {
    buildDocumentPayload,
    buildPagedCoreCss,
    buildVisualCss,
    buildPagedCss,
    getVisualRootAttrs,
    resolvePaperDimensions,
    embedOutlinesIntoPdf,
    encodePdfUtf16Hex,
    normalizeHex,
  };
}));
