'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('./vendor/markdown-it.min.js'),
      require('./presets.js')
    );
  } else {
    root.Md2HtmlParser = factory(root.markdownit, root.Md2HtmlPresets);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (markdownit, Presets) {

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ============================================================
  // 1. YAML FRONTMATTER EXTRACTOR
  // ============================================================
  function extractFrontmatter(src, shouldStrip) {
    const normalized = String(src || '').replace(/\r\n/g, '\n');
    const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    if (!match) {
      return { body: normalized, title: '' };
    }
    const yaml = match[1];
    let title = '';
    const titleMatch = yaml.match(/^title\s*:\s*(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim().replace(/^["'](.*)["']$/, '$1').trim();
    }
    const body = shouldStrip ? normalized.slice(match[0].length) : normalized;
    return { body, title };
  }

  // ============================================================
  // 2. OBSIDIAN COMMENT STRIPPER (%% ... %%)
  //    Preserves fenced code blocks and inline code spans.
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

    // Protect inline code spans (`...`)
    const inlineCodes = [];
    text = text.replace(/(`+)([\s\S]*?)\1/g, (m) => {
      const idx = inlineCodes.length;
      inlineCodes.push(m);
      return `\u0000CODE_${idx}\u0000`;
    });

    // Remove Obsidian comments (%%...%%), and clean up lines that become entirely empty
    text = text.replace(/^[ \t]*%%[\s\S]*?%%[ \t]*\n?/gm, '');
    text = text.replace(/%%[\s\S]*?%%/g, '');

    // Restore inline code spans
    text = text.replace(/\u0000CODE_(\d+)\u0000/g, (_, idx) => inlineCodes[Number(idx)]);

    // Restore fenced blocks
    text = text.replace(/\u0000FENCE_(\d+)\u0000/g, (_, idx) => protectedBlocks[Number(idx)].join('\n'));

    return text;
  }

  // ============================================================
  // 3. MARKDOWN-IT PLUGIN: ==HIGHLIGHT== (<mark>)
  // ============================================================
  function markPlugin(md) {
    function tokenize(state, silent) {
      const start = state.pos;
      const marker = state.src.charCodeAt(start);
      if (silent || marker !== 0x3D /* = */) return false;

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
          marker: 0x3D,
          length: 0,
          token: state.tokens.length - 1,
          end: -1,
          open: scanned.can_open,
          close: scanned.can_close,
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
        while (j < state.tokens.length && state.tokens[j].type === 'mark_close') {
          j++;
        }
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
  // 3b. MARKDOWN-IT PLUGIN: SAFE <br> LINE BREAK (for tables & inline)
  // ============================================================
  function safeBrPlugin(md) {
    md.inline.ruler.before('html_inline', 'safe_br', function (state, silent) {
      const start = state.pos;
      if (state.src.charCodeAt(start) !== 0x3C /* < */) return false;
      const m = state.src.slice(start).match(/^<br\s*\/?>/i);
      if (!m) return false;
      if (silent) return true;

      state.push('hardbreak', 'br', 0);
      state.pos = start + m[0].length;
      return true;
    });
  }

  // ============================================================
  // 3c. MARKDOWN-IT PLUGIN: PRESERVE FULL-WIDTH SPACE (U+3000) INDENT
  //     Replaces JS .trim() in built-in paragraph rule with ASCII-only trim
  //     so Japanese full-width space indentation at paragraph starts is kept.
  // ============================================================
  function preserveIdeographicIndentPlugin(md) {
    md.block.ruler.at('paragraph', function paragraph(state, startLine, endLine) {
      const terminatorRules = state.md.block.ruler.getRules('paragraph');
      const oldParentType = state.parentType;
      let nextLine = startLine + 1;
      state.parentType = 'paragraph';

      for (; nextLine < endLine && !state.isEmpty(nextLine); nextLine++) {
        if (state.sCount[nextLine] - state.blkIndent > 3) continue;
        if (state.sCount[nextLine] < 0) continue;

        let terminate = false;
        for (let i = 0, l = terminatorRules.length; i < l; i++) {
          if (terminatorRules[i](state, nextLine, endLine, true)) {
            terminate = true;
            break;
          }
        }
        if (terminate) break;
      }

      const content = state
        .getLines(startLine, nextLine, state.blkIndent, false)
        .replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');

      state.line = nextLine;

      const tokenOpen = state.push('paragraph_open', 'p', 1);
      tokenOpen.map = [startLine, state.line];

      const tokenInline = state.push('inline', '', 0);
      tokenInline.content = content;
      tokenInline.map = [startLine, state.line];
      tokenInline.children = [];

      state.push('paragraph_close', 'p', -1);
      state.parentType = oldParentType;
      return true;
    });
  }

  // ============================================================
  // 4. MARKDOWN-IT PLUGIN: OBSIDIAN CALLOUTS
  //    Supports all 13 types + aliases + custom fallback,
  //    custom titles with inline markdown, + / - folding,
  //    title-only callouts, and arbitrarily nested callouts.
  // ============================================================
  const CALLOUT_HEADER_RE = /^\[!([a-zA-Z0-9_-]+)\]([+-])?(?:[ \t]+([^\n]*))?(?:\n([\s\S]*))?$/;

  function obsidianCalloutPlugin(md) {
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

          // Find matching blockquote_close
          let depth = 1;
          let closeIdx = -1;
          for (let j = i + 1; j < tokens.length; j++) {
            if (tokens[j].type === 'blockquote_open') depth++;
            else if (tokens[j].type === 'blockquote_close') {
              depth--;
              if (depth === 0) {
                closeIdx = j;
                break;
              }
            }
          }

          if (closeIdx === -1) {
            result.push(tok);
            i++;
            continue;
          }

          const inner = tokens.slice(i + 1, closeIdx);
          let isCallout = false;
          let headerMatch = null;

          if (
            inner.length >= 3 &&
            inner[0].type === 'paragraph_open' &&
            inner[1].type === 'inline' &&
            inner[2].type === 'paragraph_close'
          ) {
            headerMatch = inner[1].content.match(CALLOUT_HEADER_RE);
            if (headerMatch) {
              isCallout = true;
            }
          }

          if (!isCallout) {
            // Normal blockquote: still recursively transform nested blockquotes inside
            result.push(tok);
            const transformedInner = transformTokens(inner);
            for (let k = 0; k < transformedInner.length; k++) {
              result.push(transformedInner[k]);
            }
            result.push(tokens[closeIdx]);
            i = closeIdx + 1;
            continue;
          }

          const rawType = headerMatch[1];
          const fold = headerMatch[2] || ''; // '+' | '-' | ''
          const customTitle = (headerMatch[3] || '').trim();
          const restFirstPara = headerMatch[4] !== undefined ? headerMatch[4] : '';

          const canonicalType = Presets.resolveCalloutType(rawType);
          const defaultTitle = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
          const titleText = customTitle || defaultTitle;

          // Build body tokens (remainder of first paragraph + subsequent tokens)
          const bodyTokens = [];
          if (restFirstPara.trim().length > 0) {
            const pOpen = new Token('paragraph_open', 'p', 1);
            const pInline = new Token('inline', '', 0);
            pInline.content = restFirstPara;
            pInline.children = [];
            const pClose = new Token('paragraph_close', 'p', -1);
            bodyTokens.push(pOpen, pInline, pClose);
          }
          for (let k = 3; k < inner.length; k++) {
            bodyTokens.push(inner[k]);
          }

          const transformedBody = transformTokens(bodyTokens);
          const hasBody = transformedBody.length > 0;
          const isCollapsible = fold === '+' || fold === '-';
          const isOpen = fold === '+';

          const openTok = new Token('callout_open', isCollapsible ? 'details' : 'div', 1);
          openTok.block = true;
          openTok.meta = {
            rawType: rawType.toLowerCase(),
            canonicalType,
            fold,
            isCollapsible,
            isOpen,
            hasBody,
          };

          const titleOpenTok = new Token('callout_title_open', isCollapsible ? 'summary' : 'div', 1);
          titleOpenTok.meta = {
            canonicalType,
            isCollapsible,
          };

          const titleInlineTok = new Token('inline', '', 0);
          titleInlineTok.content = titleText;
          titleInlineTok.children = [];

          const titleCloseTok = new Token('callout_title_close', isCollapsible ? 'summary' : 'div', -1);
          titleCloseTok.meta = { isCollapsible };

          result.push(openTok, titleOpenTok, titleInlineTok, titleCloseTok);

          if (hasBody) {
            const bodyOpenTok = new Token('callout_body_open', 'div', 1);
            bodyOpenTok.block = true;
            const bodyCloseTok = new Token('callout_body_close', 'div', -1);
            bodyCloseTok.block = true;

            result.push(bodyOpenTok);
            for (let k = 0; k < transformedBody.length; k++) {
              result.push(transformedBody[k]);
            }
            result.push(bodyCloseTok);
          }

          const closeTok = new Token('callout_close', isCollapsible ? 'details' : 'div', -1);
          closeTok.block = true;
          result.push(closeTok);

          i = closeIdx + 1;
        }

        return result;
      }

      state.tokens = transformTokens(state.tokens);
    });

    const CHEVRON_SVG = '<svg class="callout-fold-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

    md.renderer.rules.callout_open = function (tokens, idx) {
      const m = tokens[idx].meta;
      const tag = m.isCollapsible ? 'details' : 'div';
      const classes = ['callout'];
      if (m.isCollapsible) classes.push('is-collapsible');
      if (!m.hasBody) classes.push('is-title-only');
      const openAttr = m.isCollapsible && m.isOpen ? ' open' : '';
      return `<${tag} class="${classes.join(' ')}" data-callout="${escapeHtml(m.canonicalType)}" data-callout-raw="${escapeHtml(m.rawType)}"${openAttr}>\n`;
    };

    md.renderer.rules.callout_title_open = function (tokens, idx) {
      const m = tokens[idx].meta;
      const tag = m.isCollapsible ? 'summary' : 'div';
      const icon = Presets.getCalloutIcon(m.canonicalType);
      return `<${tag} class="callout-title"><span class="callout-icon" aria-hidden="true">${icon}</span><span class="callout-title-inner">`;
    };

    md.renderer.rules.callout_title_close = function (tokens, idx) {
      const m = tokens[idx].meta;
      const tag = m.isCollapsible ? 'summary' : 'div';
      const chevron = m.isCollapsible ? `<span class="callout-fold">${CHEVRON_SVG}</span>` : '';
      return `</span>${chevron}</${tag}>\n`;
    };

    md.renderer.rules.callout_body_open = function () {
      return '<div class="callout-content">\n';
    };

    md.renderer.rules.callout_body_close = function () {
      return '</div>\n';
    };

    md.renderer.rules.callout_close = function (tokens, idx) {
      return `</${tokens[idx].tag}>\n`;
    };
  }

  // ============================================================
  // 5. MARKDOWN-IT PLUGIN: INTERACTIVE TASK LISTS (- [ ] / - [x])
  // ============================================================
  function taskListPlugin(md) {
    md.core.ruler.after('inline', 'task_lists', function (state) {
      const tokens = state.tokens;
      let taskCounter = 0;

      for (let i = 2; i < tokens.length; i++) {
        if (
          tokens[i].type === 'inline' &&
          tokens[i - 1].type === 'paragraph_open' &&
          tokens[i - 2].type === 'list_item_open'
        ) {
          const children = tokens[i].children;
          if (!children || children.length === 0) continue;
          const firstChild = children[0];
          if (firstChild.type !== 'text') continue;

          const m = firstChild.content.match(/^\[([ xX])\]\s+/);
          if (!m) continue;

          const checked = m[1].toLowerCase() === 'x';
          firstChild.content = firstChild.content.slice(m[0].length);

          // Mark list item and parent list
          tokens[i - 2].attrJoin('class', 'task-list-item');
          if (checked) {
            tokens[i - 2].attrJoin('class', 'is-checked');
          }

          // Walk backwards to find parent bullet_list_open / ordered_list_open
          let level = tokens[i - 2].level;
          for (let j = i - 3; j >= 0; j--) {
            if (tokens[j].level === level - 1 && (tokens[j].type === 'bullet_list_open' || tokens[j].type === 'ordered_list_open')) {
              tokens[j].attrJoin('class', 'task-list');
              break;
            }
          }

          const checkboxToken = new state.Token('task_checkbox', '', 0);
          const idx = taskCounter++;
          checkboxToken.meta = { idx, checked };
          children.unshift(checkboxToken);
        }
      }
    });

    md.renderer.rules.task_checkbox = function (tokens, idx) {
      const m = tokens[idx].meta;
      return `<input type="checkbox" class="task-list-checkbox" data-task-id="${m.idx}"${m.checked ? ' checked' : ''} aria-label="タスク切り替え">`;
    };
  }

  // ============================================================
  // 5b. MARKDOWN-IT PLUGIN: OBSIDIAN WIKILINK & SPACE-SAFE HEADING LINKS
  //     Supports [[#Heading]], [[#Heading|Alias]], [[#Parent#Child]],
  //     and [Label](#Heading with spaces)
  // ============================================================
  function headingLinkSyntaxPlugin(md) {
    // 1. Obsidian WikiLink for headings: [[#Heading]] / [[#Heading|Alias]]
    md.inline.ruler.before('link', 'obsidian_wikilink', function (state, silent) {
      const start = state.pos;
      if (state.src.charCodeAt(start) !== 0x5B /* [ */ || state.src.charCodeAt(start + 1) !== 0x5B) {
        return false;
      }
      const rest = state.src.slice(start);
      const m = rest.match(/^\[\[#([^\]|\n]+?)(?:\|([^\]\n]+))?\]\]/);
      if (!m) return false;
      if (silent) return true;

      const rawPath = m[1].trim();
      const segments = rawPath.split('#').map((s) => s.trim()).filter(Boolean);
      const targetKey = segments.length > 0 ? segments[segments.length - 1] : rawPath;
      const displayText = (m[2] || '').trim() || targetKey;

      const openTok = state.push('link_open', 'a', 1);
      openTok.attrSet('href', '#' + targetKey);
      openTok.attrJoin('class', 'obsidian-wikilink');
      openTok.meta = { rawHashTarget: targetKey };

      const textTok = state.push('text', '', 0);
      textTok.content = displayText;

      state.push('link_close', 'a', -1);
      state.pos = start + m[0].length;
      return true;
    });

    // 2. Fallback for standard-style [Label](#Heading with spaces) that CommonMark skips
    md.inline.ruler.after('link', 'hash_link_with_spaces', function (state, silent) {
      const start = state.pos;
      if (state.src.charCodeAt(start) !== 0x5B /* [ */) return false;
      const rest = state.src.slice(start);
      const m = rest.match(/^\[([^\]\n]+)\]\(#([^)\n]+)\)/);
      if (!m) return false;
      if (silent) return true;

      const label = m[1];
      const rawHash = m[2].trim();
      if (!rawHash) return false;

      const openTok = state.push('link_open', 'a', 1);
      openTok.attrSet('href', '#' + rawHash);
      openTok.meta = { rawHashTarget: rawHash };

      const textTok = state.push('text', '', 0);
      textTok.content = label;

      state.push('link_close', 'a', -1);
      state.pos = start + m[0].length;
      return true;
    });
  }

  // ============================================================
  // 6. HEADING ID & TOC TREE EXTRACTOR
  // ============================================================
  function slugifyHeading(text) {
    const cleaned = String(text || '')
      .trim()
      .toLowerCase()
      .replace(/[\s\u3000]+/g, '-')
      .replace(/[^\p{L}\p{N}_-]/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return cleaned || 'section';
  }

  function extractPlainTextFromInline(inlineToken) {
    if (!inlineToken || !inlineToken.children) {
      return (inlineToken && inlineToken.content) || '';
    }
    let out = '';
    for (let i = 0; i < inlineToken.children.length; i++) {
      const child = inlineToken.children[i];
      if (child.type === 'text' || child.type === 'code_inline') {
        out += child.content;
      } else if (child.type === 'image') {
        out += extractPlainTextFromInline(child);
      } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
        out += ' ';
      }
    }
    return out.trim();
  }

  function buildTocTree(headings) {
    const root = { level: 0, children: [] };
    const stack = [root];

    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      const node = {
        id: h.id,
        level: h.level,
        text: h.text,
        children: [],
      };

      while (stack.length > 1 && stack[stack.length - 1].level >= node.level) {
        stack.pop();
      }
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }

    return root.children;
  }

  function renderTocTreeHtml(nodes, depth) {
    if (!nodes || nodes.length === 0) return '';
    const d = depth || 0;
    const ulClass = d === 0 ? 'toc-list toc-root' : 'toc-list toc-children';
    const items = nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const toggleBtn = hasChildren
        ? `<button type="button" class="toc-toggle" aria-expanded="true" aria-label="サブ見出しを開閉"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>`
        : '<span class="toc-leaf-spacer" aria-hidden="true"></span>';

      const childrenHtml = hasChildren ? renderTocTreeHtml(node.children, d + 1) : '';
      return `<li class="toc-item toc-level-${node.level}${hasChildren ? ' has-children' : ''}" data-toc-id="${escapeHtml(node.id)}">` +
        `<div class="toc-row">${toggleBtn}<a class="toc-link" href="#${escapeHtml(node.id)}" data-target="${escapeHtml(node.id)}">${escapeHtml(node.text)}</a></div>` +
        childrenHtml +
        `</li>`;
    }).join('\n');

    return `<ul class="${ulClass}">\n${items}\n</ul>`;
  }

  // ============================================================
  // 7. MAIN PARSE FUNCTION
  // ============================================================
  function parseMarkdown(rawMarkdown, options) {
    const opts = Object.assign(
      {
        breaks: true,
        stripComments: true,
        stripFrontmatter: true,
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

    md.use(markPlugin);
    md.use(safeBrPlugin);
    md.use(preserveIdeographicIndentPlugin);
    md.use(headingLinkSyntaxPlugin);
    md.use(obsidianCalloutPlugin);
    md.use(taskListPlugin);

    // Collect headings & assign unique IDs
    md.core.ruler.after('task_lists', 'heading_toc', function (state) {
      const tokens = state.tokens;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === 'heading_open') {
          const level = parseInt(tokens[i].tag.slice(1), 10) || 1;
          const inlineTok = tokens[i + 1];
          const text = extractPlainTextFromInline(inlineTok) || `見出し ${headings.length + 1}`;
          const baseSlug = slugifyHeading(text);
          let id = baseSlug;
          if (usedIds[baseSlug]) {
            usedIds[baseSlug]++;
            id = `${baseSlug}-${usedIds[baseSlug]}`;
          } else {
            usedIds[baseSlug] = 1;
          }
          tokens[i].attrSet('id', id);
          headings.push({ id, level, text });
        }
      }
    });

    // Resolve internal heading links (#id, #Heading Text, [[#Heading]]) to exact heading IDs
    function resolveHeadingMatch(rawHash) {
      if (!rawHash || headings.length === 0) return null;
      let decoded = rawHash;
      try { decoded = decodeURIComponent(rawHash); } catch (e) {}
      const trimmed = decoded.trim();
      const lower = trimmed.toLowerCase();
      const slug = slugifyHeading(trimmed);

      // 1. Exact ID match
      for (let i = 0; i < headings.length; i++) {
        if (headings[i].id === trimmed || headings[i].id === lower) return headings[i];
      }
      // 2. Exact heading text match (case-insensitive)
      for (let i = 0; i < headings.length; i++) {
        if (headings[i].text.trim().toLowerCase() === lower) return headings[i];
      }
      // 3. Slug match
      for (let i = 0; i < headings.length; i++) {
        if (headings[i].id === slug || slugifyHeading(headings[i].text) === slug) return headings[i];
      }
      return null;
    }

    md.core.ruler.after('heading_toc', 'resolve_heading_links', function (state) {
      const tokens = state.tokens;
      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        if (tok.type !== 'inline' || !tok.children) continue;
        for (let j = 0; j < tok.children.length; j++) {
          const child = tok.children[j];
          if (child.type !== 'link_open') continue;
          const href = child.attrGet('href') || '';
          if (!href.startsWith('#') || href.length <= 1) continue;
          const rawTarget = (child.meta && child.meta.rawHashTarget) || href.slice(1);
          const matched = resolveHeadingMatch(rawTarget);
          if (matched) {
            child.attrSet('href', '#' + matched.id);
            child.attrSet('data-heading-target', matched.id);
            child.attrJoin('class', 'internal-heading-link');
          }
        }
      }
    });

    // Responsive table wrapper
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

    // Code block wrapper with language label & copy button
    md.renderer.rules.fence = function (tokens, idx) {
      const token = tokens[idx];
      const lang = (token.info || '').trim().split(/\s+/)[0] || '';
      const langBadge = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : '<span class="code-lang"></span>';
      const copyBtn = '<button type="button" class="code-copy-btn" aria-label="コードをコピー">コピー</button>';
      const codeHtml = escapeHtml(token.content);
      return `<div class="code-block"><div class="code-block-header">${langBadge}${copyBtn}</div><pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${codeHtml}</code></pre></div>\n`;
    };

    // Open external links safely in new tab
    const defaultLinkOpen = md.renderer.rules.link_open || function (tokens, idx, o, env, self) {
      return self.renderToken(tokens, idx, o);
    };
    md.renderer.rules.link_open = function (tokens, idx, o, env, self) {
      const href = tokens[idx].attrGet('href') || '';
      if (/^https?:\/\//i.test(href)) {
        tokens[idx].attrSet('target', '_blank');
        tokens[idx].attrSet('rel', 'noopener noreferrer');
      }
      return defaultLinkOpen(tokens, idx, o, env, self);
    };

    const html = md.render(source);
    const tocTree = buildTocTree(headings);
    const tocHtml = tocTree.length > 0
      ? renderTocTreeHtml(tocTree, 0)
      : '<p class="toc-empty">見出しがありません</p>';

    const firstH1 = headings.find((h) => h.level === 1);
    const inferredTitle = fm.title || (firstH1 ? firstH1.text : '');

    return {
      html,
      headings,
      tocTree,
      tocHtml,
      frontmatterTitle: fm.title,
      inferredTitle,
    };
  }

  return {
    parseMarkdown,
    buildTocTree,
    renderTocTreeHtml,
    escapeHtml,
  };
}));
