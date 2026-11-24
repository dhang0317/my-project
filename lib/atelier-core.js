const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const FrenchAnalyzer = require('../js/french-analyzer.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'data', 'library.json');

function runGit(args) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: ROOT_DIR }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(stderr || err.message));
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function readLibrary() {
  const content = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(content);
}

async function saveLibrary(dbData, { syncToGithub = false } = {}) {
  dbData.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), 'utf8');

  let gitStatus = { synced: false, message: '已儲存至本地 data/library.json' };
  if (syncToGithub) {
    try {
      await runGit(['add', 'data/library.json']);
      const statusOut = await runGit(['status', '--porcelain', 'data/library.json']);
      if (statusOut.stdout) {
        await runGit([
          'commit',
          '-m',
          `chore(db): sync French reading library & vocabulary (${new Date().toISOString().slice(0, 19)})`
        ]);
        await runGit(['push', 'origin', 'HEAD']);
        gitStatus = {
          synced: true,
          message: '已同步備份並推送至 GitHub 雲端儲存庫 (dhang0317/my-project)'
        };
      } else {
        gitStatus = { synced: true, message: 'GitHub 雲端資料庫已是最新狀態' };
      }
    } catch (gitErr) {
      gitStatus = {
        synced: false,
        message: `已存檔於本地伺服器（Git 推送提示：${gitErr.message.slice(0, 100)}）`
      };
    }
  }

  return {
    ok: true,
    lastUpdated: dbData.lastUpdated,
    gitStatus
  };
}

/**
 * Translate French text to Traditional Chinese using free public endpoints
 * + local FrenchAnalyzer morphological & grammar enrichment
 */
async function translateFrench(text, contextSentence = '') {
  const analysis = FrenchAnalyzer.analyzeSelection(text, contextSentence);
  let primaryTranslation = '';
  let dictEntries = [];
  let contextTranslation = '';

  // 1. Fetch translation for selected text
  try {
    const gtUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=zh-TW&dt=t&dt=bd&q=${encodeURIComponent(text)}`;
    const resp = await fetch(gtUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
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
  } catch (err) {
    // Fallback to MyMemory if needed
    try {
      const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|zh-TW`;
      const resp = await fetch(mmUrl);
      if (resp.ok) {
        const data = await resp.json();
        primaryTranslation = (data.responseData && data.responseData.translatedText) || '';
      }
    } catch (_) {}
  }

  // If word mode has a curated zhHint and primaryTranslation is empty, use zhHint
  if (analysis.mode === 'word' && analysis.primaryMorph && analysis.primaryMorph.zhHint) {
    if (!primaryTranslation) {
      primaryTranslation = analysis.primaryMorph.zhHint;
    }
  }

  // 2. If word mode and a different lemma exists, also translate the infinitive/lemma
  let lemmaTranslation = '';
  if (
    analysis.mode === 'word' &&
    analysis.primaryMorph &&
    analysis.primaryMorph.lemma &&
    analysis.primaryMorph.lemma.toLowerCase() !== analysis.primaryMorph.cleanWord.toLowerCase()
  ) {
    try {
      const lemmaUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=zh-TW&dt=t&dt=bd&q=${encodeURIComponent(analysis.primaryMorph.lemma)}`;
      const lResp = await fetch(lemmaUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (lResp.ok) {
        const lData = await lResp.json();
        if (Array.isArray(lData[0])) {
          lemmaTranslation = lData[0].map(seg => seg[0] || '').join('');
        }
        if (dictEntries.length === 0 && Array.isArray(lData[1])) {
          dictEntries = lData[1].map(posBlock => ({
            pos: posBlock[0],
            terms: Array.isArray(posBlock[1]) ? posBlock[1].slice(0, 6) : []
          }));
        }
      }
    } catch (_) {}
  }

  // 3. Translate contextSentence if provided and distinct from selected text
  if (contextSentence && contextSentence.trim() !== text.trim() && contextSentence.length < 600) {
    try {
      const ctxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=zh-TW&dt=t&q=${encodeURIComponent(contextSentence)}`;
      const cResp = await fetch(ctxUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (cResp.ok) {
        const cData = await cResp.json();
        if (Array.isArray(cData[0])) {
          contextTranslation = cData[0].map(seg => seg[0] || '').join('');
        }
      }
    } catch (_) {}
  }

  return {
    text,
    translation: primaryTranslation || '（無法取得自動翻譯，請參考下方語法解析）',
    lemmaTranslation,
    dictEntries,
    contextSentence,
    contextTranslation,
    analysis
  };
}

