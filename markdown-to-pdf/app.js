'use strict';

(function () {
  const Presets = window.Md2PdfPresets;
  const Parser = window.Md2PdfParser;
  const Builder = window.Md2PdfBuilder;

  const STORAGE_KEY_CONFIG = 'md2pdf_tool_config_v1';
  const STORAGE_KEY_MARKDOWN = 'md2pdf_tool_markdown_v1';

  // ============================================================
  // STATE
  // ============================================================
  let config = loadSavedConfig();
  let currentMarkdown = loadSavedMarkdown();
  let loadedFileBaseName = '';
  let currentZoom = 'fit';
  let previewReady = false;
  let renderTimer = null;
  let latestPayload = null;
  let latestLayoutInfo = null; // { totalPages, headingPages, coverPage, tocPage }

  function loadSavedConfig() {
    const def = Presets.createDefaultConfig();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (!raw) return def;
      return Presets.deepMergeConfig(def, JSON.parse(raw));
    } catch (e) {
      return def;
    }
  }

  function saveConfig() {
    try { localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config)); } catch (e) {}
  }

  function loadSavedMarkdown() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MARKDOWN);
      if (saved !== null) return saved;
    } catch (e) {}
    return Presets.SAMPLE_MARKDOWN;
  }

  function saveMarkdown() {
    try { localStorage.setItem(STORAGE_KEY_MARKDOWN, currentMarkdown); } catch (e) {}
  }

  // ============================================================
  // DOM REFERENCES
  // ============================================================
  const $ = (id) => document.getElementById(id);

  const mdInput = $('md-input');
  const previewFrame = $('preview-frame');
  const pageStatusPill = $('page-status-pill');
  const progressBarWrap = $('progress-bar-wrap');
  const progressBarFill = $('progress-bar-fill');
  const renderSpinner = $('render-spinner');
  const spinnerText = $('spinner-text');
  const spinnerPct = $('spinner-pct');
  const spinnerFill = $('spinner-fill');
  const editorPane = $('editor-pane');
  const settingsPane = $('settings-pane');
  const btnToggleEditor = $('btn-toggle-editor');
  const btnToggleSettings = $('btn-toggle-settings');
  const btnLoadFile = $('btn-load-file');
  const fileInput = $('file-input');
  const btnLoadSample = $('btn-load-sample');
  const btnOpenOutlineTab = $('btn-open-outline-tab');
  const btnPrintPdf = $('btn-print-pdf');
  const btnInsertPagebreak = $('btn-insert-pagebreak');
  const btnClearEditor = $('btn-clear-editor');
  const loadedFileBadge = $('loaded-file-badge');
  const statChars = $('stat-chars');
  const statHeadings = $('stat-headings');
  const btnRerender = $('btn-rerender');
  const btnPreviewLight = $('btn-preview-light');
  const btnPreviewDark = $('btn-preview-dark');
  const printTipBar = $('print-tip-bar');
  const btnCloseTip = $('btn-close-tip');
  const globalDropOverlay = $('global-drop-overlay');
  const toastEl = $('toast');

  const presetGrid = $('preset-grid');
  const calloutColorsGrid = $('callout-colors-grid');
  const pdfDropZone = $('pdf-drop-zone');
  const pdfFileInput = $('pdf-file-input');
  const outlinePreviewList = $('outline-preview-list');

  // ============================================================
  // TOAST
  // ============================================================
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.classList.remove('is-visible'); }, 2600);
  }

  // ============================================================
  // BUILD DYNAMIC CONTROLS (PRESETS & CALLOUT COLORS)
  // ============================================================
  function buildPresetCards() {
    presetGrid.innerHTML = '';
    Presets.THEME_PRESETS.forEach((preset) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-card';
      btn.dataset.presetId = preset.id;
      btn.innerHTML =
        `<span class="preset-swatch" aria-hidden="true">` +
        preset.swatch.map((c) => `<span style="background:${c}"></span>`).join('') +
        `</span>` +
        `<span class="preset-info">` +
        `<span class="preset-name">${Parser.escapeHtml(preset.name)}</span>` +
        `<span class="preset-desc">${Parser.escapeHtml(preset.desc)}</span>` +
        `</span>`;

      btn.addEventListener('click', () => {
        config = Presets.deepMergeConfig(config, preset.apply);
        config.presetId = preset.id;
        saveConfig();
        syncUiFromConfig();
        scheduleRender(80);
        showToast(`プリセット「${preset.name}」を適用しました`);
      });

      presetGrid.appendChild(btn);
    });
  }

  function buildCalloutColorPickers() {
    calloutColorsGrid.innerHTML = '';
    Presets.CALLOUT_TYPES.forEach((ct) => {
      const wrap = document.createElement('label');
      wrap.className = 'callout-color-item';
      wrap.innerHTML =
        `<span>${Parser.escapeHtml(ct.label)}</span>` +
        `<input type="color" data-callout-color="${ct.id}" value="${ct.defaultColor}">`;

      const inp = wrap.querySelector('input');
      inp.addEventListener('input', () => {
        config.callout.colors[ct.id] = inp.value;
        config.presetId = 'custom';
        saveConfig();
        updatePresetHighlight();
        updateVisualStylesInstant();
      });
      calloutColorsGrid.appendChild(wrap);
    });
  }

  function updatePresetHighlight() {
    presetGrid.querySelectorAll('.preset-card').forEach((card) => {
      card.classList.toggle('is-active', card.dataset.presetId === config.presetId);
    });
  }

  function syncColorInputs() {
    const mode = config.themeMode === 'dark' ? 'dark' : 'light';
    const pal = config.colors[mode];
    Object.keys(pal).forEach((key) => {
      const col = $(`col-${key}`);
      const hex = $(`hex-${key}`);
      const val = Builder.normalizeHex(pal[key], '#000000');
      if (col) col.value = val;
      if (hex) hex.value = val;
    });
    document.querySelectorAll('.seg-btn[data-color-mode]').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.colorMode === mode);
    });
    btnPreviewLight.classList.toggle('is-active', mode === 'light');
    btnPreviewDark.classList.toggle('is-active', mode === 'dark');
  }

  function syncUiFromConfig() {
    updatePresetHighlight();
    syncColorInputs();

    // Page & Pagination
    $('sel-paper-size').value = config.page.size;
    $('sel-orientation').value = config.page.orientation;
    $('sel-orientation').disabled = Boolean(Presets.PAPER_SIZES[config.page.size] && Presets.PAPER_SIZES[config.page.size].forceLandscape);
    $('sel-margin').value = config.page.margin;
    $('chk-break-h1').checked = Boolean(config.pagination.breakBeforeH1);
    $('chk-break-h2').checked = Boolean(config.pagination.breakBeforeH2);
    $('chk-keep-heading').checked = Boolean(config.pagination.keepHeadingWithNext);
    $('chk-avoid-blocks').checked = Boolean(config.pagination.avoidBreakBlocks);
    $('chk-avoid-paras').checked = Boolean(config.pagination.avoidBreakParagraphs);
    $('chk-show-pagenum').checked = Boolean(config.page.showPageNumber);
    $('chk-show-header').checked = Boolean(config.page.showHeader);
    $('chk-show-toc-back').checked = Boolean(config.page.showTocBackLink);

    // Cover & TOC
    $('chk-cover-enabled').checked = Boolean(config.cover.enabled);
    $('cover-fields').classList.toggle('is-disabled', !config.cover.enabled);
    $('sel-cover-style').value = config.cover.style;
    $('inp-cover-title').value = config.cover.title || '';
    $('inp-cover-subtitle').value = config.cover.subtitle || '';
    $('inp-cover-author').value = config.cover.author || '';
    $('inp-cover-meta').value = config.cover.meta || '';

    $('chk-toc-enabled').checked = Boolean(config.toc.enabled);
    $('toc-fields').classList.toggle('is-disabled', !config.toc.enabled);
    $('inp-toc-title').value = config.toc.title || '目次';
    $('sel-toc-depth').value = String(config.toc.maxDepth || 3);
    $('sel-toc-columns').value = config.toc.columns || '1';

    // Texture
    document.querySelectorAll('.texture-card[data-texture]').forEach((card) => {
      card.classList.toggle('is-active', card.dataset.texture === config.texture.type);
    });
    $('rng-tex-intensity').value = String(config.texture.intensity);
    $('val-tex-intensity').textContent = `${config.texture.intensity}%`;

    // Typography & Styles
    $('sel-body-font').value = config.typography.bodyFont;
    $('sel-heading-font').value = config.typography.headingFont;
    $('sel-font-size').value = config.typography.fontSize;
    $('rng-line-height').value = String(config.typography.lineHeight);
    $('val-line-height').textContent = Number(config.typography.lineHeight).toFixed(2);

    $('sel-h1-style').value = config.headings.h1Style;
    $('sel-h2-style').value = config.headings.h2Style;
    $('sel-h3-style').value = config.headings.h3Style;
    const hSpace = config.headings.topSpace !== undefined ? Number(config.headings.topSpace) : 1.0;
    $('rng-heading-space').value = String(hSpace);
    $('val-heading-space').textContent = `${hSpace.toFixed(1)}x`;

    $('sel-callout-style').value = config.callout.style;
    $('chk-expand-callouts').checked = Boolean(config.callout.expandFolded);
    calloutColorsGrid.querySelectorAll('input[data-callout-color]').forEach((inp) => {
      const id = inp.dataset.calloutColor;
      inp.value = Builder.normalizeHex(config.callout.colors[id], Presets.DEFAULT_CALLOUT_COLORS[id]);
    });

    $('sel-blockquote-style').value = config.elements.blockquoteStyle;
    $('sel-bold-style').value = config.elements.boldStyle;
    $('sel-hr-style').value = config.elements.hrStyle;
    $('sel-table-style').value = config.elements.tableStyle;

    // Outline & Output
    $('chk-outline-cover-toc').checked = Boolean(config.outline.includeCoverAndToc);
    $('chk-outline-open-panel').checked = Boolean(config.outline.openPanelOnStart);
    $('chk-breaks').checked = Boolean(config.output.breaks);
    $('chk-strip-comments').checked = Boolean(config.output.stripComments);
    $('chk-strip-frontmatter').checked = Boolean(config.output.stripFrontmatter);
    $('chk-webfonts').checked = Boolean(config.output.includeWebFonts);
  }

  // ============================================================
  // BUILD OUTLINE TREE WITH EXACT MEASURED PAGE NUMBERS
  // ============================================================
  function buildMeasuredOutlineNodes() {
    if (!latestPayload) return [];
    const pageMap = (latestLayoutInfo && latestLayoutInfo.headingPages) || {};

    function mapNodes(nodes) {
      return nodes.map((n) => ({
        id: n.id,
        text: n.text,
        level: n.level,
        pageNumber: pageMap[n.id] || 1,
        children: n.children && n.children.length > 0 ? mapNodes(n.children) : [],
      }));
    }

    const result = [];
    if (config.outline.includeCoverAndToc) {
      if (config.cover.enabled && latestLayoutInfo && latestLayoutInfo.coverPage) {
        result.push({
          text: `表紙：${latestPayload.title}`,
          pageNumber: latestLayoutInfo.coverPage,
          children: [],
        });
      }
      if (config.toc.enabled && latestLayoutInfo && latestLayoutInfo.tocPage) {
        result.push({
          text: (config.toc.title || '').trim() || '目次',
          pageNumber: latestLayoutInfo.tocPage,
          children: [],
        });
      }
    }

    const headingTree = mapNodes(latestPayload.parsed.fullOutlineTree || []);
    return result.concat(headingTree);
  }

  function renderOutlinePreviewList() {
    const nodes = buildMeasuredOutlineNodes();
    if (!nodes.length) {
      outlinePreviewList.innerHTML = '<p class="outline-empty">見出しがありません</p>';
      return;
    }

    const rows = [];
    function walk(list, depth) {
      list.forEach((node) => {
        const lv = Math.min(3, depth);
        rows.push(
          `<div class="outline-row outline-lv-${lv}">` +
          `<span class="outline-row-text" title="${Parser.escapeHtml(node.text)}">${Parser.escapeHtml(node.text)}</span>` +
          `<span class="outline-row-page">P.${node.pageNumber}</span>` +
          `</div>`
        );
        if (node.children && node.children.length > 0) walk(node.children, depth + 1);
      });
    }
    walk(nodes, 0);
    outlinePreviewList.innerHTML = rows.join('');
  }

  // ============================================================
  // PAGED.JS RENDERING PIPELINE (postMessage bridge + Progress Bar + Fast Visual Diff)
  // ============================================================
  let progressHideTimer = null;

  function postToPreview(msg) {
    if (!previewFrame || !previewFrame.contentWindow) return;
    try {
      previewFrame.contentWindow.postMessage(msg, '*');
    } catch (e) {}
  }

  function showProgress(percent, phaseText) {
    clearTimeout(progressHideTimer);
    const pct = Math.max(0, Math.min(100, Math.round(percent)));
    progressBarWrap.classList.remove('hidden');
    progressBarWrap.setAttribute('aria-valuenow', String(pct));
    progressBarFill.style.width = `${pct}%`;

    renderSpinner.classList.remove('hidden');
    spinnerText.textContent = phaseText || 'ページ組版中...';
    spinnerPct.textContent = `${pct}%`;
    spinnerFill.style.width = `${pct}%`;
  }

  function finishProgress() {
    progressBarFill.style.width = '100%';
    progressBarWrap.setAttribute('aria-valuenow', '100');
    spinnerFill.style.width = '100%';
    spinnerPct.textContent = '100%';
    clearTimeout(progressHideTimer);
    progressHideTimer = setTimeout(() => {
      progressBarWrap.classList.add('hidden');
      renderSpinner.classList.add('hidden');
      progressBarFill.style.width = '0%';
      spinnerFill.style.width = '0%';
    }, 240);
  }

  function estimatePageCount() {
    if (latestLayoutInfo && latestLayoutInfo.totalPages) {
      return latestLayoutInfo.totalPages;
    }
    const chars = currentMarkdown.length;
    const base = Math.max(1, Math.ceil(chars / 1100));
    return base + (config.cover.enabled ? 1 : 0) + (config.toc.enabled ? 1 : 0);
  }

  function executeRender() {
    if (!previewReady) return;

    latestPayload = Builder.buildDocumentPayload(currentMarkdown, config);
    statChars.textContent = `${currentMarkdown.length.toLocaleString()} 文字`;
    statHeadings.textContent = `見出し ${latestPayload.parsed.headings.length}`;

    pageStatusPill.textContent = `${latestPayload.dims.label} · 組版中...`;
    showProgress(6, 'ページ組版を開始中...');

    postToPreview({
      type: 'md2pdf:render',
      payload: {
        title: latestPayload.title,
        bodyHtml: latestPayload.bodyHtml,
        pagedCss: latestPayload.pagedCss,
        visualCss: latestPayload.visualCss,
        fontsUrl: latestPayload.fontsUrl,
        zoom: currentZoom,
        estimatedPages: estimatePageCount(),
      },
    });
  }

  // Instant visual-only update (colors, textures, callout colors, bold/hr/table styles) — 0ms re-pagination!
  function updateVisualStylesInstant() {
    if (!previewReady || !latestLayoutInfo) {
      scheduleRender(120);
      return;
    }
    const title = (latestPayload && latestPayload.title) || 'Document';
    postToPreview({
      type: 'md2pdf:update-visual',
      title,
      visualCss: Builder.buildVisualCss(config),
      rootAttrsObj: Builder.getVisualRootAttrs(config),
    });
  }

  function scheduleRender(delayMs) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(executeRender, delayMs !== undefined ? delayMs : 380);
  }

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'md2pdf:preview-ready') {
      if (!previewReady) {
        previewReady = true;
        executeRender();
      }
    } else if (msg.type === 'md2pdf:progress') {
      showProgress(msg.percent, msg.phase);
      if (latestPayload && msg.currentPage > 0) {
        pageStatusPill.textContent = `${latestPayload.dims.label} · ${msg.currentPage}P 組版中 (${msg.percent}%)`;
      }
    } else if (msg.type === 'md2pdf:rendered') {
      latestLayoutInfo = {
        totalPages: msg.totalPages,
        headingPages: msg.headingPages || {},
        coverPage: msg.coverPage,
        tocPage: msg.tocPage,
      };
      const sec = msg.elapsedMs ? ` (${(msg.elapsedMs / 1000).toFixed(1)}秒)` : '';
      const label = latestPayload ? latestPayload.dims.label : 'PDF';
      pageStatusPill.textContent = `${label} · 全 ${msg.totalPages} ページ${sec}`;
      renderOutlinePreviewList();
      finishProgress();
    } else if (msg.type === 'md2pdf:error') {
      pageStatusPill.textContent = '組版エラー';
      finishProgress();
      showToast('ページ組版中にエラーが発生しました: ' + (msg.message || ''));
    }
  });

  // Handshake in case iframe finished loading before listener registered
  previewFrame.addEventListener('load', () => {
    if (!previewReady) postToPreview({ type: 'md2pdf:ping' });
  });
  setTimeout(() => {
    if (!previewReady) postToPreview({ type: 'md2pdf:ping' });
  }, 300);

  window.addEventListener('resize', () => {
    if (currentZoom === 'fit' && previewReady) {
      postToPreview({ type: 'md2pdf:zoom', zoom: 'fit' });
    }
  });

  // ============================================================
  // PDF BOOKMARK / OUTLINE EMBEDDING (pdf-lib)
  // ============================================================
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

  async function processPdfForOutlineEmbed(file) {
    if (!file) return;
    if (!latestPayload || !latestLayoutInfo) {
      showToast('先にページプレビューの組版完了をお待ちください');
      return;
    }

    const outlineNodes = buildMeasuredOutlineNodes();
    if (!outlineNodes.length) {
      showToast('埋め込む見出し（しおり）がありません');
      return;
    }

    try {
      showToast('PDFにしおりを埋め込んでいます...');
      const buffer = await file.arrayBuffer();
      const outBytes = await Builder.embedOutlinesIntoPdf(buffer, outlineNodes, {
        title: latestPayload.title,
        author: latestPayload.author,
        openPanelOnStart: Boolean(config.outline.openPanelOnStart),
      });

      const base = file.name.replace(/\.pdf$/i, '');
      const outName = `${base}_outlined.pdf`;
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      triggerDownload(blob, outName);
      showToast(`しおり付きPDF「${outName}」を保存しました！`);
    } catch (err) {
      console.error('PDF outline embed error:', err);
      showToast('PDFの読み込みまたはしおり埋め込みに失敗しました');
    }
  }

  pdfDropZone.addEventListener('click', () => pdfFileInput.click());
  pdfDropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pdfFileInput.click(); }
  });
  pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) processPdfForOutlineEmbed(e.target.files[0]);
    e.target.value = '';
  });

  pdfDropZone.addEventListener('dragover', (e) => { e.preventDefault(); pdfDropZone.classList.add('drag-over'); });
  pdfDropZone.addEventListener('dragleave', () => { pdfDropZone.classList.remove('drag-over'); });
  pdfDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    pdfDropZone.classList.remove('drag-over');
    globalDropOverlay.classList.add('hidden');
    dragDepth = 0;
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) processPdfForOutlineEmbed(file);
  });

  // ============================================================
  // EDITOR & GLOBAL FILE HANDLING
  // ============================================================
  mdInput.addEventListener('input', () => {
    currentMarkdown = mdInput.value;
    saveMarkdown();
    scheduleRender(420);
  });

  mdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = mdInput.selectionStart;
      const en = mdInput.selectionEnd;
      mdInput.value = mdInput.value.slice(0, s) + '  ' + mdInput.value.slice(en);
      mdInput.selectionStart = mdInput.selectionEnd = s + 2;
      currentMarkdown = mdInput.value;
      saveMarkdown();
      scheduleRender(420);
    }
  });

  btnInsertPagebreak.addEventListener('click', () => {
    const s = mdInput.selectionStart;
    const en = mdInput.selectionEnd;
    const insert = '\n\\pagebreak\n';
    mdInput.value = mdInput.value.slice(0, s) + insert + mdInput.value.slice(en);
    mdInput.selectionStart = mdInput.selectionEnd = s + insert.length;
    mdInput.focus();
    currentMarkdown = mdInput.value;
    saveMarkdown();
    scheduleRender(120);
    showToast('手動改ページ (\\pagebreak) を挿入しました');
  });

  function loadMarkdownFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentMarkdown = String(reader.result || '');
      mdInput.value = currentMarkdown;
      loadedFileBaseName = file.name.replace(/\.(md|markdown|txt)$/i, '');
      loadedFileBadge.textContent = file.name;
      loadedFileBadge.classList.remove('hidden');
      saveMarkdown();
      scheduleRender(80);
      showToast(`「${file.name}」を読み込みました`);
    };
    reader.readAsText(file, 'utf-8');
  }

  btnLoadFile.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) loadMarkdownFile(e.target.files[0]);
    e.target.value = '';
  });

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
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      processPdfForOutlineEmbed(file);
    } else {
      loadMarkdownFile(file);
    }
  });

  btnLoadSample.addEventListener('click', () => {
    currentMarkdown = Presets.SAMPLE_MARKDOWN;
    mdInput.value = currentMarkdown;
    loadedFileBaseName = '';
    loadedFileBadge.classList.add('hidden');
    saveMarkdown();
    scheduleRender(80);
    showToast('サンプルMarkdownを読み込みました');
  });

  btnClearEditor.addEventListener('click', () => {
    currentMarkdown = '';
    mdInput.value = '';
    loadedFileBaseName = '';
    loadedFileBadge.classList.add('hidden');
    saveMarkdown();
    scheduleRender(80);
    mdInput.focus();
  });

  // ============================================================
  // HEADER & PREVIEW CONTROLS
  // ============================================================
  function activateTab(tabName) {
    if (settingsPane.classList.contains('is-hidden')) {
      settingsPane.classList.remove('is-hidden');
      btnToggleSettings.classList.add('is-active');
      btnToggleSettings.setAttribute('aria-pressed', 'true');
    }
    document.querySelectorAll('.settings-tabs .tab-btn').forEach((b) => {
      const active = b.dataset.tab === tabName;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.panel === tabName);
    });
  }

  btnOpenOutlineTab.addEventListener('click', () => activateTab('outline'));

  btnPrintPdf.addEventListener('click', () => {
    if (!previewReady) {
      showToast('プレビューの準備中です。少しお待ちください');
      return;
    }
    postToPreview({ type: 'md2pdf:print' });
  });

  btnToggleEditor.addEventListener('click', () => {
    const hidden = editorPane.classList.toggle('is-hidden');
    btnToggleEditor.classList.toggle('is-active', !hidden);
    btnToggleEditor.setAttribute('aria-pressed', hidden ? 'false' : 'true');
    setTimeout(() => {
      if (currentZoom === 'fit' && previewReady) postToPreview({ type: 'md2pdf:zoom', zoom: 'fit' });
    }, 60);
  });

  btnToggleSettings.addEventListener('click', () => {
    const hidden = settingsPane.classList.toggle('is-hidden');
    btnToggleSettings.classList.toggle('is-active', !hidden);
    btnToggleSettings.setAttribute('aria-pressed', hidden ? 'false' : 'true');
    setTimeout(() => {
      if (currentZoom === 'fit' && previewReady) postToPreview({ type: 'md2pdf:zoom', zoom: 'fit' });
    }, 60);
  });

  btnRerender.addEventListener('click', () => executeRender());
  btnCloseTip.addEventListener('click', () => printTipBar.classList.add('hidden'));

  document.querySelectorAll('.viewport-switch .vp-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentZoom = btn.dataset.zoom;
      document.querySelectorAll('.viewport-switch .vp-btn').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
      });
      if (previewReady) postToPreview({ type: 'md2pdf:zoom', zoom: currentZoom });
    });
  });

  function setThemeMode(mode) {
    config.themeMode = mode === 'dark' ? 'dark' : 'light';
    saveConfig();
    syncColorInputs();
    updateVisualStylesInstant();
  }
  btnPreviewLight.addEventListener('click', () => setThemeMode('light'));
  btnPreviewDark.addEventListener('click', () => setThemeMode('dark'));

  document.querySelectorAll('.settings-tabs .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  document.querySelectorAll('.seg-btn[data-color-mode]').forEach((btn) => {
    btn.addEventListener('click', () => setThemeMode(btn.dataset.colorMode));
  });

  // ============================================================
  // SETTINGS BINDINGS
  // ============================================================
  function bindChange(id, fn, delay) {
    $(id).addEventListener('change', (e) => {
      fn(e.target);
      saveConfig();
      scheduleRender(delay !== undefined ? delay : 150);
    });
  }
  function bindInput(id, fn, delay) {
    $(id).addEventListener('input', (e) => {
      fn(e.target);
      saveConfig();
      scheduleRender(delay !== undefined ? delay : 350);
    });
  }

  // Page & Pagination
  bindChange('sel-paper-size', (el) => {
    config.page.size = el.value;
    const spec = Presets.PAPER_SIZES[el.value];
    $('sel-orientation').disabled = Boolean(spec && spec.forceLandscape);
  }, 100);
  bindChange('sel-orientation', (el) => { config.page.orientation = el.value; }, 100);
  bindChange('sel-margin', (el) => { config.page.margin = el.value; }, 100);
  bindChange('chk-break-h1', (el) => { config.pagination.breakBeforeH1 = el.checked; }, 100);
  bindChange('chk-break-h2', (el) => { config.pagination.breakBeforeH2 = el.checked; }, 100);
  bindChange('chk-keep-heading', (el) => { config.pagination.keepHeadingWithNext = el.checked; }, 100);
  bindChange('chk-avoid-blocks', (el) => { config.pagination.avoidBreakBlocks = el.checked; }, 100);
  bindChange('chk-avoid-paras', (el) => { config.pagination.avoidBreakParagraphs = el.checked; }, 100);
  bindChange('chk-show-pagenum', (el) => { config.page.showPageNumber = el.checked; }, 100);
  bindChange('chk-show-header', (el) => { config.page.showHeader = el.checked; }, 100);
  bindChange('chk-show-toc-back', (el) => { config.page.showTocBackLink = el.checked; }, 100);

  // Cover & TOC
  bindChange('chk-cover-enabled', (el) => {
    config.cover.enabled = el.checked;
    $('cover-fields').classList.toggle('is-disabled', !el.checked);
  }, 100);
  bindChange('sel-cover-style', (el) => { config.cover.style = el.value; }, 100);
  bindInput('inp-cover-title', (el) => { config.cover.title = el.value; }, 350);
  bindInput('inp-cover-subtitle', (el) => { config.cover.subtitle = el.value; }, 350);
  bindInput('inp-cover-author', (el) => { config.cover.author = el.value; }, 350);
  bindInput('inp-cover-meta', (el) => { config.cover.meta = el.value; }, 350);

  bindChange('chk-toc-enabled', (el) => {
    config.toc.enabled = el.checked;
    $('toc-fields').classList.toggle('is-disabled', !el.checked);
  }, 100);
  bindInput('inp-toc-title', (el) => { config.toc.title = el.value; }, 350);
  bindChange('sel-toc-depth', (el) => { config.toc.maxDepth = parseInt(el.value, 10) || 3; }, 100);
  bindChange('sel-toc-columns', (el) => { config.toc.columns = el.value; }, 100);

  // Colors (instant visual update — zero re-pagination!)
  document.querySelectorAll('input[type="color"][data-color-key]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const key = inp.dataset.colorKey;
      const mode = config.themeMode === 'dark' ? 'dark' : 'light';
      config.colors[mode][key] = inp.value;
      config.presetId = 'custom';
      const hexInp = $(`hex-${key}`);
      if (hexInp) hexInp.value = inp.value;
      saveConfig();
      updatePresetHighlight();
      updateVisualStylesInstant();
    });
  });

  document.querySelectorAll('.hex-input[data-color-key]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const key = inp.dataset.colorKey;
      const mode = config.themeMode === 'dark' ? 'dark' : 'light';
      const norm = Builder.normalizeHex(inp.value, config.colors[mode][key]);
      inp.value = norm;
      config.colors[mode][key] = norm;
      config.presetId = 'custom';
      const colInp = $(`col-${key}`);
      if (colInp) colInp.value = norm;
      saveConfig();
      updatePresetHighlight();
      updateVisualStylesInstant();
    });
  });

  // Texture (instant visual update — zero re-pagination!)
  document.querySelectorAll('.texture-card[data-texture]').forEach((card) => {
    card.addEventListener('click', () => {
      config.texture.type = card.dataset.texture;
      config.presetId = 'custom';
      saveConfig();
      syncUiFromConfig();
      updateVisualStylesInstant();
    });
  });
  $('rng-tex-intensity').addEventListener('input', (e) => {
    config.texture.intensity = parseInt(e.target.value, 10);
    $('val-tex-intensity').textContent = `${config.texture.intensity}%`;
    saveConfig();
    updateVisualStylesInstant();
  });

  // Typography & Styles
  bindChange('sel-body-font', (el) => { config.typography.bodyFont = el.value; config.presetId = 'custom'; updatePresetHighlight(); }, 150);
  bindChange('sel-heading-font', (el) => { config.typography.headingFont = el.value; config.presetId = 'custom'; updatePresetHighlight(); }, 150);
  bindChange('sel-font-size', (el) => { config.typography.fontSize = el.value; }, 150);
  bindInput('rng-line-height', (el) => {
    config.typography.lineHeight = parseFloat(el.value);
    $('val-line-height').textContent = config.typography.lineHeight.toFixed(2);
  }, 320);

  bindChange('sel-h1-style', (el) => { config.headings.h1Style = el.value; config.presetId = 'custom'; updatePresetHighlight(); }, 120);
  bindChange('sel-h2-style', (el) => { config.headings.h2Style = el.value; config.presetId = 'custom'; updatePresetHighlight(); }, 120);
  bindChange('sel-h3-style', (el) => { config.headings.h3Style = el.value; config.presetId = 'custom'; updatePresetHighlight(); }, 120);
  bindInput('rng-heading-space', (el) => {
    config.headings.topSpace = parseFloat(el.value);
    $('val-heading-space').textContent = `${config.headings.topSpace.toFixed(1)}x`;
  }, 320);

  bindChange('sel-callout-style', (el) => { config.callout.style = el.value; }, 120);
  bindChange('chk-expand-callouts', (el) => { config.callout.expandFolded = el.checked; }, 120);
  $('btn-reset-callout-colors').addEventListener('click', () => {
    config.callout.colors = Object.assign({}, Presets.DEFAULT_CALLOUT_COLORS);
    saveConfig();
    syncUiFromConfig();
    updateVisualStylesInstant();
    showToast('コールアウトの色を標準に戻しました');
  });

  bindChange('sel-blockquote-style', (el) => { config.elements.blockquoteStyle = el.value; }, 120);
  bindChange('sel-bold-style', (el) => { config.elements.boldStyle = el.value; }, 120);
  bindChange('sel-hr-style', (el) => { config.elements.hrStyle = el.value; }, 120);
  bindChange('sel-table-style', (el) => { config.elements.tableStyle = el.value; }, 120);

  // Outline & Output options
  $('chk-outline-cover-toc').addEventListener('change', (e) => {
    config.outline.includeCoverAndToc = e.target.checked;
    saveConfig();
    renderOutlinePreviewList();
  });
  $('chk-outline-open-panel').addEventListener('change', (e) => {
    config.outline.openPanelOnStart = e.target.checked;
    saveConfig();
  });
  bindChange('chk-breaks', (el) => { config.output.breaks = el.checked; }, 120);
  bindChange('chk-strip-comments', (el) => { config.output.stripComments = el.checked; }, 120);
  bindChange('chk-strip-frontmatter', (el) => { config.output.stripFrontmatter = el.checked; }, 120);
  bindChange('chk-webfonts', (el) => { config.output.includeWebFonts = el.checked; }, 120);

  // Config Backup / Restore / Reset
  $('btn-export-config').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json;charset=utf-8' });
    triggerDownload(blob, 'md2pdf-settings.json');
    showToast('設定JSONを書き出しました');
  });
  $('btn-import-config').addEventListener('click', () => $('config-file-input').click());
  $('config-file-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        config = Presets.deepMergeConfig(Presets.createDefaultConfig(), JSON.parse(String(reader.result || '{}')));
        saveConfig();
        syncUiFromConfig();
        scheduleRender(100);
        showToast('設定を読み込みました');
      } catch (err) {
        showToast('設定JSONの読み込みに失敗しました');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  });

  $('btn-reset-all').addEventListener('click', () => {
    config = Presets.createDefaultConfig();
    saveConfig();
    syncUiFromConfig();
    scheduleRender(100);
    showToast('設定をデフォルトに戻しました');
  });

  // ============================================================
  // TOOL SWITCHER & MARKDOWN HANDOFF
  // ============================================================
  const HANDOFF_KEY = 'md2_handoff_payload_v1';
  const HANDOFF_PREF_KEY = 'md2_handoff_enabled_v1';

  function setupToolSwitcher() {
    const switcher = $('tool-switcher');
    const btn = $('btn-tool-switcher');
    const menu = $('tool-switcher-menu');
    const chkHandoff = $('chk-handoff-md');
    if (!switcher || !btn || !menu) return;

    if (chkHandoff) {
      try {
        const pref = localStorage.getItem(HANDOFF_PREF_KEY);
        if (pref !== null) chkHandoff.checked = pref === 'true';
      } catch (e) {}
      chkHandoff.addEventListener('change', () => {
        try { localStorage.setItem(HANDOFF_PREF_KEY, String(chkHandoff.checked)); } catch (e) {}
      });
    }

    function setOpen(open) {
      menu.classList.toggle('hidden', !open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(menu.classList.contains('hidden'));
    });
    document.addEventListener('click', (e) => {
      if (!switcher.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });

    menu.querySelectorAll('a[data-handoff-link]').forEach((link) => {
      link.addEventListener('click', () => {
        if (!chkHandoff || chkHandoff.checked) {
          try {
            localStorage.setItem(HANDOFF_KEY, JSON.stringify({
              markdown: currentMarkdown,
              fileName: loadedFileBaseName,
              ts: Date.now(),
            }));
          } catch (e) {}
        }
      });
    });
  }

  function consumeHandoffIfAny() {
    try {
      const raw = localStorage.getItem(HANDOFF_KEY);
      if (!raw) return false;
      localStorage.removeItem(HANDOFF_KEY);
      const data = JSON.parse(raw);
      if (data && typeof data.markdown === 'string' && (Date.now() - (data.ts || 0)) < 30000) {
        currentMarkdown = data.markdown;
        if (data.fileName) loadedFileBaseName = data.fileName;
        saveMarkdown();
        return true;
      }
    } catch (e) {}
    return false;
  }

  // ============================================================
  // INITIALIZE
  // ============================================================
  setupToolSwitcher();
  const receivedHandoff = consumeHandoffIfAny();
  buildPresetCards();
  buildCalloutColorPickers();
  mdInput.value = currentMarkdown;

  if (window.innerWidth <= 1160) {
    settingsPane.classList.add('is-hidden');
    btnToggleSettings.classList.remove('is-active');
    btnToggleSettings.setAttribute('aria-pressed', 'false');
  }

  syncUiFromConfig();
  if (receivedHandoff) showToast('前のツールからMarkdownを引き継ぎました');
})();
