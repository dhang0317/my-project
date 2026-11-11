/**
 * French Linguistic & Grammar Analyzer (Client + Server Shared Module)
 * Provides zero-API-key French verb conjugation de-inflection (lemmatization),
 * part-of-speech tagging, gender/number detection, contraction breakdown,
 * and sentence-level grammatical structure analysis in Traditional Chinese.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FrenchAnalyzer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Common multi-word expressions, idioms & collocations (字組 / 慣用語)
  const COMMON_PHRASES = {
    "bien sûr": { lemma: "bien sûr", pos: "副詞片語", zh: "當然、自然" },
    "d'accord": { lemma: "d'accord", pos: "片語", zh: "同意、好的" },
    "tout de suite": { lemma: "tout de suite", pos: "副詞片語", zh: "立刻、馬上" },
    "en train de": { lemma: "être en train de", pos: "動詞片語", zh: "正在…中" },
    "avoir besoin de": { lemma: "avoir besoin de", pos: "動詞片語", zh: "需要…" },
    "avoir envie de": { lemma: "avoir envie de", pos: "動詞片語", zh: "渴望、想要…" },
    "avoir hâte de": { lemma: "avoir hâte de", pos: "動詞片語", zh: "迫不及待…" },
    "en fait": { lemma: "en fait", pos: "副詞片語", zh: "事實上、其實" },
    "au fait": { lemma: "au fait", pos: "副詞片語", zh: "對了、順便一提" },
    "par exemple": { lemma: "par exemple", pos: "副詞片語", zh: "例如" },
    "de temps en temps": { lemma: "de temps en temps", pos: "副詞片語", zh: "偶爾、有時" },
    "petit à petit": { lemma: "petit à petit", pos: "副詞片語", zh: "漸漸地、一步步" },
    "au fur et à mesure": { lemma: "au fur et à mesure", pos: "介系詞片語", zh: "隨著…進行" },
    "tout à l'heure": { lemma: "tout à l'heure", pos: "時間副詞片語", zh: "剛才、待會兒" },
    "tout à fait": { lemma: "tout à fait", pos: "副詞片語", zh: "完全地、正是如此" },
    "grâce à": { lemma: "grâce à", pos: "介系詞片語", zh: "多虧、幸虧" },
    "à cause de": { lemma: "à cause de", pos: "介系詞片語", zh: "因為、由於（負面）" },
    "en plus": { lemma: "en plus", pos: "副詞片語", zh: "此外、而且" },
    "non plus": { lemma: "non plus", pos: "副詞片語", zh: "也不（否定對等）" },
    "peut-être": { lemma: "peut-être", pos: "副詞", zh: "也許、可能" },
    "créer des liens": { lemma: "créer des liens", pos: "動詞片語", zh: "建立羈絆、產生連結" },
    "l'un de l'autre": { lemma: "l'un de l'autre", pos: "代名詞片語", zh: "彼此、互相" },
    "unique au monde": { lemma: "unique au monde", pos: "形容詞片語", zh: "世界上獨一無二的" },
    "qu'est-ce que": { lemma: "qu'est-ce que", pos: "疑問片語", zh: "什麼" },
    "qu'est-ce qui": { lemma: "qu'est-ce qui", pos: "疑問片語", zh: "什麼（主格）" },
    "c'est-à-dire": { lemma: "c'est-à-dire", pos: "連接詞片語", zh: "也就是說、即" },
    "il y a": { lemma: "il y a", pos: "無人稱片語", zh: "有；…以前" }
  };

  // Core dictionary of high-frequency irregular verbs, words, and literary vocabulary
  const CORE_LEXICON = {
    // Irregular verb forms -> lemma, pos, tense/person info, Chinese meaning
    "suis": { lemma: "être", pos: "動詞 (v.)", tense: "直陳式現在時 (je suis)", zh: "是、存在、處於" },
    "es": { lemma: "être", pos: "動詞 (v.)", tense: "直陳式現在時 (tu es)", zh: "是、處於" },
    "est": { lemma: "être", pos: "動詞 (v.)", tense: "直陳式現在時 (il/elle/on est)", zh: "是、存在" },
    "sommes": { lemma: "être", pos: "動詞 (v.)", tense: "直陳式現在時 (nous sommes)", zh: "是" },
    "êtes": { lemma: "être", pos: "動詞 (v.)", tense: "直陳式現在時 (vous êtes)", zh: "是" },
    "sont": { lemma: "être", pos: "動詞 (v.)", tense: "直陳式現在時 (ils/elles sont)", zh: "是" },
    "étais": { lemma: "être", pos: "動詞 (v.)", tense: "未完成過去時 (Imparfait)", zh: "曾經是、當時處於" },
    "était": { lemma: "être", pos: "動詞 (v.)", tense: "未完成過去時 (il/elle était)", zh: "曾經是、當時是" },
    "étaient": { lemma: "être", pos: "動詞 (v.)", tense: "未完成過去時 (ils/elles étaient)", zh: "曾經是" },
    "serai": { lemma: "être", pos: "動詞 (v.)", tense: "簡單未來時 (je serai)", zh: "將會是" },
    "seras": { lemma: "être", pos: "動詞 (v.)", tense: "簡單未來時 (tu seras)", zh: "將會是" },
    "sera": { lemma: "être", pos: "動詞 (v.)", tense: "簡單未來時 (il/elle sera)", zh: "將會是" },
    "serons": { lemma: "être", pos: "動詞 (v.)", tense: "簡單未來時 (nous serons)", zh: "將會是" },
    "soit": { lemma: "être", pos: "動詞 (v.)", tense: "虛擬式現在時 (Subjonctif)", zh: "無論是、即便" },
    "été": { lemma: "être", pos: "動詞過去分詞 / 陽性名詞", tense: "過去分詞 (Participe passé)", zh: "曾經是；夏天 (l'été)" },

    "ai": { lemma: "avoir", pos: "動詞 (v.)", tense: "直陳式現在時 (j'ai)", zh: "有、擁有（或作複合過去時助動詞）" },
    "as": { lemma: "avoir", pos: "動詞 (v.)", tense: "直陳式現在時 (tu as)", zh: "有、擁有" },
    "a": { lemma: "avoir", pos: "動詞 (v.)", tense: "直陳式現在時 (il/elle/on a)", zh: "有、已經（助動詞）" },
    "avons": { lemma: "avoir", pos: "動詞 (v.)", tense: "直陳式現在時 (nous avons)", zh: "有、擁有" },
    "avez": { lemma: "avoir", pos: "動詞 (v.)", tense: "直陳式現在時 (vous avez)", zh: "有、擁有" },
    "ont": { lemma: "avoir", pos: "動詞 (v.)", tense: "直陳式現在時 (ils/elles ont)", zh: "有、擁有" },
    "avait": { lemma: "avoir", pos: "動詞 (v.)", tense: "未完成過去時 (Imparfait)", zh: "當時有、曾有" },
    "avaient": { lemma: "avoir", pos: "動詞 (v.)", tense: "未完成過去時 (Imparfait)", zh: "當時有" },
    "aurons": { lemma: "avoir", pos: "動詞 (v.)", tense: "簡單未來時 (nous aurons)", zh: "將會有" },
    "aura": { lemma: "avoir", pos: "動詞 (v.)", tense: "簡單未來時 (il/elle aura)", zh: "將會有" },
    "eu": { lemma: "avoir", pos: "動詞 (v.)", tense: "過去分詞 (Participe passé)", zh: "擁有過" },

    "vais": { lemma: "aller", pos: "動詞 (v.)", tense: "直陳式現在時 (je vais)", zh: "去、前往；即將" },
    "vas": { lemma: "aller", pos: "動詞 (v.)", tense: "直陳式現在時 (tu vas)", zh: "去、前往" },
    "va": { lemma: "aller", pos: "動詞 (v.)", tense: "直陳式現在時 (il/elle va)", zh: "去、即將" },
    "allons": { lemma: "aller", pos: "動詞 (v.)", tense: "直陳式現在時 (nous allons)", zh: "去、前往" },
    "vont": { lemma: "aller", pos: "動詞 (v.)", tense: "直陳式現在時 (ils/elles vont)", zh: "去、前往" },
    "irai": { lemma: "aller", pos: "動詞 (v.)", tense: "簡單未來時 (j'irai)", zh: "將會去" },
    "aller": { lemma: "aller", pos: "動詞原形 (v.i.)", tense: "不定式原形 (Infinitif)", zh: "去、前往、進展" },

    "fais": { lemma: "faire", pos: "動詞 (v.)", tense: "直陳式現在時", zh: "做、製造" },
    "fait": { lemma: "faire", pos: "動詞 / 過去分詞 / 名詞", tense: "現在時 (il fait) 或過去分詞", zh: "做、使得；事實" },
    "font": { lemma: "faire", pos: "動詞 (v.)", tense: "直陳式現在時 (ils font)", zh: "做、進行" },
    "fit": { lemma: "faire", pos: "動詞 (v.)", tense: "簡單過去時 (Passé simple - 文學時態)", zh: "說道、做出（文學敘事）" },
    "faites": { lemma: "faire", pos: "動詞 / 分詞形容詞", tense: "過去分詞陰性複數 / 現在時", zh: "做好的、現成的 (toutes faites)" },

    "dit": { lemma: "dire", pos: "動詞 (v.)", tense: "直陳式現在時 / 簡單過去時 / 過去分詞", zh: "說、講道" },
    "dis": { lemma: "dire", pos: "動詞 (v.)", tense: "直陳式現在時 (je/tu dis)", zh: "說" },
    "dire": { lemma: "dire", pos: "動詞原形 (v.t.)", tense: "不定式原形 (Infinitif)", zh: "說、表達、告訴" },

    "peux": { lemma: "pouvoir", pos: "動詞 (v.)", tense: "直陳式現在時 (je/tu peux)", zh: "能夠、可以" },
    "puis": { lemma: "pouvoir", pos: "動詞 (v.) / 副詞", tense: "第一人稱單數雅語 (je puis = je peux)", zh: "能夠、可以（雅語）；然後" },
    "peut": { lemma: "pouvoir", pos: "動詞 (v.)", tense: "直陳式現在時 (il/elle peut)", zh: "能夠、可能" },
    "peuvent": { lemma: "pouvoir", pos: "動詞 (v.)", tense: "直陳式現在時 (ils peuvent)", zh: "能夠、可以" },
    "pu": { lemma: "pouvoir", pos: "動詞 (v.)", tense: "過去分詞", zh: "能夠過" },

    "veux": { lemma: "vouloir", pos: "動詞 (v.)", tense: "直陳式現在時 (je/tu veux)", zh: "想要、願意" },
    "veut": { lemma: "vouloir", pos: "動詞 (v.)", tense: "直陳式現在時 (il/elle veut)", zh: "想要、意欲" },
    "veulent": { lemma: "vouloir", pos: "動詞 (v.)", tense: "直陳式現在時 (ils veulent)", zh: "想要" },

    "vois": { lemma: "voir", pos: "動詞 (v.)", tense: "直陳式現在時 (je/tu vois)", zh: "看見、看清" },
    "voit": { lemma: "voir", pos: "動詞 (v.)", tense: "直陳式現在時 (il/elle/on voit)", zh: "看見、理解" },
    "vit": { lemma: "voir / vivre", pos: "動詞 (v.)", tense: "簡單過去時 (voir: 看見) 或 現在時 (vivre: 生活)", zh: "看見了（Passé simple）；生活" },
    "vu": { lemma: "voir", pos: "動詞 (v.)", tense: "過去分詞", zh: "看見過；鑑於" },

    "sais": { lemma: "savoir", pos: "動詞 (v.)", tense: "直陳式現在時 (je/tu sais)", zh: "知道、懂得" },
    "sait": { lemma: "savoir", pos: "動詞 (v.)", tense: "直陳式現在時 (il/elle sait)", zh: "知道、懂得" },
    "savent": { lemma: "savoir", pos: "動詞 (v.)", tense: "直陳式現在時 (ils savent)", zh: "知道" },

    "connais": { lemma: "connaître", pos: "動詞 (v.)", tense: "直陳式現在時", zh: "認識、了解、體會" },
    "connaît": { lemma: "connaître", pos: "動詞 (v.)", tense: "直陳式現在時 (il/elle/on connaît)", zh: "認識、了解" },
    "connaître": { lemma: "connaître", pos: "動詞原形 (v.t.)", tense: "不定式原形 (Infinitif)", zh: "認識、熟悉、體驗" },

    "viens": { lemma: "venir", pos: "動詞 (v.)", tense: "命令式 / 直陳式現在時", zh: "來、過來" },
    "vient": { lemma: "venir", pos: "動詞 (v.)", tense: "直陳式現在時 (il/elle vient)", zh: "來；剛才 (venir de + inf.)" },
    "deviennent": { lemma: "devenir", pos: "動詞 (v.)", tense: "直陳式現在時 (ils/elles deviennent)", zh: "變成、成為" },
    "devient": { lemma: "devenir", pos: "動詞 (v.)", tense: "直陳式現在時 (il/elle devient)", zh: "變成、成為" },

    "prend": { lemma: "prendre", pos: "動詞 (v.)", tense: "直陳式現在時", zh: "拿、搭乘、花費" },
    "pris": { lemma: "prendre", pos: "動詞 (v.)", tense: "過去分詞 (Participe passé)", zh: "拿取了、採取了" },
    "boit": { lemma: "boire", pos: "動詞 (v.)", tense: "直陳式現在時 (il/elle/on boit)", zh: "喝、飲用" },

    "apparut": { lemma: "apparaître", pos: "動詞 (v.)", tense: "簡單過去時 (Passé simple)", zh: "出現了、顯現了" },
    "répondit": { lemma: "répondre", pos: "動詞 (v.)", tense: "簡單過去時 (Passé simple)", zh: "回答道" },
    "retourna": { lemma: "retourner", pos: "動詞 (v.)", tense: "簡單過去時 (Passé simple)", zh: "轉過身、返回" },
    "proposa": { lemma: "proposer", pos: "動詞 (v.)", tense: "簡單過去時 (Passé simple)", zh: "提議道、建議" },
    "ajouta": { lemma: "ajouter", pos: "動詞 (v.)", tense: "簡單過去時 (Passé simple)", zh: "補充說道、添加" },

    // High value vocabulary from curated articles & common reading
    "renard": { lemma: "renard", pos: "陽性名詞 (n.m.)", tense: "單數 (le / un renard)", zh: "狐狸" },
    "renards": { lemma: "renard", pos: "陽性名詞 (n.m.pl.)", tense: "複數", zh: "狐狸（們）" },
    "prince": { lemma: "prince", pos: "陽性名詞 (n.m.)", tense: "單數", zh: "王子" },
    "pommier": { lemma: "pommier", pos: "陽性名詞 (n.m.)", tense: "單數", zh: "蘋果樹（pomme 蘋果 + -ier 果樹字尾）" },
    "apprivoisé": { lemma: "apprivoiser", pos: "過去分詞 / 形容詞", tense: "陽性單數過去分詞", zh: "被馴養的、建立親密連結的" },
    "apprivoiser": { lemma: "apprivoiser", pos: "第一組規則動詞 (v.t.)", tense: "不定式原形 (Infinitif)", zh: "馴養、使親近、建立羈絆" },
    "apprivoises": { lemma: "apprivoiser", pos: "動詞 (v.t.)", tense: "直陳式現在時第二人稱單數 (tu apprivoises)", zh: "馴養、與…建立羈絆" },
    "apprivoise": { lemma: "apprivoiser", pos: "動詞 (v.t.)", tense: "直陳式現在時 / 命令式", zh: "馴養" },
    "signifie": { lemma: "signifier", pos: "動詞 (v.t.)", tense: "直陳式現在時 (il/elle/ça signifie)", zh: "意味著、意思是" },
    "oubliée": { lemma: "oublier", pos: "過去分詞 / 形容詞", tense: "陰性單數過去分詞 (配合 chose)", zh: "被遺忘的、被忽略的" },
    "créer": { lemma: "créer", pos: "第一組規則動詞 (v.t.)", tense: "不定式原形 (Infinitif)", zh: "創造、建立、締造" },
    "liens": { lemma: "lien", pos: "陽性名詞 (n.m.pl.)", tense: "複數 (單數為 le lien)", zh: "連結、關係、羈絆、紐帶" },
    "lien": { lemma: "lien", pos: "陽性名詞 (n.m.)", tense: "單數", zh: "連結、關係、羈絆" },
    "semblable": { lemma: "semblable", pos: "形容詞 (adj.)", tense: "陰陽同形單數", zh: "相似的、一模一樣的 (semblable à... 與…相似)" },
    "besoin": { lemma: "besoin", pos: "陽性名詞 (n.m.)", tense: "單數 (常構成 avoir besoin de)", zh: "需要、需求" },
    "unique": { lemma: "unique", pos: "形容詞 (adj.)", tense: "陰陽同形單數", zh: "獨一無二的、唯一的" },
    "marchands": { lemma: "marchand", pos: "陽性名詞 (n.m.pl.)", tense: "複數 (單數為 le marchand)", zh: "商人、店家" },
    "cœur": { lemma: "cœur", pos: "陽性名詞 (n.m.)", tense: "單數 (le cœur)", zh: "心、內心、心靈、核心" },
    "coeur": { lemma: "cœur", pos: "陽性名詞 (n.m.)", tense: "單數 (le cœur)", zh: "心、內心、心靈" },
    "essentiel": { lemma: "essentiel", pos: "陽性名詞 / 形容詞", tense: "單數 (l'essentiel)", zh: "本質、最重要的事物；核心的" },
    "invisible": { lemma: "invisible", pos: "形容詞 (adj.)", tense: "陰陽同形 (in- 否定字首 + visible 可見的)", zh: "看不見的、無形的" },
    "yeux": { lemma: "œil", pos: "陽性名詞 (n.m.pl.)", tense: "不規則複數 (單數為 l'œil)", zh: "雙眼、眼睛" },
    "terrasses": { lemma: "terrasse", pos: "陰性名詞 (n.f.pl.)", tense: "複數 (單數為 la terrasse)", zh: "露天雅座、咖啡館戶外座位區" },
    "terrasse": { lemma: "terrasse", pos: "陰性名詞 (n.f.)", tense: "單數 (en terrasse 在露天座)", zh: "露天座位區、露台" },
    "tablier": { lemma: "tablier", pos: "陽性名詞 (n.m.)", tense: "單數", zh: "圍裙（巴黎侍者傳統穿搭）" },
    "croustillant": { lemma: "croustillant", pos: "形容詞 (adj.m.)", tense: "陽性單數 (陰性為 croustillante)", zh: "酥脆的、香脆的" },
    "feuilletant": { lemma: "feuilleter", pos: "動詞現在分詞", tense: "現在分詞 (Participe présent)", zh: "翻閱、隨手瀏覽（源自 feuille 頁面/樹葉）" },
    "effréné": { lemma: "effréné", pos: "形容詞 (adj.m.)", tense: "陽性單數", zh: "急促的、失去控制的、狂熱的" },
    "convivialité": { lemma: "convivialité", pos: "陰性名詞 (n.f.)", tense: "單數", zh: "歡聚氣氛、親切好客、人際溫暖" },
    "végétalisation": { lemma: "végétalisation", pos: "陰性名詞 (n.f.)", tense: "單數 (-tion 陰性字尾)", zh: "綠化、植栽化" },
    "canicule": { lemma: "canicule", pos: "陰性名詞 (n.f.)", tense: "單數 (la canicule)", zh: "酷暑、熱浪" },
    "pistes": { lemma: "piste", pos: "陰性名詞 (n.f.pl.)", tense: "複數 (piste cyclable 自行車道)", zh: "車道、跑道、小徑" },
    "essor": { lemma: "essor", pos: "陽性名詞 (n.m.)", tense: "單數 (un essor)", zh: "蓬勃發展、飛躍成長、興起" },
    "quotidien": { lemma: "quotidien", pos: "形容詞 / 陽性名詞", tense: "陽性單數 (陰性為 quotidienne)", zh: "日常的、每日的；日報" },
    "quotidiens": { lemma: "quotidien", pos: "形容詞 (adj.m.pl.)", tense: "陽性複數", zh: "日常的、每日的" },
    "toutefois": { lemma: "toutefois", pos: "副詞 / 連接詞 (adv.)", tense: "不變化詞", zh: "然而、不過、儘管如此" }
  };

  // Contractions and function words
  const FUNCTION_WORDS = {
    "le": "定冠詞 (陽性單數)",
    "la": "定冠詞 (陰性單數)",
    "les": "定冠詞 (複數)",
    "un": "不定冠詞 (陽性單數)",
    "une": "不定冠詞 (陰性單數)",
    "des": "不定冠詞複數 / 縮合冠詞 (de + les)",
    "du": "部分冠詞 / 縮合冠詞 (de + le)",
    "au": "縮合冠詞 (à + le)",
    "aux": "縮合冠詞 (à + les)",
    "ce": "指示形容詞 / 代名詞 (這)",
    "cet": "指示形容詞 (陽性母音前：這)",
    "cette": "指示形容詞 (陰性單數：這)",
    "ces": "指示形容詞 (複數：這些)",
    "mon": "所有格形容詞 (我的 - 陽性)",
    "ma": "所有格形容詞 (我的 - 陰性)",
    "mes": "所有格形容詞 (我的 - 複數)",
    "ton": "所有格形容詞 (你的 - 陽性)",
    "ta": "所有格形容詞 (你的 - 陰性)",
    "tes": "所有格形容詞 (你的 - 複數)",
    "son": "所有格形容詞 (他/她的 - 陽性)",
    "sa": "所有格形容詞 (他/她的 - 陰性)",
    "ses": "所有格形容詞 (他/她的 - 複數)",
    "leur": "所有格形容詞 / 間接受格代名詞 (他們的)",
    "leurs": "所有格形容詞 (他們的 - 複數)",
    "qui": "關係代名詞 (主格：…的人/事) / 疑問詞 (誰)",
    "que": "關係代名詞 (受格) / 連接詞 / 疑問詞",
    "où": "關係副詞 / 疑問詞 (在哪裡、在…之中)",
    "dans": "介系詞 (在…裡面)",
    "sur": "介系詞 (在…上面、關於)",
    "sous": "介系詞 (在…下面)",
    "avec": "介系詞 (與、和、帶著)",
    "sans": "介系詞 (沒有、無)",
    "pour": "介系詞 (為了、對於)",
    "par": "介系詞 (透過、被、由)",
    "chez": "介系詞 (在…家裡/店裡/群體中)",
    "mais": "對等連接詞 (但是、然而)"
  };

  /**
   * Rule-based morphological analyzer for French words not in CORE_LEXICON
   */
  function inferMorphology(rawWord) {
    const clean = rawWord
      .toLowerCase()
      .replace(/^[«»"'“”‘’()[\],.!?;:—–-]+|[«»"'“”‘’()[\],.!?;:—–-]+$/g, '');

    // Check elision prefix like l'esprit, d'un, qu'avec, n'est, s'animent, m'apprivoises
    let prefixNote = null;
    let stemWord = clean;
    const elisionMatch = clean.match(/^(c|d|j|l|m|n|qu|s|t)['’](.+)$/i);
    if (elisionMatch) {
      const prefixMap = {
        c: "ce (這)",
        d: "de (的 / 從)",
        j: "je (我)",
        l: "le / la (定冠詞)",
        m: "me (我 - 受格/反身)",
        n: "ne (否定詞前半部)",
        qu: "que (連接詞 / 關係代名詞)",
        s: "se (反身代名詞) / si (如果)",
        t: "te (你 - 受格/反身)"
      };
      const pKey = elisionMatch[1].toLowerCase();
      prefixNote = `省音縮寫 (Élision)：${pKey}' 代表「${prefixMap[pKey] || pKey}」遇母音或啞音 h 省去母音`;
      stemWord = elisionMatch[2];
    }

    // 1. Direct lookup in CORE_LEXICON
    if (CORE_LEXICON[stemWord]) {
      const entry = CORE_LEXICON[stemWord];
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: entry.lemma,
        pos: entry.pos,
        morphology: entry.tense,
        zhHint: entry.zh,
        elision: prefixNote
      };
    }

    // 2. Check function words
    if (FUNCTION_WORDS[stemWord]) {
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: stemWord,
        pos: FUNCTION_WORDS[stemWord],
        morphology: "功能詞 / 語法結構詞",
        zhHint: null,
        elision: prefixNote
      };
    }

    // 3. Rule-based verb / noun / adjective suffix analysis
    // Adverb in -ment
    if (stemWord.length > 5 && stemWord.endsWith("ment")) {
      let baseAdj = stemWord.slice(0, -4);
      if (stemWord.endsWith("emment")) baseAdj = stemWord.slice(0, -6) + "ent";
      if (stemWord.endsWith("amment")) baseAdj = stemWord.slice(0, -6) + "ant";
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: stemWord,
        pos: "副詞 (adv.)",
        morphology: `由形容詞詞根 + -ment 構成的副詞（詞根參考：${baseAdj}）`,
        zhHint: null,
        elision: prefixNote
      };
    }

    // Feminine noun in -tion / -sion / -té
    if (stemWord.endsWith("tion") || stemWord.endsWith("sion") || stemWord.endsWith("tions")) {
      const singular = stemWord.replace(/s$/, "");
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: singular,
        pos: "陰性名詞 (n.f.)",
        morphology: stemWord.endsWith("s") ? "陰性複數 (-tions/-sions 字尾必為陰性)" : "陰性單數 (-tion/-sion 字尾必為陰性)",
        zhHint: null,
        elision: prefixNote
      };
    }

    if (stemWord.endsWith("té") || stemWord.endsWith("tés")) {
      const singular = stemWord.replace(/s$/, "");
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: singular,
        pos: "陰性名詞 (n.f.)",
        morphology: "抽象陰性名詞 (-té 字尾，對應英文 -ty)",
        zhHint: null,
        elision: prefixNote
      };
    }

    // Present participle in -ant
    if (stemWord.length > 5 && stemWord.endsWith("ant")) {
      const guessInf = stemWord.slice(0, -3) + "er";
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: guessInf,
        pos: "現在分詞 / 形容詞",
        morphology: `字尾 -ant：可能為動詞 ${guessInf} 的現在分詞 (Participe présent) 或形容詞`,
        zhHint: null,
        elision: prefixNote
      };
    }

    // Imperfect / Conditional endings (-ais, -ait, -aient, -ions, -iez)
    if (stemWord.length > 5 && /(ais|ait|aient)$/.test(stemWord)) {
      const root = stemWord.replace(/(ais|ait|aient)$/, "");
      const guessInf = root + "er";
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: guessInf,
        pos: "動詞變位 (v.)",
        morphology: `未完成過去時 (Imparfait) 或條件式現在時 (推測原形：${guessInf})`,
        zhHint: null,
        elision: prefixNote
      };
    }

    // Future endings (-rai, -ras, -ra, -rons, -rez, -ront)
    if (stemWord.length > 5 && /er(ai|as|a|ons|ez|ont)$/.test(stemWord)) {
      const guessInf = stemWord.replace(/(ai|as|a|ons|ez|ont)$/, "");
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: guessInf,
        pos: "動詞變位 (v.)",
        morphology: `簡單未來時 (Futur simple，原形：${guessInf})`,
        zhHint: null,
        elision: prefixNote
      };
    }

    // 3rd person plural verb ending -ent
    if (stemWord.length > 4 && stemWord.endsWith("ent")) {
      const guessInf = stemWord.slice(0, -3) + "er";
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: guessInf,
        pos: "動詞變位 (v.)",
        morphology: `第三人稱複數直陳式現在時 (ils/elles ...-ent，推測原形：${guessInf})`,
        zhHint: null,
        elision: prefixNote
      };
    }

    // Past participle / adjective in -é, -ée, -és, -ées
    if (stemWord.length > 3 && /(é|ée|és|ées)$/.test(stemWord)) {
      const guessInf = stemWord.replace(/(é|ée|és|ées)$/, "er");
      let genderNum = "陽性單數";
      if (stemWord.endsWith("ée")) genderNum = "陰性單數";
      else if (stemWord.endsWith("és")) genderNum = "陽性複數";
      else if (stemWord.endsWith("ées")) genderNum = "陰性複數";
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: guessInf,
        pos: "過去分詞 / 形容詞",
        morphology: `第一組動詞過去分詞或形容詞（${genderNum}，原形：${guessInf}）`,
        zhHint: null,
        elision: prefixNote
      };
    }

    // Infinitive verbs (-er, -ir, -re, -oir)
    if (stemWord.length > 3 && /(er|ir|re|oir)$/.test(stemWord)) {
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: stemWord,
        pos: "動詞原形 (Infinitif)",
        morphology: `不定式原形動詞 (字尾 -${stemWord.match(/(oir|er|ir|re)$/)[1]})`,
        zhHint: null,
        elision: prefixNote
      };
    }

    // Plural nouns/adjectives in -s or -x
    if (stemWord.length > 3 && /[sx]$/.test(stemWord)) {
      const singular = stemWord.endsWith("aux")
        ? stemWord.slice(0, -3) + "al"
        : stemWord.replace(/s$/, "");
      return {
        word: rawWord,
        cleanWord: stemWord,
        lemma: singular,
        pos: "名詞 / 形容詞 / 動詞變位",
        morphology: `字尾帶 -${stemWord.slice(-1)}：通常為複數形式（單數參考：${singular}）或第二人稱單數動詞變位`,
        zhHint: null,
        elision: prefixNote
      };
    }

    // Default fallback
    return {
      word: rawWord,
      cleanWord: stemWord,
      lemma: stemWord,
      pos: "名詞 / 形容詞 / 動詞",
      morphology: "單數形式或基礎詞幹",
      zhHint: null,
      elision: prefixNote
    };
  }

  /**
   * Analyze a full French sentence or phrase for grammatical structures
   */
  function analyzeSentenceGrammar(text) {
    const notes = [];
    const lower = text.toLowerCase();

    // Check negation structures
    if (/\b(ne|n['’])\b.*?\bque\b/i.test(text)) {
      notes.push({
        pattern: "ne ... que",
        type: "限制句型",
        explanation: "表示「只有…才…、僅僅…」（相當於 seulement），並非否定句。"
      });
    } else if (/\b(ne|n['’])\b.*?\bplus\b/i.test(text)) {
      notes.push({
        pattern: "ne ... plus",
        type: "否定句型",
        explanation: "表示「不再…、再也沒有…」。"
      });
    } else if (/\b(ne|n['’])\b.*?\bjamais\b/i.test(text)) {
      notes.push({
        pattern: "ne ... jamais",
        type: "否定句型",
        explanation: "表示「從不…、絕不…」。"
      });
    } else if (/\b(ne|n['’])\b.*?\brien\b/i.test(text)) {
      notes.push({
        pattern: "ne ... rien",
        type: "否定句型",
        explanation: "表示「什麼也沒有、毫不…」。"
      });
    } else if (/\b(ne|n['’])\b.*?\bpoint\b/i.test(text)) {
      notes.push({
        pattern: "ne ... point",
        type: "文學否定句型",
        explanation: "文學與古典雅語中的「ne ... pas」（完全不、毫無）。"
      });
    } else if (/\b(ne|n['’])\b.*?\bpas\b/i.test(text)) {
      notes.push({
        pattern: "ne ... pas",
        type: "基礎否定句型",
        explanation: "夾住變位動詞，表示「不…、沒有…」。"
      });
    }

    // Check gérondif (en + -ant)
    const gerondifMatch = text.match(/\b(tout\s+)?en\s+([a-zàâçéèêëîïôûùüÿœæ]+ant)\b/i);
    if (gerondifMatch) {
      notes.push({
        pattern: gerondifMatch[0],
        type: "副動詞結構 (Gérondif)",
        explanation: "「(tout) en + 現在分詞 (-ant)」表示兩個動作同時進行（「一邊…一邊…」）或表方式、條件。"
      });
    }

    // Check c'est ... que / qui (phrase clivée)
    if (/\bc['’]est\b.*?\b(qui|que|qu['’])\b/i.test(text)) {
      notes.push({
        pattern: "C'est ... qui / que",
        type: "強調句型 (Mise en relief)",
        explanation: "法文常見的強調結構，用來突顯句中的主詞、時間或受詞（「正是…的時候／人」）。"
      });
    }

    // Check l'on / on
    if (/\bl['’]on\b/i.test(text) || /\bon\b/i.test(text)) {
      notes.push({
        pattern: "on / l'on",
        type: "泛指人稱代名詞",
        explanation: "動詞搭配第三人稱單數變位，可指「人們、大家、我們」。母音後常加 l' 成為 l'on 以求發音優雅。"
      });
    }

    // Check contractions (du, au, aux, des)
    const contractions = [];
    if (/\bdu\b/i.test(lower)) contractions.push("du (= de + le)");
    if (/\bau\b/i.test(lower)) contractions.push("au (= à + le)");
    if (/\baux\b/i.test(lower)) contractions.push("aux (= à + les)");
    if (/\bdes\b/i.test(lower)) contractions.push("des (= de + les 或不定冠詞複數)");
    if (contractions.length > 0) {
      notes.push({
        pattern: contractions.join(" · "),
        type: "縮合冠詞 (Articles contractés)",
        explanation: "介系詞 à 或 de 遇到陽性單數定冠詞 le 或複數定冠詞 les 時，必須強制縮合。"
      });
    }

    // Extract key tokens from the sentence that have rich morphological info
    const rawTokens = text
      .split(/\s+/)
      .map(t => t.replace(/^[«»"'“”‘’()[\],.!?;:—–-]+|[«»"'“”‘’()[\],.!?;:—–-]+$/g, ''))
      .filter(t => t.length > 2);

    const tokenBreakdown = [];
    const seen = new Set();
    for (const tok of rawTokens) {
      const info = inferMorphology(tok);
      const key = info.cleanWord.toLowerCase();
      if (seen.has(key)) continue;
      if (info.zhHint || info.lemma !== info.cleanWord || info.elision) {
        seen.add(key);
        tokenBreakdown.push(info);
      }
      if (tokenBreakdown.length >= 6) break;
    }

    return {
      grammarNotes: notes,
      tokenBreakdown
    };
  }

  /**
   * Determine if selected text is a single word / phrase / idiom or a full sentence
   */
  function analyzeSelection(selectedText, contextSentence = "") {
    const trimmed = (selectedText || "").trim();
    const cleanKey = trimmed.toLowerCase().replace(/^[«»"'“”‘’()[\],.!?;:—–-]+|[«»"'“”‘’()[\],.!?;:—–-]+$/g, '');

    // Check if entire selection is a known multi-word phrase/idiom
    if (COMMON_PHRASES[cleanKey]) {
      const entry = COMMON_PHRASES[cleanKey];
      return {
        mode: "word",
        selectedText: trimmed,
        wordCount: trimmed.split(/\s+/).length,
        primaryMorph: {
          word: trimmed,
          cleanWord: cleanKey,
          lemma: entry.lemma,
          pos: entry.pos,
          morphology: "慣用字組 / 片語",
          zhHint: entry.zh,
          elision: null
        },
        tokens: [],
        sentenceAnalysis: null
      };
    }

    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const isWordMode = wordCount <= 3 && !/[.!?;:]/.test(trimmed);

    if (isWordMode) {
      const morph = inferMorphology(trimmed);
      const tokens = wordCount > 1
        ? trimmed.split(/\s+/).map(w => inferMorphology(w))
        : [morph];
      return {
        mode: "word",
        selectedText: trimmed,
        wordCount,
        primaryMorph: morph,
        tokens,
        sentenceAnalysis: contextSentence ? analyzeSentenceGrammar(contextSentence) : null
      };
    } else {
      const sentenceAnalysis = analyzeSentenceGrammar(trimmed);
      return {
        mode: "sentence",
        selectedText: trimmed,
        wordCount,
        primaryMorph: null,
        tokens: sentenceAnalysis.tokenBreakdown,
        sentenceAnalysis
      };
    }
  }

  return {
    COMMON_PHRASES,
    CORE_LEXICON,
    inferMorphology,
    analyzeSentenceGrammar,
    analyzeSelection
  };
});
