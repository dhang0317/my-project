(function () {
  'use strict';

  const STORAGE_KEY = 'french_clean_reader_v4';

  const DEFAULT_ARTICLES = [
    {
      id: 'petit-prince',
      title: 'Le Petit Prince',
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

« Créer des liens ? »

« Bien sûr, dit le renard. Tu n'es encore pour moi qu'un petit garçon tout semblable à cent mille petits garçons. Et je n'ai pas besoin de toi. Et tu n'as pas besoin de moi non plus. Je ne suis pour toi qu'un renard semblable à cent mille renards. Mais, si tu m'apprivoises, nous aurons besoin l'un de l'autre. Tu seras pour moi unique au monde. Je serai pour toi unique au monde... »

« Voici mon secret. Il est très simple : on ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux. »`
    },
    {
      id: 'paris-cafe',
      title: 'Les Cafés de Paris',
      content: `À Paris, le café n'est pas seulement un lieu où l'on boit un expresso rapide avant d'aller travailler. C'est une véritable institution sociale, un théâtre quotidien et un refuge pour l'esprit.

Dès le matin, les terrasses s'animent. Les serveurs, vêtus de leur tablier traditionnel, circulent avec une agilité remarquable entre les petites tables rondes. On y commande un café crème accompagné d'un croissant doré et croustillant, tout en feuilletant le journal du jour.

Aujourd'hui encore, s'asseoir en terrasse permet de ralentir le rythme effréné de la vie moderne. Que l'on soit seul avec un roman ou entouré d'amis, le café parisien demeure le symbole vivant de la convivialité française.`
    }
  ];

  let articles = loadArticles();
  let currentId = articles[0].id;
  let currentFontSize = 24;

  const articleSelect = document.getElementById('article-select');
  const articleTitle = document.getElementById('article-title');
  const articleBody = document.getElementById('article-body');

  const dockFr = document.getElementById('dock-fr');
  const dockLemma = document.getElementById('dock-lemma');
  const dockPos = document.getElementById('dock-pos');
  const dockZh = document.getElementById('dock-zh');
  const dockTranslateBtn = document.getElementById('dock-translate-btn');

  const uploadModal = document.getElementById('upload-modal');
  const openUploadBtn = document.getElementById('open-upload-btn');
  const closeUploadBtn = document.getElementById('close-upload-btn');
  const saveArticleBtn = document.getElementById('save-article-btn');
  const fileInput = document.getElementById('file-input');
  const inputTitle = document.getElementById('input-title');
  const inputContent = document.getElementById('input-content');

  const fontBtn = document.getElementById('font-btn');
  const themeBtn = document.getElementById('theme-btn');

  function loadArticles() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_ARTICLES;
  }

  function saveArticles() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
    } catch (_) {}
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getCurrent() {
    return articles.find(a => a.id === currentId) || articles[0];
  }

  function renderDropdown() {
    articleSelect.innerHTML = articles.map(a =>
      `<option value="${escapeHtml(a.id)}" ${a.id === currentId ? 'selected' : ''}>${escapeHtml(a.title)}</option>`
    ).join('');
  }

  // 渲染內文：自動識別「慣用字組／片語」（例如：Bien sûr, créer des liens, tout de suite）連成一組翻譯
  function renderContent() {
    const art = getCurrent();
    currentId = art.id;
    articleTitle.textContent = art.title;

    const phrases = window.FrenchAnalyzer && window.FrenchAnalyzer.COMMON_PHRASES
      ? Object.keys(window.FrenchAnalyzer.COMMON_PHRASES).sort((a, b) => b.length - a.length)
      : ["bien sûr", "d'accord", "tout de suite", "créer des liens", "l'un de l'autre", "unique au monde", "en fait", "au fait", "par exemple", "tout à fait", "grâce à", "à cause de", "il y a"];

    const paragraphs = (art.content || '')
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    articleBody.innerHTML = paragraphs.map(para => {
      let safe = escapeHtml(para);
      const placeholders = [];

      // 先抓出常見字組 (Phrases/Idioms)
      phrases.forEach((phrase, idx) => {
        const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reg = new RegExp(`\\b(${escapedPhrase})\\b`, 'gi');
        if (reg.test(safe)) {
          const token = `__PHRASE_${idx}__`;
          safe = safe.replace(reg, (match) => {
            placeholders.push({
              token,
              html: `<span class="fr-word fr-phrase" data-w="${match}">${match}</span>`
            });
            return token;
          });
        }
      });

      // 其餘單字包裹成單詞單元
      safe = safe.replace(
        /([A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+(?:['’\-][A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+)*)/g,
        (match) => {
          if (match.startsWith('__PHRASE_')) return match;
          return `<span class="fr-word" data-w="${match}">${match}</span>`;
        }
      );

      // 還原字組
      for (const item of placeholders) {
        safe = safe.replace(item.token, item.html);
      }

      return `<p class="para-block">${safe}</p>`;
    }).join('');
  }

  // 翻譯核心函數
  async function performTranslation(text) {
    const clean = (text || '').trim();
    if (!clean) return;

    dockFr.textContent = clean.length > 50 ? clean.slice(0, 48) + '…' : clean;
    dockZh.textContent = '翻譯中...';
    dockLemma.style.display = 'none';
    dockPos.style.display = 'none';

    // 本地詞法庫優先（零延遲）
    if (window.FrenchAnalyzer) {
      const analysis = window.FrenchAnalyzer.analyzeSelection(clean, '');
      const morph = analysis.primaryMorph;
      if (morph) {
        if (morph.lemma) {
          dockLemma.textContent = `原形: ${morph.lemma}`;
          dockLemma.style.display = 'inline-block';
        }
        if (morph.pos) {
          dockPos.textContent = morph.pos;
          dockPos.style.display = 'inline-block';
        }
        if (morph.zhHint) {
          dockZh.textContent = morph.zhHint;
        }
      }
    }

    // 線上免費翻譯
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=zh-TW&dt=t&q=${encodeURIComponent(clean)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data[0])) {
          const trans = data[0].map(s => s[0] || '').join('');
          if (trans) {
            dockZh.textContent = trans;
            return;
          }
        }
      }
    } catch (_) {}

    // 備援翻譯
    try {
      const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=fr|zh-TW`;
      const res = await fetch(mmUrl);
      if (res.ok) {
        const data = await res.json();
        if (data?.responseData?.translatedText) {
          dockZh.textContent = data.responseData.translatedText;
        }
      }
    } catch (_) {}
  }

  // 監聽事件
  function initEvents() {
    // 1. 點擊法文單字
    articleBody.addEventListener('click', (e) => {
      const wEl = e.target.closest('.fr-word');
      if (!wEl) return;

      const sel = window.getSelection();
      const selStr = sel ? sel.toString().trim() : '';
      if (selStr.length > wEl.textContent.trim().length + 2) {
        performTranslation(selStr);
        return;
      }

      articleBody.querySelectorAll('.fr-word.active-word').forEach(el => el.classList.remove('active-word'));
      wEl.classList.add('active-word');
      performTranslation(wEl.dataset.w || wEl.textContent);
    });

    // 2. 反白選取文字（支援 iPad 手指長按拉選與電腦選取）
    let selTimer = null;
    function handleSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        dockTranslateBtn.style.display = 'none';
        return;
      }
      const text = sel.toString().trim();
      if (text.length >= 2 && text.length <= 1500) {
        dockTranslateBtn.style.display = 'inline-block';
        performTranslation(text);
      }
    }

    document.addEventListener('selectionchange', () => {
      if (selTimer) clearTimeout(selTimer);
      selTimer = setTimeout(handleSelection, 200);
    });

    articleBody.addEventListener('touchend', () => {
      setTimeout(handleSelection, 120);
    }, { passive: true });

    articleBody.addEventListener('mouseup', () => {
      setTimeout(handleSelection, 40);
    });

    dockTranslateBtn.addEventListener('click', () => {
      const sel = window.getSelection();
      if (sel) {
        const t = sel.toString().trim();
        if (t) performTranslation(t);
      }
    });

    // 3. 切換文章
    articleSelect.addEventListener('change', (e) => {
      currentId = e.target.value;
      renderContent();
    });

    // 4. 字級切換
    fontBtn.addEventListener('click', () => {
      currentFontSize = currentFontSize >= 30 ? 20 : currentFontSize + 2;
      document.documentElement.style.setProperty('--font-size', `${currentFontSize}px`);
    });

    // 5. 深色切換
    themeBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
      themeBtn.textContent = isDark ? '深色' : '淺色';
    });

    // 6. 上傳文章
    openUploadBtn.addEventListener('click', () => uploadModal.classList.add('open'));
    closeUploadBtn.addEventListener('click', () => uploadModal.classList.remove('open'));

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        inputTitle.value = file.name.replace(/\.(txt|md)$/i, '');
        inputContent.value = String(ev.target?.result || '').trim();
      };
      reader.readAsText(file, 'UTF-8');
    });

    saveArticleBtn.addEventListener('click', () => {
      const title = inputTitle.value.trim() || '自訂文章';
      const content = inputContent.value.trim();
      if (!content) {
        alert('請輸入或上傳法文內文');
        return;
      }
      const newArt = { id: 'art-' + Date.now(), title, content };
      articles.unshift(newArt);
      currentId = newArt.id;
      saveArticles();
      renderDropdown();
      renderContent();
      inputTitle.value = '';
      inputContent.value = '';
      uploadModal.classList.remove('open');
    });
  }

  renderDropdown();
  renderContent();
  initEvents();
})();
