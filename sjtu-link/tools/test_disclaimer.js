// 交我导桌面版 · 免责声明核心逻辑测试
// 用法：node tools/test_disclaimer.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dl = require('../disclaimer.js');

assert.strictEqual(dl.STORAGE_KEY, 'jiaowodao_disclaimer');
// 默认（未存储）应显示
assert.strictEqual(dl.shouldShow(''), true);
assert.strictEqual(dl.shouldShow(undefined), true);
assert.strictEqual(dl.shouldShow(null), true);
// 已勾选"不再显示"则不显示
assert.strictEqual(dl.shouldShow('1'), false);
assert.strictEqual(dl.shouldShow('other'), true);
// Node 无 localStorage：读写优雅降级，不抛错
dl.setStored(false);   // 不应抛错
dl.setStored(true);
assert.strictEqual(dl.getStored(), '');

// 免责声明双语解析：zh/en + 回退逻辑
const dict = {
  zh: { t: '标题', a: '内容' },
  en: { t: 'Title', a: 'Body' }
};
assert.strictEqual(dl.resolveText('zh', 't', dict), '标题');
assert.strictEqual(dl.resolveText('en', 't', dict), 'Title');
assert.strictEqual(dl.resolveText('zh', 'a', dict), '内容');
// 该语言缺键但中文有 -> 回退中文
assert.strictEqual(dl.resolveText('en', 't', { zh: { t: '标题' }, en: {} }), '标题');
// 未知语言 -> 回退中文
assert.strictEqual(dl.resolveText('fr', 't', dict), '标题');
// 两字典都缺键 -> 返回键名；无字典 -> 返回键名
assert.strictEqual(dl.resolveText('en', 'missing', dict), 'missing');
assert.strictEqual(dl.resolveText('zh', 't', null), 't');

// ---------- 真实 i18n 字典校验（直接从 app.html 提取，防止注入错位） ----------
const html = fs.readFileSync(path.join(__dirname, '../app.html'), 'utf8');
const start = html.indexOf('const i18n = {');
assert.ok(start >= 0, 'i18n block found');
// 花括号配平提取 i18n 对象
let depth = 0, end = start;
for (let i = start; i < html.length; i++) {
  if (html[i] === '{') depth++;
  else if (html[i] === '}') {
    depth--;
    if (depth === 0) { end = i + 1; break; }
  }
}
const block = html.slice(start, end);
const i18nReal = new Function(block + '; return i18n;')();

const ZH = i18nReal.zh, EN = i18nReal.en;
const keys = ['disclaimerTitle', 'disclaimerTag', 'disclaimerAlert', 'disclaimerBody',
              'disclaimerAgree', 'disclaimerExit', 'disclaimerNever', 'disclaimerReopen'];
for (const k of keys) {
  assert.ok(typeof ZH[k] === 'string' && ZH[k], 'zh has key ' + k);
  assert.ok(typeof EN[k] === 'string' && EN[k], 'en has key ' + k);
}
// 中文必须是中文，且含 <b> 重点词高亮
assert.ok(ZH.disclaimerAlert.includes('非官方'), 'zh alert chinese');
assert.strictEqual(ZH.disclaimerTag, '重要提示');
assert.ok(ZH.disclaimerBody.includes('认证主体与官方标识'), 'zh body content');
assert.ok(ZH.disclaimerBody.includes('<b>认证主体与官方标识</b>'), 'zh body highlight 1');
assert.ok(ZH.disclaimerBody.includes('<b>不收集、不上传任何个人信息</b>'), 'zh body highlight 2');
// 英文必须是英文，且含高亮
assert.ok(EN.disclaimerAlert.includes('unofficial'), 'en alert english');
assert.strictEqual(EN.disclaimerTag, 'IMPORTANT');
assert.ok(EN.disclaimerBody.includes('<b>verified badge and operator</b>'), 'en body highlight');
assert.ok(EN.disclaimerBody.includes('<b>collects and uploads no personal data</b>'), 'en body highlight 2');
// 中英内容不同、无串味
assert.notStrictEqual(ZH.disclaimerBody, EN.disclaimerBody);
assert.ok(!ZH.disclaimerAlert.includes('unofficial'), 'zh alert not english');
assert.ok(!EN.disclaimerAlert.includes('非官方'), 'en alert not chinese');
// 顺带抽查其它注入词条未错位
assert.strictEqual(ZH.updateBtn, '更新数据');
assert.strictEqual(EN.updateBtn, 'Update');
assert.strictEqual(ZH.presetLabel, '热门直达');
assert.strictEqual(EN.presetLabel, 'Quick Access');
assert.strictEqual(ZH.histTitle, '搜索历史');
assert.strictEqual(EN.histTitle, 'History');

// i18n 模板参数防回归：t() 只替换 ${key}，字典中不得出现无 $ 前缀的 {key}
const tplRe = /(?<!\$)\{[a-zA-Z_][a-zA-Z0-9_]*\}/;
for (const dict of [ZH, EN]) {
  for (const k of Object.keys(dict)) {
    assert.ok(!tplRe.test(dict[k]), 'no bare template in ' + k + ': ' + dict[k]);
  }
}

console.log('ALL DISCLAIMER TESTS PASSED');
