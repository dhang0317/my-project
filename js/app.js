/**
 * L'Atelier de Lecture — Main Application Controller
 * Features:
 * - Article Library management (Paste, .txt/.md upload, URL extraction)
 * - Highlighting any French word or sentence for instant Traditional Chinese translation
 * - Dual-mode linguistic inspector (Word verb lemmatization & POS vs. Sentence grammar breakdown)
 * - Multi-color persistent highlight markers in articles + Vocabulary Notebook
 * - Interactive Flashcard flip review & CSV / Anki / JSON export
 * - Dual-engine GitHub Cloud Database sync (Local backend Git push + GitHub REST API for GitHub Pages)
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'atelier_de_lecture_db_v1';
  const GH_CONFIG_KEY = 'atelier_gh_config_v1';

  // Application State
  let state = {
    db: null,
    currentArticleId: null,
    activeSelection: null, // { text, contextSentence, translationData, selectedColor }
    selectedMarkerColor: 'amber',
    flashcardIndex: 0,
    flashcardOrder: [],
    hasLocalBackend: false
  };

  // DOM Elements cache
  const el = {};

  function initDomRefs() {
    el.navTabs = document.querySelectorAll('.nav-tab[data-view]');
    el.views = document.querySelectorAll('.view-section');
    el.vocabCountBadge = document.getElementById('vocab-count-badge');
    el.articleCountNum = document.getElementById('article-count-num');
    el.articleListContainer = document.getElementById('article-list-container');

    // Reader
    el.readingScrollPane = document.getElementById('reading-scroll-pane');
    el.readerCategory = document.getElementById('reader-article-category');
    el.readerWordCount = document.getElementById('reader-word-count');
    el.readerTitle = document.getElementById('reader-article-title');
    el.readerSubtitle = document.getElementById('reader-article-subtitle');
    el.readerSourceLink = document.getElementById('reader-source-link');
    el.readerBody = document.getElementById('reader-article-body');
    el.currentProgressLabel = document.getElementById('current-progress-label');
    el.markReadCompleteBtn = document.getElementById('mark-read-complete-btn');

    // Typography toolbar
    el.fontDecBtn = document.getElementById('font-dec-btn');
    el.fontIncBtn = document.getElementById('font-inc-btn');
    el.fontSizeLabel = document.getElementById('font-size-label');
    el.lineTightBtn = document.getElementById('line-tight-btn');
    el.lineNormalBtn = document.getElementById('line-normal-btn');
    el.lineLooseBtn = document.getElementById('line-loose-btn');
    el.themeToggleBtn = document.getElementById('theme-toggle-btn');

    // Popover
    el.popover = document.getElementById('selection-popover');
    el.popoverFrWord = document.getElementById('popover-fr-word');
    el.popoverModeLabel = document.getElementById('popover-mode-label');
    el.popoverLemmaContainer = document.getElementById('popover-lemma-container');
    el.popoverLemmaChip = document.getElementById('popover-lemma-chip');
    el.popoverPosText = document.getElementById('popover-pos-text');
    el.popoverZhBox = document.getElementById('popover-zh-box');
    el.popoverSaveBtn = document.getElementById('popover-save-btn');
    el.swatchBtns = document.querySelectorAll('.swatch-btn');

    // Right Inspector
    el.inspectorModeBadge = document.getElementById('inspector-mode-badge');
    el.inspectorActivePanel = document.getElementById('inspector-active-panel');
    el.articleHlCount = document.getElementById('article-hl-count');
    el.articleHighlightsList = document.getElementById('article-highlights-list');

    // Vocab View
    el.vocabSearchInput = document.getElementById('vocab-search-input');
    el.vocabColorFilter = document.getElementById('vocab-color-filter');
    el.vocabGridContainer = document.getElementById('vocab-grid-container');
    el.exportAnkiBtn = document.getElementById('export-anki-btn');
    el.exportJsonBtn = document.getElementById('export-json-btn');

    // Flashcard View
    el.fcCounter = document.getElementById('flashcard-counter');
    el.fcShuffleBtn = document.getElementById('flashcard-shuffle-btn');
    el.fcBox = document.getElementById('flashcard-box');
    el.fcPosBadge = document.getElementById('fc-pos-badge');
    el.fcFrontWord = document.getElementById('fc-front-word');
    el.fcFrontLemma = document.getElementById('fc-front-lemma');
    el.fcZhMeaning = document.getElementById('fc-zh-meaning');
    el.fcGrammarNote = document.getElementById('fc-grammar-note');
    el.fcContextFr = document.getElementById('fc-context-fr');
    el.fcContextZh = document.getElementById('fc-context-zh');
    el.fcPrevBtn = document.getElementById('fc-prev-btn');
    el.fcFlipBtn = document.getElementById('fc-flip-btn');
    el.fcMasteredBtn = document.getElementById('fc-mastered-btn');
    el.fcNextBtn = document.getElementById('fc-next-btn');

    // Upload Modal
    el.uploadModal = document.getElementById('upload-modal');
    el.openUploadModalBtn = document.getElementById('open-upload-modal-btn');
    el.quickAddArticleBtn = document.getElementById('quick-add-article-btn');
    el.closeUploadModalBtn = document.getElementById('close-upload-modal-btn');
    el.cancelUploadBtn = document.getElementById('cancel-upload-btn');
    el.importTabs = document.querySelectorAll('[data-import-tab]');
    el.importPanePaste = document.getElementById('import-pane-paste');
    el.importPaneUrl = document.getElementById('import-pane-url');
    el.fileDropzone = document.getElementById('file-dropzone');
    el.fileUploadInput = document.getElementById('file-upload-input');
    el.articleTitleInput = document.getElementById('article-title-input');
    el.articleCategoryInput = document.getElementById('article-category-input');
    el.articleContentInput = document.getElementById('article-content-input');
    el.saveArticleBtn = document.getElementById('save-article-btn');
    el.articleUrlInput = document.getElementById('article-url-input');
    el.fetchUrlBtn = document.getElementById('fetch-url-btn');
    el.urlFetchStatus = document.getElementById('url-fetch-status');
    el.urlPresetBtns = document.querySelectorAll('.url-preset-btn');

    // Cloud Sync Modal
    el.syncModal = document.getElementById('sync-modal');
    el.cloudSyncBtn = document.getElementById('cloud-sync-btn');
    el.closeSyncModalBtn = document.getElementById('close-sync-modal-btn');
    el.syncStatusDot = document.getElementById('sync-status-dot');
    el.syncStatusText = document.getElementById('sync-status-text');
    el.ghRepoInput = document.getElementById('gh-repo-input');
    el.ghBranchInput = document.getElementById('gh-branch-input');
    el.ghTokenInput = document.getElementById('gh-token-input');
    el.syncLogBox = document.getElementById('sync-log-box');
    el.pullCloudBtn = document.getElementById('pull-cloud-btn');
    el.saveSyncConfigBtn = document.getElementById('save-sync-config-btn');
    el.pushCloudNowBtn = document.getElementById('push-cloud-now-btn');

    el.toastContainer = document.getElementById('toast-container');
  }

  function showToast(message) {
    const item = document.createElement('div');
    item.className = 'toast-msg';
    item.textContent = message;
    el.toastContainer.appendChild(item);
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transition = 'opacity 0.25s ease';
      setTimeout(() => item.remove(), 260);
    }, 3200);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==========================================================================
  // Database Loading & Cloud Sync (Local Server Git + GitHub REST API)
  // ==========================================================================
  function getGhConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(GH_CONFIG_KEY) || '{}');
      return {
        repo: saved.repo || 'dhang0317/my-project',
        branch: saved.branch || 'main',
        token: saved.token || ''
      };
    } catch (_) {
      return { repo: 'dhang0317/my-project', branch: 'main', token: '' };
    }
  }

  function saveGhConfig(cfg) {
    localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(cfg));
  }

  async function loadDatabase() {
    // 1. Try loading from local backend API `/api/library` or static `data/library.json`
    try {
      const apiResp = await fetch('api/library', { cache: 'no-store' });
      if (apiResp.ok && apiResp.headers.get('content-type')?.includes('application/json')) {
        state.db = await apiResp.json();
        state.hasLocalBackend = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
        setSyncIndicator('idle', 'GitHub 雲端已同步');
        return;
      }
    } catch (_) {}

    // 2. Fallback for GitHub Pages static hosting: fetch `data/library.json`
    try {
      const staticResp = await fetch('data/library.json', { cache: 'no-store' });
      if (staticResp.ok) {
        const remoteDb = await staticResp.json();
        const localCached = localStorage.getItem(STORAGE_KEY);
        if (localCached) {
          const parsedLocal = JSON.parse(localCached);
          // Use whichever is newer
          if (new Date(parsedLocal.lastUpdated || 0) > new Date(remoteDb.lastUpdated || 0)) {
            state.db = parsedLocal;
          } else {
            state.db = remoteDb;
          }
        } else {
          state.db = remoteDb;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
        setSyncIndicator('idle', '雲端書庫已載入');
        return;
      }
    } catch (_) {}

    // 3. Final fallback to localStorage
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      state.db = JSON.parse(cached);
    }
  }

  function setSyncIndicator(status, text) {
    if (!el.syncStatusDot || !el.syncStatusText) return;
    el.syncStatusText.textContent = text;
    if (status === 'syncing') {
      el.syncStatusDot.classList.add('syncing');
    } else {
      el.syncStatusDot.classList.remove('syncing');
    }
  }

  async function persistDatabase(syncToGithub = true) {
    if (!state.db) return;
    state.db.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));

    if (!syncToGithub) return;

    setSyncIndicator('syncing', '正在同步至 GitHub...');

    // Path A: Local Backend Server automatically commits & pushes to GitHub
    if (state.hasLocalBackend) {
      try {
        const resp = await fetch('api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: state.db, syncToGithub: true })
        });
        if (resp.ok) {
          const result = await resp.json();
          setSyncIndicator('idle', 'GitHub 雲端已同步');
          if (el.syncLogBox) {
            el.syncLogBox.textContent = `最新同步 (${new Date().toLocaleTimeString()})：${result.gitStatus?.message || '成功'}`;
          }
          return;
        }
      } catch (_) {}
    }

    // Path B: Direct Browser -> GitHub REST API (when hosted on GitHub Pages with PAT)
    const cfg = getGhConfig();
    if (cfg.token && cfg.repo) {
      try {
        await pushToGithubRestApi(cfg, state.db);
        setSyncIndicator('idle', 'GitHub API 已同步');
        if (el.syncLogBox) {
          el.syncLogBox.textContent = `最新同步 (${new Date().toLocaleTimeString()})：已透過 GitHub REST API 寫入 ${cfg.repo}/data/library.json`;
        }
        return;
      } catch (err) {
        setSyncIndicator('idle', '已存本地 (待設定 Token)');
        if (el.syncLogBox) {
          el.syncLogBox.textContent = `GitHub REST API 同步失敗：${err.message}`;
        }
        return;
      }
    }

    setSyncIndicator('idle', '已儲存至本地快取');
  }

  async function pushToGithubRestApi(cfg, dbPayload) {
    const apiUrl = `https://api.github.com/repos/${cfg.repo}/contents/data/library.json`;
    const headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${cfg.token}`
    };

    // Get current file SHA if exists
    let sha = undefined;
    const getResp = await fetch(`${apiUrl}?ref=${encodeURIComponent(cfg.branch)}`, { headers });
    if (getResp.ok) {
      const fileMeta = await getResp.json();
      sha = fileMeta.sha;
    }

    const jsonStr = JSON.stringify(dbPayload, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonStr)));

    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `chore(db): sync French reading library & vocabulary from web (${new Date().toISOString().slice(0, 19)})`,
        content: base64Content,
        branch: cfg.branch,
        ...(sha ? { sha } : {})
      })
    });

    if (!putResp.ok) {
      const errData = await putResp.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${putResp.status}`);
    }
  }

  // ==========================================================================
  // Article Rendering & Highlighting Engine
  // ==========================================================================
  function getCurrentArticle() {
    if (!state.db || !Array.isArray(state.db.articles)) return null;
    return state.db.articles.find(a => a.id === state.currentArticleId) || state.db.articles[0] || null;
  }

  function countFrenchWords(text) {
    return (text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  function renderArticleLibrarySidebar() {
    const articles = state.db?.articles || [];
    el.articleCountNum.textContent = articles.length;
    el.vocabCountBadge.textContent = (state.db?.vocabulary || []).length;

    el.articleListContainer.innerHTML = articles.map(art => {
      const isActive = art.id === state.currentArticleId;
      const wordCount = countFrenchWords(art.content);
      const hlCount = (art.highlights || []).length;
      const progress = Math.min(100, Math.max(0, art.progress || 0));

      return `
        <div class="article-card ${isActive ? 'active' : ''}" data-article-id="${escapeHtml(art.id)}">
          <div class="article-card-category">
            <span>${escapeHtml(art.category || '法文閱讀')}</span>
            <button class="delete-article-btn" data-delete-id="${escapeHtml(art.id)}" title="刪除此文章" style="border:none;background:transparent;color:var(--text-muted);cursor:pointer;font-size:12px;">✕</button>
          </div>
          <div class="article-card-title">${escapeHtml(art.title)}</div>
          <div class="article-card-meta">
            <span>${wordCount} 字 · 🖍️ ${hlCount} 標記</span>
            <span>${progress}%</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${progress}%;"></div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners
    el.articleListContainer.querySelectorAll('.article-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.delete-article-btn');
        if (delBtn) {
          e.stopPropagation();
          deleteArticle(delBtn.dataset.deleteId);
          return;
        }
        selectArticle(card.dataset.articleId);
      });
    });
  }

  function selectArticle(articleId) {
    state.currentArticleId = articleId;
    hidePopover();
    renderArticleLibrarySidebar();
    renderCurrentArticle();
    renderArticleHighlightsSidebar();
    el.readingScrollPane.scrollTop = 0;
  }

  function deleteArticle(articleId) {
    if (!state.db || state.db.articles.length <= 1) {
      showToast('書庫至少需保留一篇文章！');
      return;
    }
    state.db.articles = state.db.articles.filter(a => a.id !== articleId);
    if (state.currentArticleId === articleId) {
      state.currentArticleId = state.db.articles[0].id;
    }
    renderArticleLibrarySidebar();
    renderCurrentArticle();
    renderArticleHighlightsSidebar();
    persistDatabase(true);
    showToast('已從書庫移除文章并同步雲端');
  }

  /**
   * Apply saved highlights inside a paragraph safely without breaking HTML tags
   */
  function decorateParagraphWithHighlights(paragraphText, highlights) {
    let safeHtml = escapeHtml(paragraphText);
    if (!Array.isArray(highlights) || highlights.length === 0) {
      return safeHtml;
    }

    // Sort highlights by length descending so longer phrases match first
    const sorted = [...highlights]
      .filter(h => h && h.text && h.text.trim().length > 0)
      .sort((a, b) => b.text.length - a.text.length);

    // Use placeholders to avoid nested replacements
    const placeholders = [];
    sorted.forEach((hl, idx) => {
      const targetEscaped = escapeHtml(hl.text.trim());
      if (!targetEscaped) return;
      const escapedRegex = targetEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedRegex})`, 'i');
      if (regex.test(safeHtml)) {
        const token = `__HL_TOKEN_${idx}__`;
        safeHtml = safeHtml.replace(regex, (match) => {
          placeholders.push({
            token,
            html: `<mark class="hl-mark hl-${escapeHtml(hl.color || 'amber')}" data-hl-id="${escapeHtml(hl.id)}" title="點擊查看翻譯：${escapeHtml(hl.translation)}">${match}</mark>`
          });
          return token;
        });
      }
    });

    for (const item of placeholders) {
      safeHtml = safeHtml.replace(item.token, item.html);
    }

    return safeHtml;
  }

  function renderCurrentArticle() {
    const art = getCurrentArticle();
    if (!art) return;

    state.currentArticleId = art.id;
    el.readerCategory.textContent = art.category || '法文文章';
    el.readerWordCount.textContent = `${countFrenchWords(art.content)} 個法文字詞`;
    el.readerTitle.textContent = art.title;
    el.readerSubtitle.textContent = art.subtitle || '';
    el.currentProgressLabel.textContent = `${art.progress || 0}%`;

    if (art.sourceUrl) {
      el.readerSourceLink.href = art.sourceUrl;
      el.readerSourceLink.style.display = 'inline-flex';
    } else {
      el.readerSourceLink.style.display = 'none';
    }

    const paragraphs = (art.content || '')
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    const highlights = art.highlights || [];
    el.readerBody.innerHTML = paragraphs.map((pText, idx) => {
      const decorated = decorateParagraphWithHighlights(pText, highlights);
      return `<p class="article-paragraph" data-p-idx="${idx}">${decorated}</p>`;
    }).join('');

    // Attach click listener on existing highlight marks
    el.readerBody.querySelectorAll('.hl-mark').forEach(markEl => {
      markEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const hlId = markEl.dataset.hlId;
        const hlObj = (art.highlights || []).find(h => h.id === hlId);
        if (hlObj) {
          inspectSavedHighlight(hlObj);
        }
      });
    });
  }

  function renderArticleHighlightsSidebar() {
    const art = getCurrentArticle();
    const highlights = art?.highlights || [];
    el.articleHlCount.textContent = `${highlights.length} 筆`;

    if (highlights.length === 0) {
      el.articleHighlightsList.innerHTML = `
        <div style="font-size: 12.5px; color: var(--text-muted); padding: 10px 4px;">
          本篇尚無螢光筆標記。在文章中反白法文即可一鍵標記重點！
        </div>
      `;
      return;
    }

    el.articleHighlightsList.innerHTML = highlights.map(hl => `
      <div class="saved-hl-item" data-hl-id="${escapeHtml(hl.id)}">
        <div class="saved-hl-top">
          <span class="saved-hl-fr">
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;" class="swatch-${escapeHtml(hl.color || 'amber')}"></span>
            ${escapeHtml(hl.text)}
          </span>
          <button class="remove-hl-btn" data-remove-hl="${escapeHtml(hl.id)}" title="移除此螢光筆標記" style="border:none;background:transparent;color:var(--text-muted);cursor:pointer;font-size:12px;">✕</button>
        </div>
        <div class="saved-hl-zh">${escapeHtml(hl.translation)}</div>
        ${hl.lemma && hl.lemma !== hl.text ? `<div style="font-size:11.5px;color:var(--text-muted);margin-top:2px;font-family:var(--font-mono);">原形: ${escapeHtml(hl.lemma)} · ${escapeHtml(hl.pos || '')}</div>` : ''}
      </div>
    `).join('');

    el.articleHighlightsList.querySelectorAll('.saved-hl-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const rmBtn = e.target.closest('.remove-hl-btn');
        if (rmBtn) {
          e.stopPropagation();
          removeHighlight(rmBtn.dataset.removeHl);
          return;
        }
        const hlObj = highlights.find(h => h.id === item.dataset.hlId);
        if (hlObj) inspectSavedHighlight(hlObj);
      });
    });
  }

  function removeHighlight(hlId) {
    const art = getCurrentArticle();
    if (!art) return;
    art.highlights = (art.highlights || []).filter(h => h.id !== hlId);
    renderCurrentArticle();
    renderArticleHighlightsSidebar();
    renderArticleLibrarySidebar();
    persistDatabase(true);
    showToast('已移除螢光筆標記');
  }

  // ==========================================================================
  // Text Selection (Anti-White / 反白) Translation & Linguistic Analysis
  // ==========================================================================
  function extractSurroundingSentence(selection, fullParagraphText) {
    const selectedText = selection.toString().trim();
    if (!fullParagraphText) return selectedText;
    // Split paragraph into sentences
    const sentences = fullParagraphText.match(/[^.!?«»]+[.!?«»]*\s*/g) || [fullParagraphText];
    for (const s of sentences) {
      if (s.includes(selectedText)) {
        return s.trim();
      }
    }
    return fullParagraphText.slice(0, 260).trim();
  }

  async function fetchTranslationAndAnalysis(selectedText, contextSentence) {
    // 1. Try local backend `/api/translate` first
    if (state.hasLocalBackend) {
      try {
        const resp = await fetch('api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: selectedText, context: contextSentence })
        });
        if (resp.ok) {
          return await resp.json();
        }
      } catch (_) {}
    }

    // 2. Direct browser fallback (for GitHub Pages static deployment)
    const analysis = window.FrenchAnalyzer.analyzeSelection(selectedText, contextSentence);
    let primaryTranslation = '';
    let dictEntries = [];
    let lemmaTranslation = '';
    let contextTranslation = '';

    try {
      const gtUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=zh-TW&dt=t&dt=bd&q=${encodeURIComponent(selectedText)}`;
      const resp = await fetch(gtUrl);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data[0])) {
          primaryTranslation = data[0].map(seg => seg[0] || '').join('');
        }
        if (Array.isArray(data[1])) {
          dictEntries = data[1].map(posBlock => ({
            pos: posBlock[0],
            terms: Array.isArray(posBlock[1]) ? posBlock[1].slice(0, 6) : []
          }));
        }
      }
    } catch (_) {}

    if (!primaryTranslation && analysis.primaryMorph?.zhHint) {
      primaryTranslation = analysis.primaryMorph.zhHint;
    }

    if (
      analysis.mode === 'word' &&
      analysis.primaryMorph?.lemma &&
      analysis.primaryMorph.lemma.toLowerCase() !== analysis.primaryMorph.cleanWord.toLowerCase()
    ) {
      try {
        const lUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=zh-TW&dt=t&q=${encodeURIComponent(analysis.primaryMorph.lemma)}`;
        const lResp = await fetch(lUrl);
        if (lResp.ok) {
          const lData = await lResp.json();
          if (Array.isArray(lData[0])) {
            lemmaTranslation = lData[0].map(seg => seg[0] || '').join('');
          }
        }
      } catch (_) {}
    }

    if (contextSentence && contextSentence !== selectedText && contextSentence.length < 500) {
      try {
        const cUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=zh-TW&dt=t&q=${encodeURIComponent(contextSentence)}`;
        const cResp = await fetch(cUrl);
        if (cResp.ok) {
          const cData = await cResp.json();
          if (Array.isArray(cData[0])) {
            contextTranslation = cData[0].map(seg => seg[0] || '').join('');
          }
        }
      } catch (_) {}
    }

    return {
      text: selectedText,
      translation: primaryTranslation || '（請參考右側語法與字根解析）',
      lemmaTranslation,
      dictEntries,
      contextSentence,
      contextTranslation,
      analysis
    };
  }

  function positionPopoverNearRect(rect) {
    const popWidth = 340;
    const popHeight = 210;
    const margin = 12;

    let left = rect.left + rect.width / 2 - popWidth / 2;
    left = Math.max(16, Math.min(window.innerWidth - popWidth - 16, left));

    let top = rect.top - popHeight - margin;
    if (top < 70) {
      top = rect.bottom + margin;
    }

    el.popover.style.left = `${Math.round(left)}px`;
    el.popover.style.top = `${Math.round(top)}px`;
    el.popover.classList.add('visible');
  }

  function hidePopover() {
    el.popover.classList.remove('visible');
  }

  async function handleArticleTextSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const rawText = sel.toString().trim();
    if (!rawText || rawText.length < 2 || rawText.length > 900) return;

    // Ensure selection is inside #reader-article-body
    const anchorNode = sel.anchorNode;
    if (!anchorNode || !el.readerBody.contains(anchorNode)) return;

    const paragraphEl = (anchorNode.nodeType === 1 ? anchorNode : anchorNode.parentElement)?.closest('.article-paragraph');
    const paragraphText = paragraphEl ? paragraphEl.textContent.trim() : rawText;
    const contextSentence = extractSurroundingSentence(sel, paragraphText);

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Instant local analysis preview in Popover before network translation returns
    const localPreview = window.FrenchAnalyzer.analyzeSelection(rawText, contextSentence);
    el.popoverFrWord.textContent = rawText.length > 60 ? rawText.slice(0, 58) + '…' : rawText;
    el.popoverModeLabel.textContent = localPreview.mode === 'word' ? '單字 / 片語模式' : '整句 / 段落模式';

    if (localPreview.mode === 'word' && localPreview.primaryMorph) {
      el.popoverLemmaContainer.style.display = 'flex';
      el.popoverLemmaChip.textContent = `原形: ${localPreview.primaryMorph.lemma}`;
      el.popoverPosText.textContent = localPreview.primaryMorph.pos;
    } else {
      el.popoverLemmaContainer.style.display = 'none';
    }

    el.popoverZhBox.textContent = localPreview.primaryMorph?.zhHint
      ? `${localPreview.primaryMorph.zhHint}（正在查詢完整翻譯...）`
      : '正在翻譯為繁體中文...';

    positionPopoverNearRect(rect);

    // Fetch full translation + dictionary + context translation
    const result = await fetchTranslationAndAnalysis(rawText, contextSentence);
    state.activeSelection = {
      text: rawText,
      contextSentence,
      result
    };

    // Update Popover with final translation
    const displayZh = (result.analysis?.primaryMorph?.zhHint && result.translation !== result.analysis.primaryMorph.zhHint)
      ? `${result.translation} · ${result.analysis.primaryMorph.zhHint}`
      : result.translation;

    el.popoverZhBox.textContent = displayZh;

    // Update Right Fixed Linguistic Inspector Panel
    renderInspectorPanel(result);
  }

  function renderInspectorPanel(data) {
    const analysis = data.analysis || window.FrenchAnalyzer.analyzeSelection(data.text, data.contextSentence);
    const isWord = analysis.mode === 'word';

    el.inspectorModeBadge.textContent = isWord ? '單字與變位解析' : '整句翻譯與語法拆解';

    if (isWord) {
      const morph = analysis.primaryMorph || {};
      const hasDistinctLemma = morph.lemma && morph.lemma.toLowerCase() !== morph.cleanWord.toLowerCase();

      const dictHtml = (data.dictEntries && data.dictEntries.length > 0)
        ? data.dictEntries.map(d => `
            <div class="dict-pos-group">
              <div class="dict-pos-label">${escapeHtml(d.pos)}</div>
              <div class="dict-terms">
                ${d.terms.map(t => `<span class="dict-term-pill">${escapeHtml(t)}</span>`).join('')}
              </div>
            </div>
          `).join('')
        : '';

      el.inspectorActivePanel.innerHTML = `
        <div class="inspector-card">
          <div class="inspector-section-label">
            <span>🇫🇷 選取單字 / 片語</span>
            <button id="inspector-save-btn" class="btn btn-primary" style="padding: 3px 10px; font-size: 11.5px;">＋ 存入生字本</button>
          </div>
          <div class="inspector-headword">${escapeHtml(data.text)}</div>
          <div class="inspector-zh-main">${escapeHtml(data.translation)}</div>
          ${morph.zhHint && morph.zhHint !== data.translation ? `<div style="font-size:13.5px;color:var(--accent-burgundy);margin-bottom:10px;font-weight:600;">📚 核心釋義：${escapeHtml(morph.zhHint)}</div>` : ''}

          <div class="morph-grid">
            <div class="morph-row">
              <span class="morph-key">動詞原形 / 詞幹 (Lemme)</span>
              <span class="morph-val" style="font-family: var(--font-mono); color: var(--accent-navy);">
                ${escapeHtml(morph.lemma || data.text)}
                ${hasDistinctLemma && data.lemmaTranslation ? ` (${escapeHtml(data.lemmaTranslation)})` : ''}
              </span>
            </div>
            <div class="morph-row">
              <span class="morph-key">詞性 (Catégorie)</span>
              <span class="morph-val">${escapeHtml(morph.pos || '詞彙')}</span>
            </div>
            <div class="morph-row">
              <span class="morph-key">變位 / 陰陽單複數</span>
              <span class="morph-val">${escapeHtml(morph.morphology || '基礎型態')}</span>
            </div>
            ${morph.elision ? `
            <div class="morph-row">
              <span class="morph-key">省音結構 (Élision)</span>
              <span class="morph-val" style="color: var(--accent-burgundy);">${escapeHtml(morph.elision)}</span>
            </div>` : ''}
          </div>

          ${dictHtml}
        </div>

        ${data.contextSentence ? `
        <div class="inspector-card">
          <div class="inspector-section-label"><span>📖 上下文原句對照</span></div>
          <div style="font-family: var(--font-serif-fr); font-size: 16.5px; color: var(--text-primary); margin-bottom: 6px; line-height: 1.45;">
            « ${escapeHtml(data.contextSentence)} »
          </div>
          <div style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.5;">
            ${escapeHtml(data.contextTranslation || '（點擊整句可查看完整語法結構）')}
          </div>
        </div>` : ''}
      `;
    } else {
      // Sentence / Paragraph Mode
      const grammarNotes = analysis.sentenceAnalysis?.grammarNotes || [];
      const tokens = analysis.sentenceAnalysis?.tokenBreakdown || [];

      el.inspectorActivePanel.innerHTML = `
        <div class="inspector-card">
          <div class="inspector-section-label">
            <span>🇫🇷 整句 / 段落繁體中文翻譯</span>
            <button id="inspector-save-btn" class="btn btn-primary" style="padding: 3px 10px; font-size: 11.5px;">🖍️ 標記佳句</button>
          </div>
          <div style="font-family: var(--font-serif-fr); font-size: 18px; font-weight: 600; color: var(--accent-burgundy); margin-bottom: 10px; line-height: 1.4;">
            « ${escapeHtml(data.text)} »
          </div>
          <div class="inspector-zh-main" style="font-size: 16.5px; background: var(--bg-secondary); padding: 11px 13px; border-radius: var(--radius-sm);">
            ${escapeHtml(data.translation)}
          </div>

          ${grammarNotes.length > 0 ? `
            <div class="inspector-section-label" style="margin-top: 14px;"><span>🧩 句型與法文語法拆解</span></div>
            ${grammarNotes.map(g => `
              <div class="grammar-note-item">
                <div class="grammar-note-pattern">${escapeHtml(g.pattern)} · <span style="font-family:var(--font-sans-ui);font-weight:500;">${escapeHtml(g.type)}</span></div>
                <div class="grammar-note-desc">${escapeHtml(g.explanation)}</div>
              </div>
            `).join('')}
          ` : ''}

          ${tokens.length > 0 ? `
            <div class="inspector-section-label" style="margin-top: 14px;"><span>🔑 句中重點詞彙與變位還原</span></div>
            <div class="saved-hl-list">
              ${tokens.map(t => `
                <div style="background: var(--bg-secondary); padding: 8px 11px; border-radius: var(--radius-sm); font-size: 12.5px;">
                  <div style="display:flex;justify-content:space-between;font-weight:600;">
                    <span style="font-family:var(--font-serif-fr);font-size:15px;color:var(--accent-navy);">${escapeHtml(t.word)}</span>
                    <span style="font-family:var(--font-mono);color:var(--text-secondary);">原形: ${escapeHtml(t.lemma)}</span>
                  </div>
                  <div style="color:var(--text-muted);margin-top:2px;">
                    ${escapeHtml(t.pos)} ${t.zhHint ? `· <strong style="color:var(--text-primary);">${escapeHtml(t.zhHint)}</strong>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }

    const inspSaveBtn = document.getElementById('inspector-save-btn');
    if (inspSaveBtn) {
      inspSaveBtn.addEventListener('click', () => saveActiveSelectionToHighlightAndVocab());
    }
  }

  function inspectSavedHighlight(hlObj) {
    const syntheticResult = {
      text: hlObj.text,
      translation: hlObj.translation,
      lemmaTranslation: '',
      dictEntries: [],
      contextSentence: hlObj.context || hlObj.text,
      contextTranslation: hlObj.note || '',
      analysis: window.FrenchAnalyzer.analyzeSelection(hlObj.text, hlObj.context || '')
    };
    state.activeSelection = {
      text: hlObj.text,
      contextSentence: hlObj.context || hlObj.text,
      result: syntheticResult
    };
    renderInspectorPanel(syntheticResult);
  }

  function saveActiveSelectionToHighlightAndVocab() {
    if (!state.activeSelection || !state.activeSelection.result) return;
    const art = getCurrentArticle();
    if (!art) return;

    const { text, contextSentence, result } = state.activeSelection;
    const morph = result.analysis?.primaryMorph || {};
    const lemma = morph.lemma || text;
    const pos = morph.pos || (result.analysis?.mode === 'sentence' ? '完整句子' : '詞彙');
    const color = state.selectedMarkerColor || 'amber';

    if (!Array.isArray(art.highlights)) art.highlights = [];

    // Avoid duplicate highlight on same article
    const existingHl = art.highlights.find(h => h.text.toLowerCase() === text.toLowerCase());
    if (existingHl) {
      existingHl.color = color;
      existingHl.translation = result.translation;
    } else {
      art.highlights.unshift({
        id: 'hl-' + Date.now(),
        text,
        lemma,
        pos,
        translation: result.translation,
        note: morph.zhHint || morph.morphology || '',
        color,
        context: contextSentence
      });
    }

    // Add to global Vocabulary Notebook
    if (!Array.isArray(state.db.vocabulary)) state.db.vocabulary = [];
    const existingVoc = state.db.vocabulary.find(v => v.word.toLowerCase() === text.toLowerCase());
    if (!existingVoc) {
      state.db.vocabulary.unshift({
        id: 'voc-' + Date.now(),
        word: text,
        lemma,
        pos,
        translation: result.translation,
        grammarNote: morph.zhHint
          ? `${morph.morphology || ''} · ${morph.zhHint}`
          : (morph.morphology || '反白收藏重點'),
        contextSentence: contextSentence || text,
        contextTranslation: result.contextTranslation || result.translation,
        articleId: art.id,
        articleTitle: art.title,
        color,
        mastery: 0,
        createdAt: new Date().toISOString()
      });
    }

    hidePopover();
    window.getSelection()?.removeAllRanges();

    renderCurrentArticle();
    renderArticleHighlightsSidebar();
    renderArticleLibrarySidebar();
    renderVocabularyView();
    persistDatabase(true);

    showToast(`🖍️ 已標記「${text.slice(0, 24)}」並同步至生字本與 GitHub 雲端！`);
  }

  // ==========================================================================
  // Vocabulary Notebook & Export (CSV / Anki / JSON)
  // ==========================================================================
  function renderVocabularyView() {
    const vocabList = state.db?.vocabulary || [];
    el.vocabCountBadge.textContent = vocabList.length;

    const query = (el.vocabSearchInput?.value || '').trim().toLowerCase();
    const colorFilter = el.vocabColorFilter?.value || 'all';

    const filtered = vocabList.filter(item => {
      if (colorFilter !== 'all' && item.color !== colorFilter) return false;
      if (!query) return true;
      return (
        (item.word || '').toLowerCase().includes(query) ||
        (item.lemma || '').toLowerCase().includes(query) ||
        (item.translation || '').toLowerCase().includes(query) ||
        (item.contextSentence || '').toLowerCase().includes(query)
      );
    });

    if (filtered.length === 0) {
      el.vocabGridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted); border: 1px dashed var(--border-strong); border-radius: var(--radius-md);">
          目前沒有符合條件的法文生字。去「沉浸閱讀室」反白單字並點擊螢光筆即可收藏！
        </div>
      `;
      return;
    }

    el.vocabGridContainer.innerHTML = filtered.map(v => `
      <div class="vocab-card">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span class="popover-mode-tag">${escapeHtml(v.pos || '詞彙')}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11.5px; color: var(--text-muted);">原形: <strong style="font-family:var(--font-mono);color:var(--text-primary);">${escapeHtml(v.lemma || v.word)}</strong></span>
              <button class="delete-vocab-btn" data-voc-id="${escapeHtml(v.id)}" title="刪除此生字" style="border:none;background:transparent;color:var(--text-muted);cursor:pointer;">✕</button>
            </div>
          </div>

          <div class="vocab-card-word">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;" class="swatch-${escapeHtml(v.color || 'amber')}"></span>
            ${escapeHtml(v.word)}
          </div>
          <div class="vocab-card-zh">${escapeHtml(v.translation)}</div>
          ${v.grammarNote ? `<div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 6px;">${escapeHtml(v.grammarNote)}</div>` : ''}
        </div>

        <div>
          <div class="vocab-card-context">
            <div>« ${escapeHtml(v.contextSentence || '')} »</div>
            ${v.contextTranslation ? `<div style="font-family:var(--font-sans-ui);font-size:12px;color:var(--text-muted);margin-top:4px;">${escapeHtml(v.contextTranslation)}</div>` : ''}
          </div>
          <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 8px; display: flex; justify-content: space-between;">
            <span>出處：${escapeHtml(v.articleTitle || '法文閱讀')}</span>
            <span>熟練度：${'★'.repeat(Math.min(3, v.mastery || 0))}${'☆'.repeat(Math.max(0, 3 - (v.mastery || 0)))}</span>
          </div>
        </div>
      </div>
    `).join('');

    el.vocabGridContainer.querySelectorAll('.delete-vocab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const vocId = btn.dataset.vocId;
        state.db.vocabulary = state.db.vocabulary.filter(v => v.id !== vocId);
        renderVocabularyView();
        persistDatabase(true);
        showToast('已從生字本移除該筆詞彙');
      });
    });
  }

  function exportVocabularyToAnkiCsv() {
    const vocab = state.db?.vocabulary || [];
    if (vocab.length === 0) {
      showToast('生字本目前為空，無法匯出');
      return;
    }

    const headers = ['French_Word', 'Lemma_Infinitif', 'Part_Of_Speech', 'Traditional_Chinese', 'Grammar_Note', 'Context_Sentence_FR', 'Context_Translation_ZH', 'Source_Article'];
    const csvRows = [headers.join(',')];

    for (const v of vocab) {
      const row = [
        v.word,
        v.lemma,
        v.pos,
        v.translation,
        v.grammarNote,
        v.contextSentence,
        v.contextTranslation,
        v.articleTitle
      ].map(cell => `"${String(cell || '').replace(/"/g, '""')}"`);
      csvRows.push(row.join(','));
    }

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atelier-french-vocabulary-anki-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已匯出 Anki / CSV 記憶卡檔案！');
  }

  function exportFullDatabaseJson() {
    if (!state.db) return;
    const blob = new Blob([JSON.stringify(state.db, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atelier-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已匯出完整 JSON 書庫與生字備份檔！');
  }

  // ==========================================================================
  // Flashcard Review Mode
  // ==========================================================================
  function initFlashcards(shuffle = false) {
    const vocab = state.db?.vocabulary || [];
    state.flashcardOrder = vocab.map((_, idx) => idx);
    if (shuffle) {
      for (let i = state.flashcardOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.flashcardOrder[i], state.flashcardOrder[j]] = [state.flashcardOrder[j], state.flashcardOrder[i]];
      }
    }
    state.flashcardIndex = 0;
    renderCurrentFlashcard();
  }

  function renderCurrentFlashcard() {
    const vocab = state.db?.vocabulary || [];
    el.fcBox.classList.remove('flipped');

    if (vocab.length === 0) {
      el.fcCounter.textContent = '0 / 0';
      el.fcPosBadge.textContent = '尚無生字';
      el.fcFrontWord.textContent = '生字本目前為空';
      el.fcFrontLemma.textContent = '請先在閱讀器反白單字加入生字本';
      return;
    }

    if (state.flashcardOrder.length !== vocab.length) {
      state.flashcardOrder = vocab.map((_, idx) => idx);
    }

    state.flashcardIndex = (state.flashcardIndex + vocab.length) % vocab.length;
    const item = vocab[state.flashcardOrder[state.flashcardIndex]];

    el.fcCounter.textContent = `第 ${state.flashcardIndex + 1} / ${vocab.length} 張`;
    el.fcPosBadge.textContent = item.pos || '法文詞彙';
    el.fcFrontWord.textContent = item.word;
    el.fcFrontLemma.textContent = `原形 / 詞幹：${item.lemma || item.word}`;
    el.fcZhMeaning.textContent = item.translation;
    el.fcGrammarNote.textContent = item.grammarNote || '';
    el.fcContextFr.textContent = `« ${item.contextSentence || item.word} »`;
    el.fcContextZh.textContent = item.contextTranslation || '';
  }

  // ==========================================================================
  // Article Upload (.txt/.md), Paste, and URL Scraper
  // ==========================================================================
  function handleFileRead(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || '').trim();
      if (!text) return;
      const baseName = file.name.replace(/\.(txt|md)$/i, '');
      if (!el.articleTitleInput.value.trim()) {
        el.articleTitleInput.value = baseName;
      }
      el.articleContentInput.value = text;
      showToast(`已載入檔案「${file.name}」，確認標題後即可儲存！`);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function saveUploadedArticle() {
    const title = el.articleTitleInput.value.trim() || 'Article Français Personnalisé';
    const category = el.articleCategoryInput.value || '自訂閱讀';
    const content = el.articleContentInput.value.trim();

    if (!content || content.length < 10) {
      showToast('請輸入或上傳至少一段法文文章內容！');
      return;
    }

    const newArticle = {
      id: 'art-' + Date.now(),
      title,
      subtitle: `${category} · 手動上傳匯入`,
      category,
      sourceUrl: '',
      createdAt: new Date().toISOString(),
      progress: 0,
      content,
      highlights: []
    };

    state.db.articles.unshift(newArticle);
    state.currentArticleId = newArticle.id;

    el.articleTitleInput.value = '';
    el.articleContentInput.value = '';
    el.uploadModal.classList.remove('open');

    renderArticleLibrarySidebar();
    renderCurrentArticle();
    renderArticleHighlightsSidebar();
    persistDatabase(true);
    showToast(`已成功匯入《${title}》並同步至 GitHub 雲端書庫！`);
  }

  async function handleFetchArticleFromUrl() {
    const targetUrl = el.articleUrlInput.value.trim();
    if (!targetUrl) {
      el.urlFetchStatus.textContent = '請先輸入有效的法文文章或維基百科網址 (http/https)';
      return;
    }

    el.urlFetchStatus.textContent = '⏳ 正在連線抓取法文網頁正文並過濾雜訊...';
    el.fetchUrlBtn.disabled = true;

    try {
      let extracted = null;

      if (state.hasLocalBackend) {
        const resp = await fetch('api/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || '擷取失敗');
        extracted = data;
      } else {
        // Browser direct fallback for French Wikipedia URLs on GitHub Pages
        const wikiMatch = targetUrl.match(/fr\.wikipedia\.org\/wiki\/([^#?]+)/i);
        if (wikiMatch) {
          const sumResp = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${wikiMatch[1]}`);
          if (sumResp.ok) {
            const sumData = await sumResp.json();
            extracted = {
              title: sumData.title || decodeURIComponent(wikiMatch[1]),
              subtitle: 'Wikipédia en français · 網址自動擷取',
              category: '網路文章',
              sourceUrl: targetUrl,
              content: sumData.extract || ''
            };
          }
        }
        if (!extracted || !extracted.content) {
          throw new Error('外部新聞網站受瀏覽器 CORS 保護，請在本地伺服器模式抓取或直接複製貼上內文。');
        }
      }

      const newArt = {
        id: 'art-' + Date.now(),
        title: extracted.title,
        subtitle: extracted.subtitle,
        category: extracted.category || '網路文章',
        sourceUrl: extracted.sourceUrl || targetUrl,
        createdAt: new Date().toISOString(),
        progress: 0,
        content: extracted.content,
        highlights: []
      };

      state.db.articles.unshift(newArt);
      state.currentArticleId = newArt.id;

      el.articleUrlInput.value = '';
      el.urlFetchStatus.textContent = '';
      el.uploadModal.classList.remove('open');

      renderArticleLibrarySidebar();
      renderCurrentArticle();
      renderArticleHighlightsSidebar();
      persistDatabase(true);
      showToast(`🌐 已成功從網址擷取《${newArt.title}》！`);
    } catch (err) {
      el.urlFetchStatus.textContent = `⚠️ ${err.message}`;
    } finally {
      el.fetchUrlBtn.disabled = false;
    }
  }

  // ==========================================================================
  // Event Binding & Initialization
  // ==========================================================================
  function bindEvents() {
    // Top view switching tabs
    el.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        el.navTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetView = tab.dataset.view;
        el.views.forEach(v => v.classList.toggle('active', v.id === targetView));
        hidePopover();
        if (targetView === 'vocab-view') renderVocabularyView();
        if (targetView === 'flashcard-view') initFlashcards(false);
      });
    });

    // Text selection (Anti-white / 反白) listeners on reading body
    el.readerBody.addEventListener('mouseup', () => {
      setTimeout(handleArticleTextSelection, 20);
    });
    el.readerBody.addEventListener('keyup', () => {
      setTimeout(handleArticleTextSelection, 20);
    });

    // Hide popover when clicking outside
    document.addEventListener('mousedown', (e) => {
      if (
        el.popover.classList.contains('visible') &&
        !el.popover.contains(e.target)
      ) {
        hidePopover();
      }
    });

    // Swatch color picker inside Popover
    el.swatchBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        el.swatchBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedMarkerColor = btn.dataset.color;
      });
    });

    // Save highlight & vocab button in Popover
    el.popoverSaveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      saveActiveSelectionToHighlightAndVocab();
    });

    // Reading scroll progress tracker
    el.readingScrollPane.addEventListener('scroll', () => {
      hidePopover();
      const art = getCurrentArticle();
      if (!art) return;
      const { scrollTop, scrollHeight, clientHeight } = el.readingScrollPane;
      if (scrollHeight <= clientHeight) return;
      const pct = Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100));
      if (pct > (art.progress || 0)) {
        art.progress = pct;
        el.currentProgressLabel.textContent = `${pct}%`;
        renderArticleLibrarySidebar();
      }
    });

    el.markReadCompleteBtn.addEventListener('click', () => {
      const art = getCurrentArticle();
      if (!art) return;
      art.progress = 100;
      el.currentProgressLabel.textContent = '100%';
      renderArticleLibrarySidebar();
      persistDatabase(true);
      showToast('👏 已將本篇法文文章標記為 100% 完讀！');
    });

    // Typography & Dark Mode controls
    el.fontDecBtn.addEventListener('click', () => updateFontSize(-2));
    el.fontIncBtn.addEventListener('click', () => updateFontSize(2));
    el.lineTightBtn.addEventListener('click', () => updateLineHeight(1.6));
    el.lineNormalBtn.addEventListener('click', () => updateLineHeight(1.85));
    el.lineLooseBtn.addEventListener('click', () => updateLineHeight(2.1));

    el.themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const nextTheme = currentTheme === 'dark' ? 'warm-paper' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      el.themeToggleBtn.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
      if (state.db && state.db.settings) {
        state.db.settings.theme = nextTheme;
        persistDatabase(false);
      }
    });

    // Upload Modal events
    const openUpload = () => el.uploadModal.classList.add('open');
    const closeUpload = () => el.uploadModal.classList.remove('open');
    el.openUploadModalBtn.addEventListener('click', openUpload);
    el.quickAddArticleBtn.addEventListener('click', openUpload);
    el.closeUploadModalBtn.addEventListener('click', closeUpload);
    el.cancelUploadBtn.addEventListener('click', closeUpload);

    el.importTabs.forEach(t => {
      t.addEventListener('click', () => {
        el.importTabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const mode = t.dataset.importTab;
        el.importPanePaste.style.display = mode === 'paste' ? 'block' : 'none';
        el.importPaneUrl.style.display = mode === 'url' ? 'block' : 'none';
      });
    });

    el.fileDropzone.addEventListener('click', () => el.fileUploadInput.click());
    el.fileUploadInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileRead(e.target.files[0]);
      }
    });
    el.fileDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.fileDropzone.style.borderColor = 'var(--accent-burgundy)';
    });
    el.fileDropzone.addEventListener('dragleave', () => {
      el.fileDropzone.style.borderColor = 'var(--border-strong)';
    });
    el.fileDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      el.fileDropzone.style.borderColor = 'var(--border-strong)';
      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        handleFileRead(e.dataTransfer.files[0]);
      }
    });

    el.saveArticleBtn.addEventListener('click', saveUploadedArticle);
    el.fetchUrlBtn.addEventListener('click', handleFetchArticleFromUrl);
    el.urlPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.articleUrlInput.value = btn.dataset.url;
        handleFetchArticleFromUrl();
      });
    });

    // Vocabulary View filters & export
    el.vocabSearchInput.addEventListener('input', renderVocabularyView);
    el.vocabColorFilter.addEventListener('change', renderVocabularyView);
    el.exportAnkiBtn.addEventListener('click', exportVocabularyToAnkiCsv);
    el.exportJsonBtn.addEventListener('click', exportFullDatabaseJson);

    // Flashcard controls
    el.fcBox.addEventListener('click', () => el.fcBox.classList.toggle('flipped'));
    el.fcFlipBtn.addEventListener('click', () => el.fcBox.classList.toggle('flipped'));
    el.fcPrevBtn.addEventListener('click', () => {
      state.flashcardIndex--;
      renderCurrentFlashcard();
    });
    el.fcNextBtn.addEventListener('click', () => {
      state.flashcardIndex++;
      renderCurrentFlashcard();
    });
    el.fcShuffleBtn.addEventListener('click', () => {
      initFlashcards(true);
      showToast('🔀 已隨機洗牌記憶卡順序');
    });
    el.fcMasteredBtn.addEventListener('click', () => {
      const vocab = state.db?.vocabulary || [];
      if (vocab.length === 0) return;
      const item = vocab[state.flashcardOrder[state.flashcardIndex]];
      if (item) {
        item.mastery = Math.min(3, (item.mastery || 0) + 1);
        persistDatabase(true);
      }
      state.flashcardIndex++;
      renderCurrentFlashcard();
      showToast('★ 已提升該單字熟練度！');
    });

    // Cloud Sync Modal events
    el.cloudSyncBtn.addEventListener('click', () => {
      const cfg = getGhConfig();
      el.ghRepoInput.value = cfg.repo;
      el.ghBranchInput.value = cfg.branch;
      el.ghTokenInput.value = cfg.token;
      el.syncModal.classList.add('open');
    });
    el.closeSyncModalBtn.addEventListener('click', () => el.syncModal.classList.remove('open'));

    el.saveSyncConfigBtn.addEventListener('click', () => {
      saveGhConfig({
        repo: el.ghRepoInput.value.trim() || 'dhang0317/my-project',
        branch: el.ghBranchInput.value.trim() || 'main',
        token: el.ghTokenInput.value.trim()
      });
      showToast('💾 已儲存 GitHub 雲端連線設定');
    });

    el.pushCloudNowBtn.addEventListener('click', async () => {
      saveGhConfig({
        repo: el.ghRepoInput.value.trim() || 'dhang0317/my-project',
        branch: el.ghBranchInput.value.trim() || 'main',
        token: el.ghTokenInput.value.trim()
      });
      await persistDatabase(true);
      showToast('☁️ 已執行 GitHub 雲端資料庫同步！');
    });

    el.pullCloudBtn.addEventListener('click', async () => {
      localStorage.removeItem(STORAGE_KEY);
      await loadDatabase();
      state.currentArticleId = state.db?.articles?.[0]?.id || null;
      renderArticleLibrarySidebar();
      renderCurrentArticle();
      renderArticleHighlightsSidebar();
      renderVocabularyView();
      showToast('⬇ 已從 GitHub 雲端重新載入最新書庫與生字本！');
    });
  }

  function updateFontSize(delta) {
    const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--reader-font-size'), 10) || 21;
    const next = Math.min(30, Math.max(16, current + delta));
    document.documentElement.style.setProperty('--reader-font-size', `${next}px`);
    el.fontSizeLabel.textContent = `${next}px`;
  }

  function updateLineHeight(val) {
    document.documentElement.style.setProperty('--reader-line-height', String(val));
  }

  async function initApp() {
    initDomRefs();
    bindEvents();
    await loadDatabase();

    if (state.db && Array.isArray(state.db.articles) && state.db.articles.length > 0) {
      state.currentArticleId = state.db.articles[0].id;
    }

    renderArticleLibrarySidebar();
    renderCurrentArticle();
    renderArticleHighlightsSidebar();
    renderVocabularyView();
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
