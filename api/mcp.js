const {
  readLibrary,
  translateFrench,
  fetchArticleFromUrl
} = require('../lib/atelier-core.js');

const SERVER_INFO = {
  name: 'atelier-de-lecture',
  version: '1.0.0'
};

const SUPPORTED_PROTOCOL_VERSION = '2024-11-05';

const TOOLS = [
  {
    name: 'list_articles',
    description: '列出 L\'Atelier de Lecture 書庫中的所有法文文章摘要。',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: '可選：依文章分類篩選' },
        query: { type: 'string', description: '可選：關鍵字搜尋標題、副標題或內文' }
      }
    }
  },
  {
    name: 'get_article',
    description: '取得指定法文文章的完整正文內容與所有螢光筆重點標記。',
    inputSchema: {
      type: 'object',
      properties: {
        articleId: { type: 'string', description: '文章 ID 或標題關鍵字' }
      },
      required: ['articleId']
    }
  },
  {
    name: 'list_vocabulary',
    description: '列出法文生字本中的所有生字與片語。',
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
    name: 'translate_french',
    description: '將法文單字、片語或整句翻譯為繁體中文，並執行動詞原形還原與法文語法結構拆解。',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '要翻譯與解析的法文文字' },
        context: { type: 'string', description: '可選：該文字所在的完整法文句子' }
      },
      required: ['text']
    }
  },
  {
    name: 'import_article_from_url',
    description: '從法文新聞或法文維基百科網址 (URL) 自動擷取乾淨正文（唯讀預覽）。',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '要擷取的法文文章網址 (http:// 或 https://)' }
      },
      required: ['url']
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
      return {
        count: articles.length,
        articles: articles.map(a => ({
          id: a.id,
          title: a.title,
          subtitle: a.subtitle || '',
          category: a.category || '',
          progress: a.progress || 0,
          highlightCount: Array.isArray(a.highlights) ? a.highlights.length : 0
        }))
      };
    }

    case 'get_article': {
      const db = readLibrary();
      const article = findArticle(db.articles || [], args.articleId);
      if (!article) throw new Error(`找不到文章：${args.articleId}`);
      return article;
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

    case 'translate_french': {
      if (!args.text || !args.text.trim()) throw new Error('缺少必要欄位：text');
      return await translateFrench(args.text.trim(), (args.context || '').trim());
    }

    case 'import_article_from_url': {
      return await fetchArticleFromUrl(args.url);
    }

    default:
      throw new Error(`未知的工具名稱：${name}`);
  }
}

function handleResourceRead(uri) {
  const db = readLibrary();
  if (uri === 'atelier://library') return JSON.stringify(db, null, 2);
  if (uri === 'atelier://articles') {
    return JSON.stringify(
      (db.articles || []).map(a => ({
        id: a.id,
        title: a.title,
        subtitle: a.subtitle || '',
        category: a.category || '',
        progress: a.progress || 0
      })),
      null,
      2
    );
  }
  if (uri === 'atelier://vocabulary') return JSON.stringify(db.vocabulary || [], null, 2);
  throw new Error(`找不到資源：${uri}`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      transport: 'streamable-http',
      endpoint: '/api/mcp',
      tools: TOOLS.map(t => t.name)
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { id, method, params } = body;

  if (id === undefined || id === null) {
    return res.status(202).end();
  }

  try {
    switch (method) {
      case 'initialize':
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: (params && params.protocolVersion) || SUPPORTED_PROTOCOL_VERSION,
            capabilities: { tools: {}, resources: {} },
            serverInfo: SERVER_INFO
          }
        });

      case 'ping':
        return res.status(200).json({ jsonrpc: '2.0', id, result: {} });

      case 'tools/list':
        return res.status(200).json({ jsonrpc: '2.0', id, result: { tools: TOOLS } });

      case 'tools/call': {
        const toolName = params && params.name;
        const toolArgs = (params && params.arguments) || {};
        try {
          const data = await handleToolCall(toolName, toolArgs);
          return res.status(200).json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
            }
          });
        } catch (toolErr) {
          return res.status(200).json({
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [{ type: 'text', text: `Error: ${toolErr.message}` }]
            }
          });
        }
      }

      case 'resources/list':
        return res.status(200).json({ jsonrpc: '2.0', id, result: { resources: RESOURCES } });

      case 'resources/read': {
        const uri = params && params.uri;
        const text = handleResourceRead(uri);
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{ uri, mimeType: 'application/json', text }]
          }
        });
      }

      default:
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
    }
  } catch (err) {
    return res.status(200).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: err.message || 'Internal error' }
    });
  }
};
