#!/usr/bin/env node
/**
 * L'Atelier de Lecture — MCP (Model Context Protocol) Server
 * Zero-dependency JSON-RPC 2.0 over stdio implementation.
 *
 * Allows AI assistants (Claude Desktop, Cursor, Windsurf, VS Code, etc.)
 * to read/write French articles, highlights, vocabulary, and run
 * French-to-Traditional-Chinese translation & grammar analysis.
 */

const readline = require('readline');
const {
  readLibrary,
  saveLibrary,
  translateFrench,
  fetchArticleFromUrl
} = require('./lib/atelier-core.js');

const SERVER_INFO = {
  name: 'atelier-de-lecture',
  version: '1.0.0'
};

const SUPPORTED_PROTOCOL_VERSION = '2024-11-05';

const TOOLS = [
  {
    name: 'list_articles',
    description: '列出 L\'Atelier de Lecture 書庫中的所有法文文章摘要（含 ID、標題、分類、閱讀進度、螢光筆數量）。',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: '可選：依文章分類篩選（例如「文學經典」、「文化生活」、「新聞時事」、「網路文章」）'
        },
        query: {
          type: 'string',
          description: '可選：關鍵字搜尋標題、副標題或內文'
        }
      }
    }
  },
  {
    name: 'get_article',
    description: '取得指定法文文章的完整正文內容與所有螢光筆重點標記。',
    inputSchema: {
      type: 'object',
      properties: {
        articleId: {
          type: 'string',
          description: '文章 ID（例如 art-petit-prince）或標題關鍵字'
        }
      },
      required: ['articleId']
    }
  },
  {
    name: 'add_article',
    description: '新增一篇法文文章到書庫 (data/library.json)。',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '文章標題' },
        content: { type: 'string', description: '法文文章正文（段落以雙換行分隔）' },
        subtitle: { type: 'string', description: '可選：副標題或作者來源' },
        category: { type: 'string', description: '可選：分類（預設「自訂文章」）' },
        sourceUrl: { type: 'string', description: '可選：來源網址' },
        syncToGithub: { type: 'boolean', description: '可選：是否同時 git commit & push 同步到 GitHub（預設 false）' }
      },
      required: ['title', 'content']
    }
  },
  {
    name: 'import_article_from_url',
    description: '從法文新聞或法文維基百科網址 (URL) 自動擷取乾淨正文，並可選擇直接存入書庫。',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '要擷取的法文文章網址 (http:// 或 https://)' },
        saveToLibrary: { type: 'boolean', description: '是否直接將擷取的文章存入 data/library.json（預設 true）' },
        syncToGithub: { type: 'boolean', description: '可選：存入後是否同步推送至 GitHub（預設 false）' }
      },
      required: ['url']
    }
  },
  {
    name: 'list_vocabulary',
    description: '列出法文生字本中的所有生字與片語，可依關鍵字、文章 ID 或熟練度上限篩選（適合用來找需要複習的單字）。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '可選：搜尋法文單字、原形或中文翻譯' },
        articleId: { type: 'string', description: '可選：只列出特定文章的生字' },
        maxMastery: { type: 'number', description: '可選：只列出熟練度小於等於此值 (0-5) 的生字' }
      }
    }
  },
  {
    name: 'add_vocabulary',
    description: '新增一個法文生字或片語到生字本 (data/library.json)。',
    inputSchema: {
      type: 'object',
      properties: {
        word: { type: 'string', description: '法文單字或片語' },
        translation: { type: 'string', description: '繁體中文翻譯' },
        lemma: { type: 'string', description: '可選：動詞原形或詞根' },
        pos: { type: 'string', description: '可選：詞性（例如「動詞」、「陰性名詞 (n.f.)」）' },
        grammarNote: { type: 'string', description: '可選：語法或用法筆記' },
        contextSentence: { type: 'string', description: '可選：法文例句或文章原句' },
        contextTranslation: { type: 'string', description: '可選：例句繁體中文翻譯' },
        articleId: { type: 'string', description: '可選：關聯的文章 ID' },
        color: {
          type: 'string',
          enum: ['amber', 'burgundy', 'sage', 'slate'],
          description: '可選：標記顏色（預設 amber）'
        },
        syncToGithub: { type: 'boolean', description: '可選：是否同時推送至 GitHub（預設 false）' }
      },
      required: ['word', 'translation']
    }
  },
  {
    name: 'update_vocabulary_mastery',
    description: '更新生字本中某個生字的熟練度 (0-5)，適合在測驗或複習完後記錄進度。',
    inputSchema: {
      type: 'object',
      properties: {
        idOrWord: { type: 'string', description: '生字 ID（例如 voc-1）或法文單字本身' },
        mastery: { type: 'number', description: '新的熟練度等級 (0 到 5)' },
        syncToGithub: { type: 'boolean', description: '可選：是否同時推送至 GitHub（預設 false）' }
      },
      required: ['idOrWord', 'mastery']
    }
  },
  {
    name: 'add_highlight',
    description: '在指定法文文章中新增一筆四色螢光筆重點標記。',
    inputSchema: {
      type: 'object',
      properties: {
        articleId: { type: 'string', description: '文章 ID' },
        text: { type: 'string', description: '要標記的法文原文片段' },
        translation: { type: 'string', description: '繁體中文翻譯' },
        color: {
          type: 'string',
          enum: ['amber', 'burgundy', 'sage', 'slate'],
          description: '螢光筆顏色：amber（琥珀黃）、burgundy（勃根地紅）、sage（鼠尾草綠）、slate（迷霧藍）'
        },
        lemma: { type: 'string', description: '可選：原形' },
        pos: { type: 'string', description: '可選：詞性' },
        note: { type: 'string', description: '可選：學習筆記' },
        context: { type: 'string', description: '可選：所在原句上下文' },
        syncToGithub: { type: 'boolean', description: '可選：是否同時推送至 GitHub（預設 false）' }
      },
      required: ['articleId', 'text', 'translation']
    }
  },
  {
    name: 'translate_french',
    description: '將法文單字、片語或整句翻譯為繁體中文，並執行動詞原形還原與法文語法結構拆解。',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '要翻譯與解析的法文文字' },
        context: { type: 'string', description: '可選：該文字所在的完整法文句子，提供語境翻譯' }
      },
      required: ['text']
    }
  }
];

