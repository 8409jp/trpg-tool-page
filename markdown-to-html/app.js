'use strict';

(function () {
  const Presets = window.Md2HtmlPresets;
  const Parser = window.Md2HtmlParser;
  const Exporter = window.Md2HtmlExporter;

  const STORAGE_KEY_CONFIG = 'md2html_tool_config_v1';
  const STORAGE_KEY_MARKDOWN = 'md2html_tool_markdown_v1';

  // ============================================================
  // APPLICATION STATE
  // ============================================================
  let config = loadSavedConfig();
  let currentMarkdown = loadSavedMarkdown();
  let loadedFileBaseName = '';
  let activeColorMode = 'light'; // 'light' | 'dark'
  let previewTheme = resolveInitialPreviewTheme(config);
  let iframeReady = false;
  let lastLoadedFontsKey = '';
  let debounceTimer = null;

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
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {}
  }

  function loadSavedMarkdown() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MARKDOWN);
      if (saved !== null) return saved;
    } catch (e) {}
    return Presets.SAMPLE_MARKDOWN;
  }

  function saveMarkdown() {
    try {
      localStorage.setItem(STORAGE_KEY_MARKDOWN, currentMarkdown);
    } catch (e) {}
  }

  function resolveInitialPreviewTheme(cfg) {
    if (cfg.output.initialTheme === 'dark') return 'dark';
    if (cfg.output.initialTheme === 'light') return 'light';
    return 'light';
  }

  // ============================================================
  // DOM REFERENCES
  // ============================================================
  const $ = (id) => document.getElementById(id);

  const mdInput = $('md-input');
  const previewFrame = $('preview-frame');
  const previewStage = $('preview-stage');
  const editorPane = $('editor-pane');
  const settingsPane = $('settings-pane');
  const btnToggleEditor = $('btn-toggle-editor');
  const btnToggleSettings = $('btn-toggle-settings');
  const btnLoadFile = $('btn-load-file');
  const fileInput = $('file-input');
  const btnLoadSample = $('btn-load-sample');
  const btnOpenTab = $('btn-open-tab');
  const btnDownload = $('btn-download');
  const btnClearEditor = $('btn-clear-editor');
  const loadedFileBadge = $('loaded-file-badge');
  const statChars = $('stat-chars');
  const statHeadings = $('stat-headings');
  const btnPreviewLight = $('btn-preview-light');
  const btnPreviewDark = $('btn-preview-dark');
  const globalDropOverlay = $('global-drop-overlay');
  const toastEl = $('toast');

  // Settings elements
  const presetGrid = $('preset-grid');
  const calloutColorsGrid = $('callout-colors-grid');

  // ============================================================
  // TOAST HELPER
  // ============================================================
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 2200);
  }

  // ============================================================
  // BUILD DYNAMIC UI (PRESETS & CALLOUT COLOR PICKERS)
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
        if (preset.apply.output && preset.apply.output.initialTheme === 'dark') {
          setPreviewTheme('dark');
        } else if (preset.apply.output && preset.apply.output.initialTheme === 'light') {
          setPreviewTheme('light');
        }
        saveConfig();
        syncUiFromConfig();
        refreshPreviewStyles();
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
        updateActivePresetHighlight();
        refreshPreviewStyles();
      });

      calloutColorsGrid.appendChild(wrap);
    });
  }

  // ============================================================
  // SYNC UI CONTROLS FROM CONFIG
  // ============================================================
  function updateActivePresetHighlight() {
    presetGrid.querySelectorAll('.preset-card').forEach((card) => {
      card.classList.toggle('is-active', card.dataset.presetId === config.presetId);
    });
  }

  function syncColorInputs() {
    const palette = config.colors[activeColorMode];
    Object.keys(palette).forEach((key) => {
      const colInput = $(`col-${key}`);
      const hexInput = $(`hex-${key}`);
      const val = Exporter.normalizeHex(palette[key], '#000000');
      if (colInput) colInput.value = val;
      if (hexInput) hexInput.value = val;
    });

    document.querySelectorAll('.seg-btn[data-color-mode]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.colorMode === activeColorMode);
    });
  }

  function syncUiFromConfig() {
    updateActivePresetHighlight();
    syncColorInputs();

    // Typography
    $('sel-body-font').value = config.typography.bodyFont;
    $('sel-heading-font').value = config.typography.headingFont;
    $('sel-font-size').value = config.typography.fontSize;
    $('sel-content-width').value = config.typography.contentWidth;
    $('rng-line-height').value = String(config.typography.lineHeight);
    $('val-line-height').textContent = Number(config.typography.lineHeight).toFixed(2);

    // Headings
    $('sel-h1-style').value = config.headings.h1Style;
    $('sel-h2-style').value = config.headings.h2Style;
    $('sel-h3-style').value = config.headings.h3Style;
    const hSpace = config.headings.topSpace !== undefined ? Number(config.headings.topSpace) : 1.0;
    $('rng-heading-space').value = String(hSpace);
    $('val-heading-space').textContent = `${hSpace.toFixed(1)}x`;

    // Callout
    $('sel-callout-style').value = config.callout.style;
    calloutColorsGrid.querySelectorAll('input[data-callout-color]').forEach((inp) => {
      const id = inp.dataset.calloutColor;
      inp.value = Exporter.normalizeHex(config.callout.colors[id], Presets.DEFAULT_CALLOUT_COLORS[id]);
    });

    // Other elements
    $('sel-blockquote-style').value = config.elements.blockquoteStyle;
    $('sel-bold-style').value = config.elements.boldStyle;
    $('sel-hr-style').value = config.elements.hrStyle;
    $('sel-table-style').value = config.elements.tableStyle;
    $('sel-code-wrap').value = config.elements.codeWrap || 'wrap';

    // Texture
    document.querySelectorAll('.texture-card[data-texture]').forEach((card) => {
      card.classList.toggle('is-active', card.dataset.texture === config.texture.type);
    });
    $('rng-tex-intensity').value = String(config.texture.intensity);
    $('val-tex-intensity').textContent = `${config.texture.intensity}%`;
    document.querySelectorAll('input[name="cardStyle"]').forEach((radio) => {
      radio.checked = radio.value === config.texture.cardStyle;
    });

    // Output
    $('inp-doc-title').value = config.output.docTitle || '';
    $('inp-file-name').value = config.output.fileName || '';
    $('sel-initial-theme').value = config.output.initialTheme;
    $('sel-initial-sidebar').value = config.output.initialSidebar;
    $('chk-breaks').checked = Boolean(config.output.breaks);
    $('chk-strip-comments').checked = Boolean(config.output.stripComments);
    $('chk-strip-frontmatter').checked = Boolean(config.output.stripFrontmatter);
    $('chk-webfonts').checked = Boolean(config.output.includeWebFonts);
  }

  // ============================================================
  // PREVIEW RENDERING (Full & Fast Diff Updates)
  // ============================================================
  function getFontsKey(cfg) {
    return `${cfg.output.includeWebFonts}|${cfg.typography.bodyFont}|${cfg.typography.headingFont}`;
  }

  function updateStats(parsed) {
    statChars.textContent = `${currentMarkdown.length.toLocaleString()} 文字`;
    statHeadings.textContent = `見出し ${parsed.headings.length}`;
  }

  function renderPreviewFull() {
    iframeReady = false;
    lastLoadedFontsKey = getFontsKey(config);
    const result = Exporter.generateStandaloneHtml(currentMarkdown, config, {
      isPreview: true,
      forceTheme: previewTheme,
    });
    updateStats(result.parsed);
    previewFrame.srcdoc = result.html;
  }

  function refreshPreviewStyles() {
    const newFontsKey = getFontsKey(config);
    if (!iframeReady || newFontsKey !== lastLoadedFontsKey) {
      renderPreviewFull();
      return;
    }
    try {
      const doc = previewFrame.contentDocument;
      if (!doc || !doc.documentElement) {
        renderPreviewFull();
        return;
      }
      const themeStyle = doc.getElementById('md2html-theme');
      if (themeStyle) {
        themeStyle.textContent = Exporter.buildThemeVarsCss(config);
      }
      const attrs = Exporter.getStyleAttributes(config);
      Object.entries(attrs).forEach(([k, v]) => {
        doc.documentElement.setAttribute(k, v);
      });
      doc.documentElement.setAttribute('data-theme', previewTheme);
    } catch (e) {
      renderPreviewFull();
    }
  }

  function refreshPreviewContent() {
    const parsed = Parser.parseMarkdown(currentMarkdown, {
      breaks: config.output.breaks,
      stripComments: config.output.stripComments,
      stripFrontmatter: config.output.stripFrontmatter,
    });
    updateStats(parsed);

    if (!iframeReady) {
      renderPreviewFull();
      return;
    }

    try {
      const doc = previewFrame.contentDocument;
      const contentEl = doc && doc.getElementById('doc-content');
      const tocEl = doc && doc.getElementById('toc-nav');
      const titleEl = doc && doc.getElementById('topbar-title');
      if (!contentEl || !tocEl) {
        renderPreviewFull();
        return;
      }
      const title = (config.output.docTitle || '').trim() || parsed.inferredTitle || 'Document';
      contentEl.innerHTML = parsed.html;
      tocEl.innerHTML = parsed.tocHtml;
      if (titleEl) titleEl.textContent = title;
      doc.title = title;

      if (previewFrame.contentWindow && typeof previewFrame.contentWindow.__md2htmlUpdateSpy === 'function') {
        previewFrame.contentWindow.__md2htmlUpdateSpy();
      }
    } catch (e) {
      renderPreviewFull();
    }
  }

  function setPreviewTheme(mode) {
    previewTheme = mode === 'dark' ? 'dark' : 'light';
    btnPreviewLight.classList.toggle('is-active', previewTheme === 'light');
    btnPreviewDark.classList.toggle('is-active', previewTheme === 'dark');
    if (iframeReady) {
      try {
        const doc = previewFrame.contentDocument;
        if (doc && doc.documentElement) {
          doc.documentElement.setAttribute('data-theme', previewTheme);
        }
      } catch (e) {}
    }
  }

  previewFrame.addEventListener('load', () => {
    iframeReady = true;
    setPreviewTheme(previewTheme);
  });

  // Listen for theme toggles clicked inside preview iframe
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'md2html:preview-theme') {
      previewTheme = e.data.theme === 'dark' ? 'dark' : 'light';
      btnPreviewLight.classList.toggle('is-active', previewTheme === 'light');
      btnPreviewDark.classList.toggle('is-active', previewTheme === 'dark');
      activeColorMode = previewTheme;
      syncColorInputs();
    }
  });

  // ============================================================
  // EVENT BINDINGS — EDITOR & FILES
  // ============================================================
  mdInput.addEventListener('input', () => {
    currentMarkdown = mdInput.value;
    saveMarkdown();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refreshPreviewContent, 160);
  });

  // Allow Tab key to insert 2 spaces in Markdown editor
  mdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = mdInput.selectionStart;
      const end = mdInput.selectionEnd;
      mdInput.value = mdInput.value.slice(0, start) + '  ' + mdInput.value.slice(end);
      mdInput.selectionStart = mdInput.selectionEnd = start + 2;
      currentMarkdown = mdInput.value;
      saveMarkdown();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refreshPreviewContent, 160);
    }
  });

  function loadFileObject(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentMarkdown = String(reader.result || '');
      mdInput.value = currentMarkdown;
      loadedFileBaseName = file.name.replace(/\.(md|markdown|txt)$/i, '');
      loadedFileBadge.textContent = file.name;
      loadedFileBadge.classList.remove('hidden');
      saveMarkdown();
      refreshPreviewContent();
      showToast(`「${file.name}」を読み込みました`);
    };
    reader.readAsText(file, 'utf-8');
  }

  btnLoadFile.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      loadFileObject(fileInput.files[0]);
      fileInput.value = '';
    }
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
      loadFileObject(e.dataTransfer.files[0]);
    }
  });

  btnLoadSample.addEventListener('click', () => {
    currentMarkdown = Presets.SAMPLE_MARKDOWN;
    mdInput.value = currentMarkdown;
    loadedFileBaseName = '';
    loadedFileBadge.classList.add('hidden');
    saveMarkdown();
    refreshPreviewContent();
    showToast('サンプルMarkdownを読み込みました');
  });

  btnClearEditor.addEventListener('click', () => {
    currentMarkdown = '';
    mdInput.value = '';
    loadedFileBaseName = '';
    loadedFileBadge.classList.add('hidden');
    saveMarkdown();
    refreshPreviewContent();
    mdInput.focus();
  });

  // ============================================================
  // EVENT BINDINGS — LAYOUT & PREVIEW TOOLBAR
  // ============================================================
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

  document.querySelectorAll('.viewport-switch .vp-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vp = btn.dataset.vp;
      previewStage.dataset.vp = vp;
      document.querySelectorAll('.viewport-switch .vp-btn').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
      });
    });
  });

  btnPreviewLight.addEventListener('click', () => {
    setPreviewTheme('light');
    activeColorMode = 'light';
    syncColorInputs();
  });
  btnPreviewDark.addEventListener('click', () => {
    setPreviewTheme('dark');
    activeColorMode = 'dark';
    syncColorInputs();
  });

  // ============================================================
  // EVENT BINDINGS — SETTINGS TABS & CONTROLS
  // ============================================================
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

  // Color mode segment (syncs with preview theme!)
  document.querySelectorAll('.seg-btn[data-color-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeColorMode = btn.dataset.colorMode;
      syncColorInputs();
      setPreviewTheme(activeColorMode);
    });
  });

  // Color pickers & hex inputs
  document.querySelectorAll('input[type="color"][data-color-key]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const key = inp.dataset.colorKey;
      config.colors[activeColorMode][key] = inp.value;
      config.presetId = 'custom';
      const hexInp = $(`hex-${key}`);
      if (hexInp) hexInp.value = inp.value;
      saveConfig();
      updateActivePresetHighlight();
      refreshPreviewStyles();
    });
  });

  document.querySelectorAll('.hex-input[data-color-key]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const key = inp.dataset.colorKey;
      const normalized = Exporter.normalizeHex(inp.value, config.colors[activeColorMode][key]);
      inp.value = normalized;
      config.colors[activeColorMode][key] = normalized;
      config.presetId = 'custom';
      const colInp = $(`col-${key}`);
      if (colInp) colInp.value = normalized;
      saveConfig();
      updateActivePresetHighlight();
      refreshPreviewStyles();
    });
  });

  // Helper to bind simple selects/inputs
  function bindStyleSelect(id, setter) {
    $(id).addEventListener('change', (e) => {
      setter(e.target.value);
      config.presetId = 'custom';
      saveConfig();
      updateActivePresetHighlight();
      refreshPreviewStyles();
    });
  }

  bindStyleSelect('sel-body-font', (v) => { config.typography.bodyFont = v; });
  bindStyleSelect('sel-heading-font', (v) => { config.typography.headingFont = v; });
  bindStyleSelect('sel-font-size', (v) => { config.typography.fontSize = v; });
  bindStyleSelect('sel-content-width', (v) => { config.typography.contentWidth = v; });
  bindStyleSelect('sel-h1-style', (v) => { config.headings.h1Style = v; });
  bindStyleSelect('sel-h2-style', (v) => { config.headings.h2Style = v; });
  bindStyleSelect('sel-h3-style', (v) => { config.headings.h3Style = v; });
  bindStyleSelect('sel-callout-style', (v) => { config.callout.style = v; });
  bindStyleSelect('sel-blockquote-style', (v) => { config.elements.blockquoteStyle = v; });
  bindStyleSelect('sel-bold-style', (v) => { config.elements.boldStyle = v; });
  bindStyleSelect('sel-hr-style', (v) => { config.elements.hrStyle = v; });
  bindStyleSelect('sel-table-style', (v) => { config.elements.tableStyle = v; });
  bindStyleSelect('sel-code-wrap', (v) => { config.elements.codeWrap = v; });

  $('rng-line-height').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    config.typography.lineHeight = val;
    $('val-line-height').textContent = val.toFixed(2);
    saveConfig();
    refreshPreviewStyles();
  });

  $('rng-heading-space').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    config.headings.topSpace = val;
    $('val-heading-space').textContent = `${val.toFixed(1)}x`;
    saveConfig();
    refreshPreviewStyles();
  });

  $('btn-reset-callout-colors').addEventListener('click', () => {
    config.callout.colors = Object.assign({}, Presets.DEFAULT_CALLOUT_COLORS);
    saveConfig();
    syncUiFromConfig();
    refreshPreviewStyles();
    showToast('コールアウトの色を標準に戻しました');
  });

  // Background texture controls
  document.querySelectorAll('.texture-card[data-texture]').forEach((card) => {
    card.addEventListener('click', () => {
      config.texture.type = card.dataset.texture;
      config.presetId = 'custom';
      saveConfig();
      syncUiFromConfig();
      refreshPreviewStyles();
    });
  });

  $('rng-tex-intensity').addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    config.texture.intensity = val;
    $('val-tex-intensity').textContent = `${val}%`;
    saveConfig();
    refreshPreviewStyles();
  });

  document.querySelectorAll('input[name="cardStyle"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      config.texture.cardStyle = radio.value;
      saveConfig();
      refreshPreviewStyles();
    });
  });

  // Output & Parser Options
  $('inp-doc-title').addEventListener('input', (e) => {
    config.output.docTitle = e.target.value;
    saveConfig();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refreshPreviewContent, 200);
  });

  $('inp-file-name').addEventListener('input', (e) => {
    config.output.fileName = e.target.value;
    saveConfig();
  });

  $('sel-initial-theme').addEventListener('change', (e) => {
    config.output.initialTheme = e.target.value;
    saveConfig();
    if (e.target.value === 'light' || e.target.value === 'dark') {
      setPreviewTheme(e.target.value);
    }
  });

  $('sel-initial-sidebar').addEventListener('change', (e) => {
    config.output.initialSidebar = e.target.value;
    saveConfig();
    renderPreviewFull();
  });

  $('chk-breaks').addEventListener('change', (e) => {
    config.output.breaks = e.target.checked;
    saveConfig();
    refreshPreviewContent();
  });

  $('chk-strip-comments').addEventListener('change', (e) => {
    config.output.stripComments = e.target.checked;
    saveConfig();
    refreshPreviewContent();
  });

  $('chk-strip-frontmatter').addEventListener('change', (e) => {
    config.output.stripFrontmatter = e.target.checked;
    saveConfig();
    refreshPreviewContent();
  });

  $('chk-webfonts').addEventListener('change', (e) => {
    config.output.includeWebFonts = e.target.checked;
    saveConfig();
    renderPreviewFull();
  });

  // Config backup / restore / reset
  $('btn-export-config').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json;charset=utf-8' });
    triggerDownload(blob, 'md2html-settings.json');
    showToast('設定JSONを書き出しました');
  });

  $('btn-import-config').addEventListener('click', () => $('config-file-input').click());
  $('config-file-input').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        config = Presets.deepMergeConfig(Presets.createDefaultConfig(), parsed);
        saveConfig();
        syncUiFromConfig();
        renderPreviewFull();
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
    setPreviewTheme('light');
    activeColorMode = 'light';
    syncUiFromConfig();
    renderPreviewFull();
    showToast('設定をデフォルトに戻しました');
  });

  // ============================================================
  // EXPORT / DOWNLOAD / OPEN IN NEW TAB
  // ============================================================
  function sanitizeFileName(name) {
    const cleaned = String(name || '')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\.html?$/i, '');
    return cleaned || 'document';
  }

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
    const out = Exporter.generateStandaloneHtml(currentMarkdown, config, { isPreview: false });
    const rawName = (config.output.fileName || '').trim() || loadedFileBaseName || out.title;
    const fileName = sanitizeFileName(rawName) + '.html';
    const blob = new Blob([out.html], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob, fileName);
    showToast(`「${fileName}」をダウンロードしました`);
  });

  btnOpenTab.addEventListener('click', () => {
    const out = Exporter.generateStandaloneHtml(currentMarkdown, config, { isPreview: false });
    const blob = new Blob([out.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
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
  // INITIALIZATION
  // ============================================================
  setupToolSwitcher();
  const receivedHandoff = consumeHandoffIfAny();
  buildPresetCards();
  buildCalloutColorPickers();
  mdInput.value = currentMarkdown;

  // Hide settings panel initially on narrow screens so preview stays visible
  if (window.innerWidth <= 1140) {
    settingsPane.classList.add('is-hidden');
    btnToggleSettings.classList.remove('is-active');
    btnToggleSettings.setAttribute('aria-pressed', 'false');
  }

  syncUiFromConfig();
  setPreviewTheme(previewTheme);
  renderPreviewFull();
  if (receivedHandoff) showToast('前のツールからMarkdownを引き継ぎました');
})();
