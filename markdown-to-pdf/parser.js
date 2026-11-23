'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('./vendor/markdown-it.min.js'),
      require('./presets.js')
    );
  } else {
    root.Md2PdfParser = factory(root.markdownit, root.Md2PdfPresets);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (markdownit, Presets) {

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ============================================================
  // 1. YAML FRONTMATTER EXTRACTOR (title, subtitle, author, date, version)
  // ============================================================
  function extractFrontmatter(src, shouldStrip) {
    const normalized = String(src || '').replace(/\r\n/g, '\n');
    const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    if (!match) {
      return { body: normalized, meta: {} };
    }
    const yaml = match[1];
    const meta = {};
    const fields = ['title', 'subtitle', 'author', 'date', 'version'];
    fields.forEach((key) => {
      const re = new RegExp('^' + key + '\\s*:\\s*(.+)$', 'm');
      const m = yaml.match(re);
      if (m) {
        meta[key] = m[1].trim().replace(/^["'](.*)["']$/, '$1').trim();
      }
    });
    const body = shouldStrip ? normalized.slice(match[0].length) : normalized;
    return { body, meta };
  }

  // ============================================================
  // 2. OBSIDIAN COMMENT STRIPPER (%% ... %%)
  // ============================================================
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

  // ============================================================
  // 3. MANUAL PAGE BREAK BLOCK RULE (\pagebreak / <!-- pagebreak --> / ===)
  // ============================================================
  const MANUAL_BREAK_RE = /^(?:\\pagebreak|<!--\s*pagebreak\s*-->|={3,})\s*$/i;

  function pageBreakPlugin(md) {
    md.block.ruler.before('hr', 'manual_page_break', function (state, startLine, endLine, silent) {
      const pos = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];
      const lineText = state.src.slice(pos, max).trim();
      if (!MANUAL_BREAK_RE.test(lineText)) return false;
      if (silent) return true;

      const token = state.push('manual_page_break', 'div', 0);
      token.block = true;
      token.map = [startLine, startLine + 1];
      state.line = startLine + 1;
      return true;
    });

    md.renderer.rules.manual_page_break = function () {
      return '<div class="pdf-page-break" aria-hidden="true"></div>\n';
    };
  }

  // ============================================================
  // 4. MARKDOWN-IT PLUGIN: ==HIGHLIGHT== (<mark>)
  // ============================================================
  function markPlugin(md) {
    function tokenize(state, silent) {
      const start = state.pos;
      const marker = state.src.charCodeAt(start);
      if (silent || marker !== 0x3D) return false;

      const scanned = state.scanDelims(state.pos, true);
      let len = scanned.length;
      if (len < 2) return false;

      if (len % 2) {
        const token = state.push('text', '', 0);
        token.content = '=';
        len--;
      }

      for (let i = 0; i < len; i += 2) {
        const token = state.push('text', '', 0);
        token.content = '==';
        if (!scanned.can_open && !scanned.can_close) continue;
        state.delimiters.push({
          marker: 0x3D, length: 0, token: state.tokens.length - 1,
          end: -1, open: scanned.can_open, close: scanned.can_close,
        });
      }

      state.pos += scanned.length;
      return true;
    }

    function postProcess(state, delimiters) {
      const loneMarkers = [];
      for (let i = 0; i < delimiters.length; i++) {
        const startDelim = delimiters[i];
        if (startDelim.marker !== 0x3D || startDelim.end === -1) continue;
        const endDelim = delimiters[startDelim.end];
        const tokenOpen = state.tokens[startDelim.token];
        tokenOpen.type = 'mark_open';
        tokenOpen.tag = 'mark';
        tokenOpen.nesting = 1;
        tokenOpen.markup = '==';
        tokenOpen.content = '';

        const tokenClose = state.tokens[endDelim.token];
        tokenClose.type = 'mark_close';
        tokenClose.tag = 'mark';
        tokenClose.nesting = -1;
        tokenClose.markup = '==';
        tokenClose.content = '';

        if (
          state.tokens[endDelim.token - 1] &&
          state.tokens[endDelim.token - 1].type === 'text' &&
          state.tokens[endDelim.token - 1].content === '='
        ) {
          loneMarkers.push(endDelim.token - 1);
        }
      }

      while (loneMarkers.length) {
        const i = loneMarkers.pop();
        let j = i + 1;
        while (j < state.tokens.length && state.tokens[j].type === 'mark_close') j++;
        j--;
        if (i !== j) {
          const token = state.tokens[j];
          state.tokens[j] = state.tokens[i];
          state.tokens[i] = token;
        }
      }
    }

    md.inline.ruler.before('emphasis', 'mark', tokenize);
    md.inline.ruler2.before('emphasis', 'mark', function (state) {
      const tokensMeta = state.tokens_meta;
      const max = (tokensMeta || []).length;
      postProcess(state, state.delimiters);
      for (let curr = 0; curr < max; curr++) {
        if (tokensMeta[curr] && tokensMeta[curr].delimiters) {
          postProcess(state, tokensMeta[curr].delimiters);
        }
      }
    });
  }

  // ============================================================
  // 5. OBSIDIAN CALLOUTS PLUGIN (PDF-friendly auto-expand option)
  // ============================================================
  const CALLOUT_HEADER_RE = /^\[!([a-zA-Z0-9_-]+)\]([+-])?(?:[ \t]+([^\n]*))?(?:\n([\s\S]*))?$/;

  function obsidianCalloutPlugin(md, expandFolded) {
    md.core.ruler.before('inline', 'obsidian_callouts', function (state) {
      const Token = state.Token;

      function transformTokens(tokens) {
        const result = [];
        let i = 0;
        while (i < tokens.length) {
          const tok = tokens[i];
          if (tok.type !== 'blockquote_open') {
            result.push(tok);
            i++;
            continue;
          }

          let depth = 1;
          let closeIdx = -1;
          for (let j = i + 1; j < tokens.length; j++) {
            if (tokens[j].type === 'blockquote_open') depth++;
            else if (tokens[j].type === 'blockquote_close') {
              depth--;
              if (depth === 0) { closeIdx = j; break; }
            }
          }
          if (closeIdx === -1) { result.push(tok); i++; continue; }

          const inner = tokens.slice(i + 1, closeIdx);
          let headerMatch = null;
          if (
            inner.length >= 3 &&
            inner[0].type === 'paragraph_open' &&
            inner[1].type === 'inline' &&
            inner[2].type === 'paragraph_close'
          ) {
            headerMatch = inner[1].content.match(CALLOUT_HEADER_RE);
          }

          if (!headerMatch) {
            result.push(tok);
            const transformedInner = transformTokens(inner);
            for (let k = 0; k < transformedInner.length; k++) result.push(transformedInner[k]);
            result.push(tokens[closeIdx]);
            i = closeIdx + 1;
            continue;
          }

          const rawType = headerMatch[1];
          const fold = headerMatch[2] || '';
          const customTitle = (headerMatch[3] || '').trim();
          const restFirstPara = headerMatch[4] !== undefined ? headerMatch[4] : '';
          const canonicalType = Presets.resolveCalloutType(rawType);
          const defaultTitle = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
          const titleText = customTitle || defaultTitle;

          const bodyTokens = [];
          if (restFirstPara.trim().length > 0) {
            const pOpen = new Token('paragraph_open', 'p', 1);
            const pInline = new Token('inline', '', 0);
            pInline.content = restFirstPara;
            pInline.children = [];
            const pClose = new Token('paragraph_close', 'p', -1);
            bodyTokens.push(pOpen, pInline, pClose);
          }
          for (let k = 3; k < inner.length; k++) bodyTokens.push(inner[k]);

          const transformedBody = transformTokens(bodyTokens);
          const hasBody = transformedBody.length > 0;
          const isCollapsedInPdf = fold === '-' && !expandFolded;

          const openTok = new Token('callout_open', 'div', 1);
          openTok.block = true;
          openTok.meta = {
            rawType: rawType.toLowerCase(),
            canonicalType,
            hasBody: hasBody && !isCollapsedInPdf,
            fold,
          };

          const titleOpenTok = new Token('callout_title_open', 'div', 1);
          titleOpenTok.meta = { canonicalType };

          const titleInlineTok = new Token('inline', '', 0);
          titleInlineTok.content = titleText;
          titleInlineTok.children = [];

          const titleCloseTok = new Token('callout_title_close', 'div', -1);

          result.push(openTok, titleOpenTok, titleInlineTok, titleCloseTok);

          if (hasBody && !isCollapsedInPdf) {
            const bodyOpenTok = new Token('callout_body_open', 'div', 1);
            bodyOpenTok.block = true;
            const bodyCloseTok = new Token('callout_body_close', 'div', -1);
            bodyCloseTok.block = true;
            result.push(bodyOpenTok);
            for (let k = 0; k < transformedBody.length; k++) result.push(transformedBody[k]);
            result.push(bodyCloseTok);
          }

          const closeTok = new Token('callout_close', 'div', -1);
          closeTok.block = true;
          result.push(closeTok);
          i = closeIdx + 1;
        }
        return result;
      }

      state.tokens = transformTokens(state.tokens);
    });

    md.renderer.rules.callout_open = function (tokens, idx) {
      const m = tokens[idx].meta;
      const classes = ['callout'];
      if (!m.hasBody) classes.push('is-title-only');
      return `<div class="${classes.join(' ')}" data-callout="${escapeHtml(m.canonicalType)}" data-callout-raw="${escapeHtml(m.rawType)}">\n`;
    };
    md.renderer.rules.callout_title_open = function (tokens, idx) {
      const m = tokens[idx].meta;
      const icon = Presets.getCalloutIcon(m.canonicalType);
      return `<div class="callout-title"><span class="callout-icon" aria-hidden="true">${icon}</span><span class="callout-title-inner">`;
    };
    md.renderer.rules.callout_title_close = function () {
      return `</span></div>\n`;
    };
    md.renderer.rules.callout_body_open = function () { return '<div class="callout-content">\n'; };
    md.renderer.rules.callout_body_close = function () { return '</div>\n'; };
    md.renderer.rules.callout_close = function () { return '</div>\n'; };
  }

  // ============================================================
  // 6. TASK LISTS (Print-clean styled checkbox symbol)
  // ============================================================
  function taskListPlugin(md) {
    md.core.ruler.after('inline', 'task_lists', function (state) {
      const tokens = state.tokens;
      for (let i = 2; i < tokens.length; i++) {
        if (
          tokens[i].type === 'inline' &&
          tokens[i - 1].type === 'paragraph_open' &&
          tokens[i - 2].type === 'list_item_open'
        ) {
          const children = tokens[i].children;
          if (!children || children.length === 0 || children[0].type !== 'text') continue;
          const m = children[0].content.match(/^\[([ xX])\]\s+/);
          if (!m) continue;

          const checked = m[1].toLowerCase() === 'x';
          children[0].content = children[0].content.slice(m[0].length);
          tokens[i - 2].attrJoin('class', 'task-list-item');
          if (checked) tokens[i - 2].attrJoin('class', 'is-checked');

          const level = tokens[i - 2].level;
          for (let j = i - 3; j >= 0; j--) {
            if (tokens[j].level === level - 1 && (tokens[j].type === 'bullet_list_open' || tokens[j].type === 'ordered_list_open')) {
              tokens[j].attrJoin('class', 'task-list');
              break;
            }
          }

          const boxTok = new state.Token('task_box', '', 0);
          boxTok.meta = { checked };
          children.unshift(boxTok);
        }
      }
    });

    md.renderer.rules.task_box = function (tokens, idx) {
      const checked = tokens[idx].meta.checked;
      return `<span class="pdf-checkbox${checked ? ' is-checked' : ''}" aria-hidden="true">${checked ? '✓' : ''}</span>`;
    };
  }

  // ============================================================
  // 7. KEEP HEADING WITH NEXT PARAGRAPH (Prevents orphan headings!)
  // ============================================================
  function keepHeadingWithNextPlugin(md, enabled) {
    if (!enabled) return;
    md.core.ruler.after('heading_toc', 'keep_heading_group', function (state) {
      const tokens = state.tokens;
      const out = [];
      let i = 0;

      while (i < tokens.length) {
        const tok = tokens[i];
        // Only group top-level headings (level === 0) with an immediately following short paragraph
        if (tok.type === 'heading_open' && tok.level === 0) {
          const hLevel = parseInt(tok.tag.slice(1), 10) || 1;
          const hCloseIdx = i + 2; // heading_open, inline, heading_close
          if (
            hLevel <= 4 &&
            hCloseIdx < tokens.length &&
            tokens[hCloseIdx].type === 'heading_close' &&
            hCloseIdx + 3 < tokens.length &&
            tokens[hCloseIdx + 1].type === 'paragraph_open' &&
            tokens[hCloseIdx + 2].type === 'inline' &&
            tokens[hCloseIdx + 3].type === 'paragraph_close'
          ) {
            const paraLen = (tokens[hCloseIdx + 2].content || '').length;
            // Only group if the paragraph is reasonably short (< 420 chars) so we never create giant unbreakable blocks
            if (paraLen > 0 && paraLen < 420) {
              const gOpen = new state.Token('keep_group_open', 'div', 1);
              gOpen.block = true;
              gOpen.meta = { hLevel };
              const gClose = new state.Token('keep_group_close', 'div', -1);
              gClose.block = true;

              out.push(gOpen);
              for (let k = i; k <= hCloseIdx + 3; k++) out.push(tokens[k]);
              out.push(gClose);
              i = hCloseIdx + 4;
              continue;
            }
          }
        }
        out.push(tok);
        i++;
      }

      state.tokens = out;
    });

    md.renderer.rules.keep_group_open = function (tokens, idx) {
      const hLevel = tokens[idx].meta.hLevel;
      return `<div class="keep-heading-group keep-h${hLevel}">\n`;
    };
    md.renderer.rules.keep_group_close = function () {
      return '</div>\n';
    };
  }

  // ============================================================
  // 8. HEADING ID & TOC TREE
  // ============================================================
  function slugifyHeading(text) {
    const cleaned = String(text || '')
      .trim()
      .toLowerCase()
      .replace(/[\s\u3000]+/g, '-')
      .replace(/[^\p{L}\p{N}_-]/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return cleaned || 'sec';
  }

  function extractPlainText(inlineToken) {
    if (!inlineToken || !inlineToken.children) {
      return (inlineToken && inlineToken.content) || '';
    }
    let out = '';
    for (let i = 0; i < inlineToken.children.length; i++) {
      const child = inlineToken.children[i];
      if (child.type === 'text' || child.type === 'code_inline') out += child.content;
      else if (child.type === 'image') out += extractPlainText(child);
      else if (child.type === 'softbreak' || child.type === 'hardbreak') out += ' ';
    }
    return out.trim();
  }

  function buildTocTree(headings, maxDepth) {
    const limit = maxDepth || 6;
    const filtered = headings.filter((h) => h.level <= limit);
    const root = { level: 0, children: [] };
    const stack = [root];
    for (let i = 0; i < filtered.length; i++) {
      const h = filtered[i];
      const node = { id: h.id, level: h.level, text: h.text, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].level >= node.level) {
        stack.pop();
      }
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    return root.children;
  }

  // ============================================================
  // 9. MAIN PARSE FUNCTION
  // ============================================================
  function parseMarkdown(rawMarkdown, options) {
    const opts = Object.assign(
      {
        breaks: true,
        stripComments: true,
        stripFrontmatter: true,
        expandFoldedCallouts: true,
        keepHeadingWithNext: true,
        showTocBackLink: false,
        tocEnabled: true,
        tocMaxDepth: 3,
      },
      options || {}
    );

    const fm = extractFrontmatter(rawMarkdown, opts.stripFrontmatter);
    let source = fm.body;
    if (opts.stripComments) {
      source = stripObsidianComments(source);
    }

    const headings = [];
    const usedIds = Object.create(null);

    const md = markdownit({
      html: false,
      linkify: true,
      typographer: false,
      breaks: Boolean(opts.breaks),
    });

    md.use(pageBreakPlugin);
    md.use(markPlugin);
    obsidianCalloutPlugin(md, Boolean(opts.expandFoldedCallouts));
    md.use(taskListPlugin);

    // Collect headings & assign ASCII-safe unique IDs (reliable in PDF internal links!)
    md.core.ruler.after('task_lists', 'heading_toc', function (state) {
      const tokens = state.tokens;
      let seq = 0;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === 'heading_open') {
          const level = parseInt(tokens[i].tag.slice(1), 10) || 1;
          const text = extractPlainText(tokens[i + 1]) || `見出し ${headings.length + 1}`;
          seq++;
          // ASCII-only ID guarantees 100% reliable PDF internal links across all PDF viewers!
          const id = `sec-${seq}`;
          usedIds[id] = true;
          tokens[i].attrSet('id', id);
          tokens[i].attrSet('data-heading-level', String(level));
          tokens[i].attrSet('data-heading-text', text);
          headings.push({ id, level, text, slug: slugifyHeading(text) });
        }
      }
    });

    keepHeadingWithNextPlugin(md, Boolean(opts.keepHeadingWithNext));

    // Optionally append subtle "↑ 目次" anchor inside H1/H2 when TOC page is enabled
    const defaultHeadingClose = md.renderer.rules.heading_close || function (tokens, idx, o, env, self) {
      return self.renderToken(tokens, idx, o);
    };
    md.renderer.rules.heading_close = function (tokens, idx, o, env, self) {
      const tag = tokens[idx].tag;
      if (opts.showTocBackLink && opts.tocEnabled && (tag === 'h1' || tag === 'h2')) {
        return `<a class="pdf-back-toc" href="#pdf-toc">↑ 目次</a>` + defaultHeadingClose(tokens, idx, o, env, self);
      }
      return defaultHeadingClose(tokens, idx, o, env, self);
    };

    // Table wrapper
    const defaultTableOpen = md.renderer.rules.table_open || function (tokens, idx, o, env, self) {
      return self.renderToken(tokens, idx, o);
    };
    const defaultTableClose = md.renderer.rules.table_close || function (tokens, idx, o, env, self) {
      return self.renderToken(tokens, idx, o);
    };
    md.renderer.rules.table_open = function (tokens, idx, o, env, self) {
      return '<div class="table-wrap">' + defaultTableOpen(tokens, idx, o, env, self);
    };
    md.renderer.rules.table_close = function (tokens, idx, o, env, self) {
      return defaultTableClose(tokens, idx, o, env, self) + '</div>';
    };

    // Code block wrapper (clean for PDF, no copy button clutter)
    md.renderer.rules.fence = function (tokens, idx) {
      const token = tokens[idx];
      const lang = (token.info || '').trim().split(/\s+/)[0] || '';
      const header = lang
        ? `<div class="code-block-header"><span class="code-lang">${escapeHtml(lang)}</span></div>`
        : '';
      return `<div class="code-block">${header}<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(token.content)}</code></pre></div>\n`;
    };

    const html = md.render(source);
    const tocTree = buildTocTree(headings, opts.tocMaxDepth);
    const fullOutlineTree = buildTocTree(headings, 6);
    const firstH1 = headings.find((h) => h.level === 1);
    const inferredTitle = fm.meta.title || (firstH1 ? firstH1.text : '');

    return {
      html,
      headings,
      tocTree,
      fullOutlineTree,
      frontmatter: fm.meta,
      inferredTitle,
    };
  }

  return {
    parseMarkdown,
    buildTocTree,
    escapeHtml,
  };
}));
