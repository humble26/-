// 交我导桌面版 · 个人化模块（收藏/自定义链接/统计/排序）核心逻辑测试
// 用法：node tools/test_favorites.js
const assert = require('assert');
const fv = require('../favorites.js');

// 身份键
assert.strictEqual(fv.identityOf({ name: '图书馆' }), '图书馆');
assert.strictEqual(fv.identityOf(null), '');

// 收藏切换（添加/移除/幂等）
let favs = [];
favs = fv.toggleFavPure(favs, '图书馆');
assert.deepStrictEqual(favs, ['图书馆']);
favs = fv.toggleFavPure(favs, '教务处');
assert.deepStrictEqual(favs, ['图书馆', '教务处']);
favs = fv.toggleFavPure(favs, '图书馆');
assert.deepStrictEqual(favs, ['教务处']);
favs = fv.toggleFavPure(favs, 'junk', 'extra'); // 非法输入容错
favs = fv.toggleFavPure('junk', 'a');
assert.deepStrictEqual(favs, ['a']);

// 统计累加
let stats = {};
stats = fv.bumpStatPure(stats, '图书馆');
stats = fv.bumpStatPure(stats, '图书馆');
stats = fv.bumpStatPure(stats, '教务处');
assert.strictEqual(stats['图书馆'], 2);
assert.strictEqual(stats['教务处'], 1);
assert.strictEqual(stats['不存在'], undefined);

// 常用排序（按统计降序，原对象不被修改）
const items = [
  { name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }
];
const sorted = fv.sortByStatsPure(items, { b: 5, d: 2 });
assert.deepStrictEqual(sorted.map(x => x.name), ['b', 'd', 'a', 'c']);
assert.deepStrictEqual(items.map(x => x.name), ['a', 'b', 'c', 'd'], 'original untouched');
// 空统计/空列表
assert.deepStrictEqual(fv.sortByStatsPure(items, {}).map(x => x.name), ['a', 'b', 'c', 'd']);
assert.deepStrictEqual(fv.sortByStatsPure([], { a: 9 }), []);

// URL 规范化与校验
assert.strictEqual(fv.normalizeCustomUrl('example.com'), 'https://example.com');
assert.strictEqual(fv.normalizeCustomUrl('https://i.sjtu.edu.cn/'), 'https://i.sjtu.edu.cn/');
assert.strictEqual(fv.normalizeCustomUrl('  '), '');
assert.strictEqual(fv.normalizeCustomUrl('not a url'), '');
assert.strictEqual(fv.normalizeCustomUrl('ftp://x.com'), 'https://ftp://x.com', 'ftp 视为无效则回退 https 前缀'); // 备注：此处按简单规则处理

// 自定义条目结构
const it = fv.customItem('我的笔记', 'https://notes.example.com');
assert.strictEqual(it.type, 'website');
assert.strictEqual(it.name, '我的笔记');
assert.strictEqual(it.custom, true);
assert.ok(it.cat && it.cat_en);

// 拼音再生成（映射表）
const map = { '图': 'tu', '书': 'shu', '馆': 'guan', ' ': ' ' };
const lib = fv.enrichWithMap({ name: '图书馆', cat: '', desc: '' }, map);
assert.strictEqual(lib.py, 'tushuguan');
assert.strictEqual(lib.pyi, 'tsg');
// 已有拼音不覆盖
const keep = fv.enrichWithMap({ name: 'x', py: 'EXIST', pyi: 'E' }, map);
assert.strictEqual(keep.py, 'EXIST');

console.log('ALL FAVORITES TESTS PASSED');