const RESOURCES = [
  {
    uri: 'atelier://library',
    name: 'L\'Atelier de Lecture 完整資料庫',
    description: '包含設定、所有法文文章、螢光筆標記與生字本的完整 JSON 資料',
    mimeType: 'application/json'
  },
  {
    uri: 'atelier://articles',
    name: '法文文章書庫摘要',
    description: '所有已收錄法文文章的清單與基本資訊',
    mimeType: 'application/json'
  },
  {
    uri: 'atelier://vocabulary',
    name: '法文生字本',
    description: '所有已收錄的法文生字、翻譯、語法筆記與熟練度',
    mimeType: 'application/json'
  }
];

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function findArticle(articles, articleId) {
  const exact = articles.find(a => a.id === articleId);
  if (exact) return exact;
  const lower = String(articleId || '').toLowerCase();
  return articles.find(a => (a.title || '').toLowerCase().includes(lower));
}

async function handleToolCall(name, args = {}) {
  switch (name) {
    case 'list_articles': {
      const db = readLibrary();
      let articles = db.articles || [];
      if (args.category) {
        const cat = args.category.toLowerCase();
        articles = articles.filter(a => (a.category || '').toLowerCase().includes(cat));
      }
      if (args.query) {
        const q = args.query.toLowerCase();
        articles = articles.filter(
          a =>
            (a.title || '').toLowerCase().includes(q) ||
            (a.subtitle || '').toLowerCase().includes(q) ||
            (a.content || '').toLowerCase().includes(q)
        );
      }
      const summary = articles.map(a => ({
        id: a.id,
        title: a.title,
        subtitle: a.subtitle || '',
        category: a.category || '',
        progress: a.progress || 0,
        highlightCount: Array.isArray(a.highlights) ? a.highlights.length : 0,
        createdAt: a.createdAt || ''
      }));
      return { count: summary.length, articles: summary };
    }

    case 'get_article': {
      const db = readLibrary();
      const article = findArticle(db.articles || [], args.articleId);
      if (!article) {
        throw new Error(`找不到文章：${args.articleId}`);
      }
      return article;
    }

    case 'add_article': {
      if (!args.title || !args.content) {
        throw new Error('缺少必要欄位：title 與 content');
      }
      const db = readLibrary();
      db.articles = db.articles || [];
      const newArticle = {
        id: makeId('art'),
        title: args.title.trim(),
        subtitle: (args.subtitle || '').trim(),
        category: (args.category || '自訂文章').trim(),
        sourceUrl: (args.sourceUrl || '').trim(),
        createdAt: new Date().toISOString(),
        progress: 0,
        content: args.content.trim(),
        highlights: []
      };
      db.articles.unshift(newArticle);
      const saveResult = await saveLibrary(db, { syncToGithub: Boolean(args.syncToGithub) });
      return { article: newArticle, ...saveResult };
    }

    case 'import_article_from_url': {
      const extracted = await fetchArticleFromUrl(args.url);
      if (args.saveToLibrary === false) {
        return { saved: false, extracted };
      }
      const db = readLibrary();
      db.articles = db.articles || [];
      const newArticle = {
        id: makeId('art'),
        ...extracted,
        createdAt: new Date().toISOString(),
        progress: 0,
        highlights: []
      };
      db.articles.unshift(newArticle);
      const saveResult = await saveLibrary(db, { syncToGithub: Boolean(args.syncToGithub) });
      return { saved: true, article: newArticle, ...saveResult };
    }

    case 'list_vocabulary': {
      const db = readLibrary();
      let vocab = db.vocabulary || [];
      if (args.articleId) {
        vocab = vocab.filter(v => v.articleId === args.articleId);
      }
      if (typeof args.maxMastery === 'number') {
        vocab = vocab.filter(v => (v.mastery || 0) <= args.maxMastery);
      }
      if (args.query) {
        const q = args.query.toLowerCase();
        vocab = vocab.filter(
          v =>
            (v.word || '').toLowerCase().includes(q) ||
            (v.lemma || '').toLowerCase().includes(q) ||
            (v.translation || '').toLowerCase().includes(q)
        );
      }
      return { count: vocab.length, vocabulary: vocab };
    }

    case 'add_vocabulary': {
      if (!args.word || !args.translation) {
        throw new Error('缺少必要欄位：word 與 translation');
      }
      const db = readLibrary();
      db.vocabulary = db.vocabulary || [];
      let articleTitle = '';
      if (args.articleId) {
        const art = findArticle(db.articles || [], args.articleId);
        if (art) articleTitle = art.title;
      }
      const newItem = {
        id: makeId('voc'),
        word: args.word.trim(),
        lemma: (args.lemma || args.word).trim(),
        pos: (args.pos || '').trim(),
        translation: args.translation.trim(),
        grammarNote: (args.grammarNote || '').trim(),
        contextSentence: (args.contextSentence || '').trim(),
        contextTranslation: (args.contextTranslation || '').trim(),
        articleId: args.articleId || '',
        articleTitle,
        color: args.color || 'amber',
        mastery: 0,
        createdAt: new Date().toISOString()
      };
      db.vocabulary.unshift(newItem);
      const saveResult = await saveLibrary(db, { syncToGithub: Boolean(args.syncToGithub) });
      return { vocabulary: newItem, ...saveResult };
    }

    case 'update_vocabulary_mastery': {
      const db = readLibrary();
      const vocab = db.vocabulary || [];
      const targetKey = String(args.idOrWord || '').toLowerCase();
      const item = vocab.find(
        v => v.id === args.idOrWord || (v.word || '').toLowerCase() === targetKey
      );
      if (!item) {
        throw new Error(`找不到生字：${args.idOrWord}`);
      }
      const clamped = Math.max(0, Math.min(5, Math.round(Number(args.mastery))));
      if (Number.isNaN(clamped)) {
        throw new Error('mastery 必須是 0 到 5 之間的數字');
      }
      item.mastery = clamped;
      const saveResult = await saveLibrary(db, { syncToGithub: Boolean(args.syncToGithub) });
      return { vocabulary: item, ...saveResult };
    }

    case 'add_highlight': {
      if (!args.articleId || !args.text || !args.translation) {
        throw new Error('缺少必要欄位：articleId、text 與 translation');
      }
      const db = readLibrary();
      const article = findArticle(db.articles || [], args.articleId);
      if (!article) {
        throw new Error(`找不到文章：${args.articleId}`);
      }
      article.highlights = article.highlights || [];
      const newHighlight = {
        id: makeId('hl'),
        text: args.text.trim(),
        lemma: (args.lemma || args.text).trim(),
        pos: (args.pos || '').trim(),
        translation: args.translation.trim(),
        note: (args.note || '').trim(),
        color: args.color || 'amber',
        context: (args.context || args.text).trim()
      };
      article.highlights.push(newHighlight);
      const saveResult = await saveLibrary(db, { syncToGithub: Boolean(args.syncToGithub) });
      return { articleId: article.id, highlight: newHighlight, ...saveResult };
    }

    case 'translate_french': {
      if (!args.text || !args.text.trim()) {
        throw new Error('缺少必要欄位：text');
      }
      return await translateFrench(args.text.trim(), (args.context || '').trim());
    }

    default:
      throw new Error(`未知的工具名稱：${name}`);
  }
}