/**
 * Decode HTML entities and strip HTML tags to extract clean French article paragraphs
 */
function extractArticleFromHtml(html, sourceUrl) {
  let title = '';
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (ogTitleMatch) {
    title = ogTitleMatch[1];
  } else if (titleTagMatch) {
    title = titleTagMatch[1].replace(/\s*[-|—–].*$/, '');
  }

  function decodeEntities(str) {
    return str
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&laquo;/gi, '«')
      .replace(/&raquo;/gi, '»')
      .replace(/&rsquo;/gi, '’')
      .replace(/&lsquo;/gi, '‘')
      .replace(/&ldquo;/gi, '“')
      .replace(/&rdquo;/gi, '”')
      .replace(/&ndash;/gi, '–')
      .replace(/&mdash;/gi, '—')
      .replace(/&hellip;/gi, '…')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  title = decodeEntities(title).trim() || 'Article Français Importé';

  let cleaned = html
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form|iframe)[^>]*>[\s\S]*?<\/\1>/gi, ' ');

  const articleMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    || cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (articleMatch && articleMatch[1].length > 400) {
    cleaned = articleMatch[1];
  }

  const pMatches = [...cleaned.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)];
  const paragraphs = [];

  for (const match of pMatches) {
    let text = match[1]
      .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\[\d+\]/g, '');
    text = decodeEntities(text).replace(/\s+/g, ' ').trim();
    if (text.length >= 45 && !/^(cookies?|publicité|abonnez-vous|lire aussi)/i.test(text)) {
      paragraphs.push(text);
    }
    if (paragraphs.length >= 25) break;
  }

  if (paragraphs.length === 0) {
    throw new Error('無法從該網址擷取足夠的法文正文段落，建議直接複製貼上文章內容。');
  }

  let domain = '';
  try {
    domain = new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch (_) {
    domain = '網頁匯入';
  }

  return {
    title,
    subtitle: `${domain} · 網址自動擷取`,
    category: '網路文章',
    sourceUrl,
    content: paragraphs.join('\n\n')
  };
}

async function fetchArticleFromUrl(targetUrl) {
  const cleanUrl = (targetUrl || '').trim();
  if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('請輸入有效的 http:// 或 https:// 網址');
  }

  const wikiMatch = cleanUrl.match(/fr\.wikipedia\.org\/wiki\/([^#?]+)/i);
  if (wikiMatch) {
    const pageTitle = wikiMatch[1];
    const htmlResp = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/html/${pageTitle}`, {
      headers: { 'User-Agent': 'AtelierDeLecture/1.0' }
    }).catch(() => null);
    const targetResp = (htmlResp && htmlResp.ok)
      ? htmlResp
      : await fetch(cleanUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await targetResp.text();
    return extractArticleFromHtml(html, cleanUrl);
  }

  const resp = await fetch(cleanUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml'
    }
  });
  if (!resp.ok) {
    throw new Error(`無法讀取目標網頁 (HTTP ${resp.status})`);
  }
  const html = await resp.text();
  return extractArticleFromHtml(html, cleanUrl);
}

module.exports = {
  ROOT_DIR,
  DB_PATH,
  runGit,
  readLibrary,
  saveLibrary,
  translateFrench,
  extractArticleFromHtml,
  fetchArticleFromUrl
};
