(function () {
  'use strict';

  const STORAGE_KEY = 'french_clean_reader_v6';

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

« Voici mon secret. Il est très simple : on ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux. »`,
      translation: `就在這時，狐狸出現了：

「你好」，狐狸說道。

「你好」，小王子很有禮貌地回答，他轉過身來，卻什麼也沒看見。

「我在這裡，」那個聲音說，「在蘋果樹下……」

「你是誰？」小王子說。「你好漂亮……」

「我是一隻狐狸」，狐狸說。

「來陪我玩吧，」小王子向牠提議，「我好難過……」

「我不能跟你一起玩，」狐狸說。「我還沒有被馴服。」

「啊！對不起」，小王子說。但是，想了想之後，他又問道：「『馴服』是什麼意思？」

「這是一件太常被遺忘的事了，」狐狸說。「意思就是『建立關係（羈絆）……』」

「建立關係？」

「當然，」狐狸說。「對我來說，你現在還只是一個小男孩，和千千萬萬個小男孩一模一樣。我不需要你，你也不需要我。對你而言，我只不過是一隻狐狸，和千千萬萬隻狐狸沒兩樣。但是，如果你馴服了我，我們就會彼此需要。對我來說，你就是世界上獨一無二的；對你來說，我也會是世界上獨一無二的……」

「這就是我的秘密。非常簡單：只有用心才能看得清楚。真正重要的事物，用眼睛是看不見的。」`
    },
    {
      id: 'paris-cafe',
      title: 'Les Cafés de Paris',
      content: `À Paris, le café n'est pas seulement un lieu où l'on boit un expresso rapide avant d'aller travailler. C'est une véritable institution sociale, un théâtre quotidien et un refuge pour l'esprit.

Dès le matin, les terrasses s'animent. Les serveurs, vêtus de leur tablier traditionnel, circulent avec une agilité remarquable entre les petites tables rondes. On y commande un café crème accompagné d'un croissant doré et croustillant, tout en feuilletant le journal du jour.

Aujourd'hui encore, s'asseoir en terrasse permet de ralentir le rythme effréné de la vie moderne. Que l'on soit seul avec un roman ou entouré d'amis, le café parisien demeure le symbole vivant de la convivialité française.`,
      translation: `在巴黎，咖啡館不僅僅是人們上班前快速喝一杯濃縮咖啡的地方。它是名副其實的社會文化象徵、每日上演的人間劇場，也是靈魂的心靈避風港。

清晨時分，露天咖啡座便熱鬧起來。身穿傳統黑白圍裙的服務生，身手矯健地穿梭在一張張小圓桌之間。人們點一杯鮮奶咖啡，配上一只金黃酥脆的可頌麵包，悠閒地翻閱著當天的日報。

時至今日，坐在露天座位上依然能讓人放慢現代生活急促緊湊的步調。無論是獨自手捧一本小說，或是與三五好友歡聚，巴黎咖啡館始終是法國親切好客與生活品味的鮮活代表。`
    }
  ];

  let articles = loadArticles();
  let currentId = articles[0].id;
  let currentFontSize = 23;
  let showTranslation = true;

  const articleSelect = document.getElementById('article-select');
  const articleTitle = document.getElementById('article-title');
  const articleBody = document.getElementById('article-body');
  const articleTranslation = document.getElementById('article-translation');
  const dualLayout = document.getElementById('dual-layout');
  const toggleSideTransBtn = document.getElementById('toggle-side-trans-btn');
  const closeTransColBtn = document.getElementById('close-trans-col-btn');

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

  // 渲染左側純法文 + 右側完整中文對照
  async function renderContent() {
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

    // 1. 渲染左側法文
    articleBody.innerHTML = paragraphs.map((para, idx) => {
      let safe = escapeHtml(para);
      const placeholders = [];

      phrases.forEach((phrase, pIdx) => {
        const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reg = new RegExp(`\\b(${escapedPhrase})\\b`, 'gi');
        if (reg.test(safe)) {
          const token = `__PHRASE_${pIdx}__`;
          safe = safe.replace(reg, (match) => {
            placeholders.push({
              token,
              html: `<span class="fr-word fr-phrase" data-w="${match}">${match}</span>`
            });
            return token;
          });
        }
      });

      safe = safe.replace(
        /([A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+(?:['’\-][A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+)*)/g,
        (match) => {
          if (match.startsWith('__PHRASE_')) return match;
          return `<span class="fr-word" data-w="${match}">${match}</span>`;
        }
      );

      for (const item of placeholders) {
        safe = safe.replace(item.token, item.html);
      }

      return `<p class="para-block" data-para-idx="${idx}">${safe}</p>`;
    }).join('');

    // 2. 渲染右側中文對照
    if (art.translation) {
      const transParas = art.translation.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      articleTranslation.innerHTML = transParas.map((tp, idx) =>
        `<p class="trans-para" data-para-idx="${idx}">${escapeHtml(tp)}</p>`
      ).join('');
    } else {
      // 若為自訂上傳文章且尚未有中文，顯示載入狀態並非同步批次翻譯整篇
      articleTranslation.innerHTML = paragraphs.map((_, idx) =>
        `<p class="trans-para" data-para-idx="${idx}" id="trans-p-${idx}">翻譯生成中...</p>`
      ).join('');

      autoTranslateFullArticle(art, paragraphs);
    }
  }

  // 分句安全翻譯函數（防止段落超過 500 字元引發 MyMemory 限制報錯）
  async function safeTranslateText(text) {
    const clean = (text || '').trim();
    if (!clean) return '';

    // 1. 優先使用 Google Translate（無 500 字元限制）
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=zh-TW&dt=t&q=${encodeURIComponent(clean)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data[0])) {
          const trans = data[0].map(s => s[0] || '').join('');
          if (trans && !trans.includes('QUERY LENGTH LIMIT')) {
            return trans;
          }
        }
      }
    } catch (_) {}

    // 2. 若必須使用 MyMemory，將文字以句號拆成每句 < 250 字元小段落逐句翻譯後拼接
    const sentences = clean.match(/[^.!?«»\n]+[.!?«»\n]*/g) || [clean];
    const transParts = [];

    for (const sent of sentences) {
      const s = sent.trim();
      if (!s) continue;
      let partZh = '';
      try {
        const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(s.slice(0, 300))}&langpair=fr|zh-TW`;
        const res = await fetch(mmUrl);
        if (res.ok) {
          const d = await res.json();
          const tText = d?.responseData?.translatedText || '';
          if (tText && !tText.includes('QUERY LENGTH LIMIT EXCEEDED')) {
            partZh = tText;
          }
        }
      } catch (_) {}
      transParts.push(partZh || s);
    }

    return transParts.join(' ');
  }

  // 自動非同步翻譯自訂文章為中文（逐段分句翻譯，絕對不超過字數限制）
  async function autoTranslateFullArticle(art, paragraphs) {
    const translatedList = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const pZh = await safeTranslateText(p);
      translatedList.push(pZh);
      const targetEl = document.getElementById(`trans-p-${i}`);
      if (targetEl) targetEl.textContent = pZh;
    }
    art.translation = translatedList.join('\n\n');
    saveArticles();
  }

  // 底部置底列單字/片語/選取翻譯
  async function performTranslation(text) {
    const clean = (text || '').trim();
    if (!clean) return;

    dockFr.textContent = clean.length > 50 ? clean.slice(0, 48) + '…' : clean;
    dockZh.textContent = '翻譯中...';
    dockLemma.style.display = 'none';
    dockPos.style.display = 'none';

    // 本地詞彙庫優先（零延遲）
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

    // 線上安全分句翻譯（保證不超過 500 字元長度限制）
    const trans = await safeTranslateText(clean);
    if (trans) {
      dockZh.textContent = trans;
    }
  }

  // 監聽事件
  function initEvents() {
    function setTranslationVisible(visible) {
      showTranslation = visible;
      if (showTranslation) {
        dualLayout.classList.add('show-translation');
        toggleSideTransBtn.classList.add('btn-main');
        toggleSideTransBtn.textContent = '收起中譯';
      } else {
        dualLayout.classList.remove('show-translation');
        toggleSideTransBtn.classList.remove('btn-main');
        toggleSideTransBtn.textContent = '顯示中譯';
      }
    }

    // 0. 切換右側中文翻譯欄開關（頂部按鈕 + 右欄右上角收起按鈕）
    toggleSideTransBtn.addEventListener('click', () => {
      setTranslationVisible(!showTranslation);
    });

    if (closeTransColBtn) {
      closeTransColBtn.addEventListener('click', () => {
        setTranslationVisible(false);
      });
    }

    // 1. 點擊法文單字 / 字組
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

      // 高亮對應段落
      const pEl = wEl.closest('.para-block');
      if (pEl) {
        const pIdx = pEl.dataset.paraIdx;
        document.querySelectorAll('.trans-para.hover-sync').forEach(el => el.classList.remove('hover-sync'));
        const matchTrans = document.querySelector(`.trans-para[data-para-idx="${pIdx}"]`);
        if (matchTrans) matchTrans.classList.add('hover-sync');
      }
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

    // 4. 深色切換
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