function handleResourceRead(uri) {
  const db = readLibrary();
  if (uri === 'atelier://library') {
    return JSON.stringify(db, null, 2);
  }
  if (uri === 'atelier://articles') {
    const summary = (db.articles || []).map(a => ({
      id: a.id,
      title: a.title,
      subtitle: a.subtitle || '',
      category: a.category || '',
      progress: a.progress || 0,
      highlightCount: Array.isArray(a.highlights) ? a.highlights.length : 0
    }));
    return JSON.stringify(summary, null, 2);
  }
  if (uri === 'atelier://vocabulary') {
    return JSON.stringify(db.vocabulary || [], null, 2);
  }
  throw new Error(`找不到資源：${uri}`);
}

function sendMessage(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function sendResult(id, result) {
  sendMessage({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message) {
  sendMessage({ jsonrpc: '2.0', id, error: { code, message } });
}

async function handleRequest(request) {
  const { id, method, params } = request;

  // Notifications (no id) do not receive responses
  if (id === undefined || id === null) {
    return;
  }

  try {
    switch (method) {
      case 'initialize': {
        const clientVersion = (params && params.protocolVersion) || SUPPORTED_PROTOCOL_VERSION;
        return sendResult(id, {
          protocolVersion: clientVersion,
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: SERVER_INFO
        });
      }

      case 'ping':
        return sendResult(id, {});

      case 'tools/list':
        return sendResult(id, { tools: TOOLS });

      case 'tools/call': {
        const toolName = params && params.name;
        const toolArgs = (params && params.arguments) || {};
        try {
          const data = await handleToolCall(toolName, toolArgs);
          return sendResult(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2)
              }
            ]
          });
        } catch (toolErr) {
          return sendResult(id, {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error: ${toolErr.message}`
              }
            ]
          });
        }
      }

      case 'resources/list':
        return sendResult(id, { resources: RESOURCES });

      case 'resources/read': {
        const uri = params && params.uri;
        const text = handleResourceRead(uri);
        return sendResult(id, {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text
            }
          ]
        });
      }

      default:
        return sendError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    return sendError(id, -32603, err.message || 'Internal error');
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity
});

rl.on('line', line => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    sendError(null, -32700, 'Parse error');
    return;
  }
  handleRequest(parsed);
});
