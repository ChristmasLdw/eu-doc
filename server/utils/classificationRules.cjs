const { db } = require('../db.cjs');

const RULES = [
  {
    consumer: ['运动户外', '马术用品', '马术头盔'],
    compliance: ['PPE / 个人防护法规'],
    standards: [/\bEN\s*1384\b/i, /\bVG1\b/i],
    keywords: [/equestrian/i, /riding helmet/i, /horse riding/i, /马术|骑马/],
    reason: '识别到马术头盔关键词或 EN 1384 / VG1 标准',
    confidence: 'high',
  },
  {
    consumer: ['运动户外', '自行车用品', '自行车头盔'],
    compliance: ['PPE / 个人防护法规'],
    standards: [/\bEN\s*1078\b/i],
    keywords: [/bicycle helmet/i, /bike helmet/i, /cycling helmet/i, /skate helmet/i, /自行车头盔|骑行头盔/],
    reason: '识别到骑行头盔关键词或 EN 1078 标准',
    confidence: 'high',
  },
  {
    consumer: ['母婴儿童与玩具', '儿童玩具'],
    compliance: ['Toy Safety 玩具安全'],
    standards: [/\bEN\s*71\b/i],
    keywords: [/toy/i, /children.*toy/i, /玩具/],
    reason: '识别到玩具关键词或 EN 71 标准',
    confidence: 'high',
  },
  {
    consumer: ['电子电器', '电源与充电', '充电器'],
    compliance: ['LVD 低电压', 'EMC 电磁兼容', 'RoHS / REACH'],
    standards: [/\bEN\s*60335\b/i, /\bEN\s*62368\b/i, /\bEN\s*55032\b/i, /\bEN\s*55035\b/i, /\bEN\s*61000\b/i],
    keywords: [/charger/i, /adapter/i, /power supply/i, /充电器|适配器|电源/],
    reason: '识别到电源/充电器关键词或电子电器常见标准',
    confidence: 'medium',
  },
  {
    consumer: ['电子电器', '音视频设备'],
    compliance: ['EMC 电磁兼容', 'LVD 低电压'],
    standards: [/\bEN\s*62368\b/i, /\bEN\s*55032\b/i, /\bEN\s*55035\b/i],
    keywords: [/audio/i, /speaker/i, /video/i, /音响|音频|视频/],
    reason: '识别到音视频设备关键词或 EN 62368 / EMC 标准',
    confidence: 'medium',
  },
  {
    consumer: ['个人防护与安全', '眼面防护'],
    compliance: ['PPE / 个人防护法规'],
    standards: [/\bEN\s*166\b/i],
    keywords: [/goggle/i, /safety glasses/i, /face shield/i, /护目镜|面罩/],
    reason: '识别到眼面防护关键词或 EN 166 标准',
    confidence: 'high',
  },
  {
    consumer: ['个人防护与安全', '手部/足部防护'],
    compliance: ['PPE / 个人防护法规'],
    standards: [/\bEN\s*388\b/i, /\bEN\s*ISO\s*20345\b/i],
    keywords: [/glove/i, /safety shoe/i, /protective footwear/i, /手套|安全鞋|防护鞋/],
    reason: '识别到手足防护关键词或 EN 388 / EN ISO 20345 标准',
    confidence: 'high',
  },
  {
    consumer: ['医疗健康', '护理用品'],
    compliance: ['Medical Device 医疗器械'],
    standards: [/\bEN\s*14683\b/i, /\bEN\s*149\b/i],
    keywords: [/mask/i, /respirator/i, /medical/i, /口罩|医用|防护口罩/],
    reason: '识别到口罩/医疗关键词或 EN 14683 / EN 149 标准',
    confidence: 'medium',
  },
  {
    consumer: ['工业工具与机械', '机械设备'],
    compliance: ['Machinery 机械设备'],
    standards: [/\bEN\s*ISO\s*12100\b/i, /\bEN\s*60204\b/i],
    keywords: [/machinery/i, /machine/i, /机械|设备/],
    reason: '识别到机械设备关键词或机械安全标准',
    confidence: 'medium',
  },
  {
    consumer: ['厨房与食品接触'],
    compliance: ['RoHS / REACH'],
    standards: [/food contact/i, /LFGB/i],
    keywords: [/food contact/i, /kitchen/i, /tableware/i, /cookware/i, /食品接触|厨具|餐具/],
    reason: '识别到食品接触或厨房用品关键词',
    confidence: 'medium',
  },
];

function normalizeText(value) {
  return String(value || '').replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function getCategoryByPath(pathNames, taxonomyType) {
  let parentId = null;
  let matched = null;
  for (const name of pathNames || []) {
    matched = db.prepare(`
      SELECT id, name, parent_id, level FROM categories
      WHERE name = ? AND COALESCE(taxonomy_type, 'consumer') = ?
        AND ${parentId === null ? 'parent_id IS NULL' : 'parent_id = ?'}
        AND COALESCE(status, 'active') = 'active'
      ORDER BY id ASC LIMIT 1
    `).get(...(parentId === null ? [name, taxonomyType] : [name, taxonomyType, parentId]));
    if (!matched) return null;
    parentId = matched.id;
  }
  return matched;
}

function scoreRule(rule, text) {
  let score = 0;
  const matched = [];
  for (const pattern of rule.standards || []) {
    if (pattern.test(text)) {
      score += 6;
      matched.push(pattern.source.replace(/\\b|\\s\*|\^|\$/g, '').replace(/\\/g, ''));
    }
  }
  for (const pattern of rule.keywords || []) {
    if (pattern.test(text)) {
      score += 3;
      matched.push(pattern.source.replace(/\\/g, ''));
    }
  }
  return { score, matched };
}

function buildCategoryPath(category) {
  if (!category) return '';
  const chain = [];
  let current = category;
  let guard = 0;
  while (current && guard < 5) {
    chain.unshift(current.name);
    current = current.parent_id ? db.prepare('SELECT id, name, parent_id FROM categories WHERE id = ?').get(current.parent_id) : null;
    guard += 1;
  }
  return chain.join(' / ');
}

function suggestProductClassification(input = {}) {
  const text = normalizeText([
    input.fileName,
    input.productName,
    input.model,
    input.documentType,
    input.standard,
    input.issuer,
    input.extractedText,
  ].filter(Boolean).join(' '));
  if (!text) return null;

  const ranked = RULES
    .map((rule) => ({ rule, ...scoreRule(rule, text) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best) return null;

  const consumerCategory = getCategoryByPath(best.rule.consumer, 'consumer');
  const complianceCategories = (best.rule.compliance || []).map((path) => getCategoryByPath([path], 'compliance')).filter(Boolean);
  const confidence = best.score >= 6 ? best.rule.confidence || 'high' : 'medium';
  return {
    consumerCategoryId: consumerCategory?.id || null,
    consumerCategoryPath: buildCategoryPath(consumerCategory),
    complianceCategoryIds: complianceCategories.map((category) => category.id),
    complianceCategoryPaths: complianceCategories.map(buildCategoryPath),
    confidence,
    reason: best.rule.reason,
    matchedSignals: best.matched.slice(0, 5),
  };
}

module.exports = { suggestProductClassification };
