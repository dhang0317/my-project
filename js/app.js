/**
 * 法文閱讀翻譯器 — 極簡穩定版 (專為 iPad / 手機 Safari 與電腦最佳化)
 * 1. 內建完整預設文章，無需依賴網路 fetch 即可秒開顯示
 * 2. 支援 iPad「直接手指點一下單字」立即顯示中文翻譯與動詞原形
 * 3. 支援 iPad「長按反白選取文字」自動偵測 + 底部固定翻譯按鈕
 * 4. 支援每段「整段中譯」一鍵雙語對照
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'atelier_simple_db_v3';

  // 內建預設文章與生字（確保 GitHub Pages 與離線 100% 瞬間載入）
  const DEFAULT_DB = {
    articles: [
      {
        id: 'art-petit-prince',
        title: 'Le Petit Prince — 小王子與狐狸',
        content: `C'est alors qu'apparut le renard :

« Bonjour », dit le renard.

« Bonjour », répondit poliment le petit prince, qui se retourna mais ne vit rien.

« Je suis là, dit la voix, sous le pommier... »

« Qui es-tu ? dit le petit prince. Tu es bien joli... »

« Je suis un renard », dit le renard.

« Viens jouer avec moi, lui proposa le petit prince. Je suis tellement triste... »

« Je ne puis pas jouer avec toi, dit le renard. Je ne suis pas apprivoisé. »

« Ah ! pardon », fit le petit prince. Mais, après réflexion, il ajouta : « Qu'est-ce que signifie "apprivoiser" ? »

« C'est une chose trop oubliée, dit le renard. Ça signifie "créer des liens..." »

« Voici mon secret. Il est très simple : on ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux. »`,
        highlights: ['apprivoisé', 'renard', 'cœur', 'essentiel', 'invisible']
      },
      {
        id: 'art-cafe',
        title: 'Les Cafés Parisiens — 巴黎咖啡館文化',
        content: `À Paris, le café n'est pas seulement un lieu où l'on boit un expresso rapide avant d'aller travailler. C'est une véritable institution sociale, un théâtre quotidien et un refuge pour l'esprit.

Dès le matin, les terrasses s'animent. On y commande un café crème accompagné d'un croissant doré et croustillant, tout en feuilletant le journal du jour.

Aujourd'hui encore, s'asseoir en terrasse permet de ralentir le rythme effréné de la vie moderne. Le café parisien demeure le symbole vivant de la convivialité française.`,
        highlights: ['croustillant', 'feuilletant', 'convivialité']
      }
    ],
    vocabulary: [
      { word: 'apprivoisé', lemma: 'apprivoiser', pos: '過去分詞/形容詞', zh: '被馴養的、建立羈絆的' },
      { word: 'renard', lemma: 'renard', pos: '陽性名詞 (n.m.)', zh: '狐狸' },
      { word: 'croustillant', lemma: 'croustillant', pos: '形容詞', zh: '酥脆的、香脆的' }
    ]
  };

  let db = loadDb();
  let currentArticleId = db.articles[0].id;
  let currentActiveItem = null; // { text, lemma, pos, zh }
  let fontSize = 23;

  // DOM 元件
  const articleSelect = document.getElementById('article-select');
  const articleTitle = document.getElementById('article-title');
  const articleBody = document.getElementById('article-body');
  const vocabCount = document.getElementById('vocab-count');

  const dockFrText = document.getElementById('dock-fr-text');
  const dockLemmaBadge = document.getElementById('dock-lemma-badge');
  const dockPosBadge = document.getElementById('dock-pos-badge');
  const dockZhText = document.getElementById('dock-zh-text');
  const dockExtraNote = document.getElementById('dock-extra-note');
  const translateSelectionBtn = document.getElementById('translate-selection-btn');
  const saveWordBtn = document.getElementById('save-word-btn');

  const uploadModal = document.getElementById('upload-modal');
  const vocabModal = document.getElementById('vocab-modal');

  function loadDb() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.articles) && parsed.articles.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  function saveDb() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (_) {}
    vocabCount.textContent = (db.vocabulary || []).length;

    // 若在本地開發伺服器，同步備份至後端 data/library.json
    fetch('api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: db, syncToGithub: true })
    }).catch(() => {});
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getCurrentArticle() {
    return db.articles.find(a => a.id === currentArticleId) || db.articles[0];
  }

  // 渲染頂部文章下拉選單
  function renderArticlePicker() {
    articleSelect.innerHTML = db.articles.map(a =>
      `<option value="${escapeHtml(a.id)}" ${a.id === currentArticleId ? 'selected' : ''}>📖 ${escapeHtml(a.title)}</option>`
    ).join('');
    vocabCount.textContent = (db.vocabulary || []).length;
  }

  // 將法文段落拆成可點擊的單字 <span class="fr-word">
  function renderArticle() {
    const art = getCurrentArticle();
    if (!art) return;
    currentArticleId = art.id;
    articleTitle.textContent = art.title;

    const hlSet = new Set((art.highlights || []).map(w => w.toLowerCase()));
    const paragraphs = (art.content || '')
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    articleBody.innerHTML = paragraphs.map((para, pIdx) => {
      const safePara = escapeHtml(para);
      // 將每個法文單字（包含省音如 l'esprit, qu'avec, c'est）包成可點擊 span
      const tokenized = safePara.replace(
        /([A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+(?:['’\-][A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+)*)/g,
        (match) => {
          const cleanLower = match.toLowerCase().replace(/^(c|d|j|l|m|n|qu|s|t)['’]/i, '');
          const isSaved = hlSet.has(match.toLowerCase()) || hlSet.has(cleanLower);
          return `<span class="fr-word ${isSaved ? 'saved-hl' : ''}" data-word="${match}">${match}</span>`;
        }
      );

      return `
        <div class="fr-para" data-p-idx="${pIdx}">
          <div class="fr-para-text">${tokenized} <button type="button" class="para-btn" data-para-idx="${pIdx}">整段中譯</button></div>
          <div id="para-zh-${pIdx}" class="para-zh-box" style="display: none;"></div>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // 翻譯引擎（結合本地法文變位字典 + Google GTX + MyMemory 雙重備援）
  // ==========================================================================
  async function translateFrenchText(rawText) {
    const clean = (rawText || '').replace(/整段中譯/g, '').trim();
    if (!clean) return null;

    const analysis = window.FrenchAnalyzer
      ? window.FrenchAnalyzer.analyzeSelection(clean, '')
      : { mode: 'word', primaryMorph: { lemma: clean, pos: '法文詞彙', morphology: '', zhHint: '' } };

    const morph = analysis.primaryMorph || {};
    let zh = morph.zhHint || '';

    // 1. 嘗試 Google Translate 公開端點
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=zh-TW&dt=t&q=${encodeURIComponent(clean)}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data[0])) {
          const apiZh = data[0].map(s => s[0] || '').join('');
          if (apiZh) {
            zh = (morph.zhHint && morph.zhHint !== apiZh && analysis.mode === 'word')
              ? `${apiZh}（${morph.zhHint}）`
              : apiZh;
          }
        }
      }
    } catch (_) {}

    // 2. 若 iPad Safari 阻擋，自動切換 MyMemory 翻譯 API
    if (!zh) {
      try {
        const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=fr|zh-TW`;
        const mmResp = await fetch(mmUrl);
        if (mmResp.ok) {
          const mmData = await mmResp.json();
          zh = mmData?.responseData?.translatedText || '';
        }
      } catch (_) {}
    }

    return {
      text: clean,
      mode: analysis.mode,
      lemma: morph.lemma || clean,
      pos: morph.pos || (analysis.mode === 'sentence' ? '整句/段落' : '單字'),
      morphology: morph.morphology || '',
      elision: morph.elision || '',
      zh: zh || '（請參考原形與詞性解析）'
    };
  }

  // 在底部固定面板顯示翻譯結果
  async function showTranslationInDock(text) {
    const clean = (text || '').replace(/整段中譯/g, '').trim();
    if (!clean) return;

    dockFrText.textContent = clean.length > 75 ? clean.slice(0, 72) + '…' : clean;
    dockZhText.textContent = '⏳ 正在翻譯成繁體中文...';
    dockLemmaBadge.style.display = 'none';
    dockPosBadge.style.display = 'none';
    dockExtraNote.style.display = 'none';
    saveWordBtn.style.display = 'inline-block';

    // 先顯示本地秒開詞根與變位資訊
    if (window.FrenchAnalyzer) {
      const instant = window.FrenchAnalyzer.analyzeSelection(clean, '');
      if (instant.primaryMorph) {
        dockLemmaBadge.textContent = `原形: ${instant.primaryMorph.lemma}`;
        dockLemmaBadge.style.display = 'inline-block';
        dockPosBadge.textContent = instant.primaryMorph.pos;
        dockPosBadge.style.display = 'inline-block';
        if (instant.primaryMorph.zhHint) {
          dockZhText.textContent = instant.primaryMorph.zhHint;
        }
      }
    }

    const res = await translateFrenchText(clean);
    if (!res) return;

    currentActiveItem = res;
    dockZhText.textContent = res.zh;

    if (res.mode === 'word') {
      dockLemmaBadge.textContent = `原形: ${res.lemma}`;
      dockLemmaBadge.style.display = 'inline-block';
      dockPosBadge.textContent = res.pos;
      dockPosBadge.style.display = 'inline-block';
      const notes = [res.morphology, res.elision].filter(Boolean).join(' ｜ ');
      if (notes) {
        dockExtraNote.textContent = notes;
        dockExtraNote.style.display = 'block';
      }
    } else {
      dockLemmaBadge.textContent = '整句翻譯';
      dockLemmaBadge.style.display = 'inline-block';
    }
  }

  // ==========================================================================
  // 事件綁定（iPad 觸控點字 + 長按反白 + 整段雙語）
  // ==========================================================================
  function bindEvents() {
    // 1. 點擊文章中的任一法文單字 (.fr-word) 或「整段中譯」按鈕 (.para-btn)
    articleBody.addEventListener('click', async (e) => {
      const paraBtn = e.target.closest('.para-btn');
      if (paraBtn) {
        e.stopPropagation();
        const pIdx = paraBtn.dataset.paraIdx;
        const art = getCurrentArticle();
        const paragraphs = (art.content || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        const paraText = paragraphs[pIdx];
        const zhBox = document.getElementById(`para-zh-${pIdx}`);
        if (!paraText || !zhBox) return;

        if (zhBox.style.display === 'block') {
          zhBox.style.display = 'none';
          paraBtn.textContent = '整段中譯';
          return;
        }

        zhBox.style.display = 'block';
        zhBox.textContent = '⏳ 正在翻譯此段落...';
        paraBtn.textContent = '收起中譯';
        showTranslationInDock(paraText);

        const res = await translateFrenchText(paraText);
        zhBox.textContent = res ? res.zh : '無法取得翻譯';
        return;
      }

      const wordEl = e.target.closest('.fr-word');
      if (wordEl) {
        // 若使用者正在拉動長段反白，交由反白處理
        const sel = window.getSelection();
        const selText = sel ? sel.toString().replace(/整段中譯/g, '').trim() : '';
        if (selText.length > wordEl.textContent.length + 3) {
          showTranslationInDock(selText);
          return;
        }

        articleBody.querySelectorAll('.fr-word.selected-word').forEach(el => el.classList.remove('selected-word'));
        wordEl.classList.add('selected-word');
        const word = wordEl.dataset.word || wordEl.textContent.trim();
        showTranslationInDock(word);
      }
    });

    // 2. 支援 iPad / 手機 / 電腦「反白選取文字」自動偵測
    let selTimer = null;
    function checkTextSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        translateSelectionBtn.style.display = 'none';
        return;
      }
      const text = sel.toString().replace(/整段中譯|收起中譯/g, '').trim();
      if (text.length >= 2 && text.length <= 1200) {
        // 顯示明確的「翻譯目前反白文字」按鈕，同時自動開始翻譯
        translateSelectionBtn.style.display = 'inline-block';
        showTranslationInDock(text);
      }
    }

    document.addEventListener('selectionchange', () => {
      if (selTimer) clearTimeout(selTimer);
      selTimer = setTimeout(checkTextSelection, 220);
    });

    articleBody.addEventListener('touchend', () => {
      setTimeout(checkTextSelection, 150);
    }, { passive: true });

    articleBody.addEventListener('mouseup', () => {
      setTimeout(checkTextSelection, 40);
    });

    translateSelectionBtn.addEventListener('click', () => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().replace(/整段中譯|收起中譯/g, '').trim() : '';
      if (text) showTranslationInDock(text);
    });

    // 3. 標記螢光筆＋存入生字本
    saveWordBtn.addEventListener('click', () => {
      if (!currentActiveItem) return;
      const art = getCurrentArticle();
      if (!Array.isArray(art.highlights)) art.highlights = [];
      if (!art.highlights.includes(currentActiveItem.text)) {
        art.highlights.push(currentActiveItem.text);
      }

      if (!Array.isArray(db.vocabulary)) db.vocabulary = [];
      const exists = db.vocabulary.some(v => v.word.toLowerCase() === currentActiveItem.text.toLowerCase());
      if (!exists) {
        db.vocabulary.unshift({
          word: currentActiveItem.text,
          lemma: currentActiveItem.lemma,
          pos: currentActiveItem.pos,
          zh: currentActiveItem.zh
        });
      }

      saveDb();
      renderArticle();
      saveWordBtn.textContent = '✓ 已標記並存入生字本！';
      setTimeout(() => {
        saveWordBtn.textContent = '🖍️ 標記螢光筆＋存生字';
      }, 1500);
    });

    // 4. 切換文章
    articleSelect.addEventListener('change', (e) => {
      currentArticleId = e.target.value;
      renderArticle();
    });

    // 5. 字體大小與深色模式
    document.getElementById('font-size-btn').addEventListener('click', () => {
      fontSize = fontSize >= 29 ? 19 : fontSize + 2;
      document.documentElement.style.setProperty('--reader-size', `${fontSize}px`);
    });

    document.getElementById('theme-btn').addEventListener('click', (e) => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      document.documentElement.setAttribute('data-theme', isDark ? 'warm-paper' : 'dark');
      e.currentTarget.textContent = isDark ? '🌙' : '☀️';
    });

    // 6. 上傳 / 貼上法文文章彈窗
    document.getElementById('open-upload-btn').addEventListener('click', () => {
      uploadModal.classList.add('open');
    });
    document.getElementById('close-upload-btn').addEventListener('click', () => {
      uploadModal.classList.remove('open');
    });

    document.getElementById('file-input').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('input-title').value = file.name.replace(/\.(txt|md)$/i, '');
        document.getElementById('input-content').value = String(ev.target?.result || '').trim();
      };
      reader.readAsText(file, 'UTF-8');
    });

    document.getElementById('fetch-url-btn').addEventListener('click', async () => {
      const urlVal = document.getElementById('input-url').value.trim();
      const statusEl = document.getElementById('url-status');
      if (!urlVal) {
        statusEl.textContent = '請輸入有效的法文網址';
        return;
      }
      statusEl.textContent = '⏳ 正在抓取網址內文...';
      try {
        const wikiMatch = urlVal.match(/fr\.wikipedia\.org\/wiki\/([^#?]+)/i);
        if (wikiMatch) {
          const r = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${wikiMatch[1]}`);
          if (r.ok) {
            const d = await r.json();
            document.getElementById('input-title').value = d.title || 'Wikipédia';
            document.getElementById('input-content').value = d.extract || '';
            statusEl.textContent = '✓ 已成功抓取維基百科法文內容，請點擊下方按鈕開始閱讀！';
            return;
          }
        }
        const apiResp = await fetch('api/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlVal })
        });
        if (apiResp.ok) {
          const d = await apiResp.json();
          document.getElementById('input-title').value = d.title || '';
          document.getElementById('input-content').value = d.content || '';
          statusEl.textContent = '✓ 已成功抓取法文內文！';
        } else {
          throw new Error('請直接複製貼上法文內文');
        }
      } catch (err) {
        statusEl.textContent = '⚠️ 該網站限制跨網域讀取，請直接複製法文段落貼到上方文字框。';
      }
    });

    document.getElementById('save-article-btn').addEventListener('click', () => {
      const title = document.getElementById('input-title').value.trim() || `法文文章 (${new Date().toLocaleDateString()})`;
      const content = document.getElementById('input-content').value.trim();
      if (!content) {
        alert('請先貼上法文文章內容或選擇檔案！');
        return;
      }
      const newArt = {
        id: 'art-' + Date.now(),
        title,
        content,
        highlights: []
      };
      db.articles.unshift(newArt);
      currentArticleId = newArt.id;
      saveDb();
      renderArticlePicker();
      renderArticle();
      document.getElementById('input-title').value = '';
      document.getElementById('input-content').value = '';
      uploadModal.classList.remove('open');
    });

    // 7. 生字本彈窗與匯出
    document.getElementById('open-vocab-btn').addEventListener('click', () => {
      renderVocabModal();
      vocabModal.classList.add('open');
    });
    document.getElementById('close-vocab-btn').addEventListener('click', () => {
      vocabModal.classList.remove('open');
    });

    document.getElementById('export-csv-btn').addEventListener('click', () => {
      const list = db.vocabulary || [];
      if (list.length === 0) return;
      const rows = ['法文,原形,詞性,中文翻譯'];
      list.forEach(v => {
        rows.push(`"${v.word}","${v.lemma}","${v.pos}","${v.zh}"`);
      });
      const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'french-vocabulary.csv';
      a.click();
    });
  }

  function renderVocabModal() {
    const listEl = document.getElementById('vocab-list');
    const list = db.vocabulary || [];
    if (list.length === 0) {
      listEl.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">尚未收藏生字。點擊文章單字後按「標記螢光筆＋存生字」即可加入！</div>';
      return;
    }
    listEl.innerHTML = list.map((v, idx) => `
      <div class="vocab-item">
        <div>
          <div style="font-family: var(--font-fr); font-size: 21px; font-weight: 700; color: var(--accent-burgundy);">
            ${escapeHtml(v.word)}
            <span style="font-size: 13px; color: var(--text-sub); font-family: var(--font-ui); font-weight: 500;">
              （原形: ${escapeHtml(v.lemma)} · ${escapeHtml(v.pos)}）
            </span>
          </div>
          <div style="font-size: 16px; font-weight: 600; margin-top: 3px;">${escapeHtml(v.zh)}</div>
        </div>
        <button type="button" class="btn del-voc-btn" data-idx="${idx}" style="padding: 4px 10px; font-size: 12px;">刪除</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.del-voc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        db.vocabulary.splice(idx, 1);
        saveDb();
        renderVocabModal();
      });
    });
  }

  // 啟動執行
  renderArticlePicker();
  renderArticle();
  bindEvents();
})();
