// 交我导桌面版 · 数据在线更新核心逻辑测试
// 用法：node tools/test_update.js
// 说明：含一次真实网络请求（拉取 sjtu-links.pages.dev 当前数据做端到端验证）。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const upd = require('../data-update.js');

const APP = path.join(__dirname, '..');

// ---------- 1. 拼音映射表 ----------
const wmap = {};
new Function('window', fs.readFileSync(path.join(APP, 'data/pinyin-map.js'), 'utf8'))(wmap);
const map = wmap.JIAOWODAO_PINYIN;
assert.ok(map && typeof map === 'object' && Object.keys(map).length > 100, 'map loaded');
console.log('pinyin map chars:', Object.keys(map).length);

// ---------- 2. 映射表再生成拼音（模拟网站新条目） ----------
// 与离线 pypinyin 输出格式一致（语料内字符）
const it = { name: '图书馆', cat: '综合门户', desc: '馆藏检索与电子资源' };
upd.enrichItemWithMap(it, map);
assert.strictEqual(it.py, 'tushuguan zonghemenhu guancangjiansuoyudianziziyuan', 'py exact: ' + it.py);
assert.strictEqual(it.pyi, 'tsg zhmh gcjsydzzy', 'pyi exact: ' + it.pyi);
console.log('enrich corpus item OK:', it.py, '|', it.pyi);

// 语料内字符组成的新条目（如网站未来新增的学院）
const neo = { name: '未来技术学院', cat: '特色学院', desc: '学校中文主页' };
upd.enrichItemWithMap(neo, map);
assert.ok(neo.py.startsWith('weilaijishuxueyuan'), 'py name: ' + neo.py);
assert.ok(neo.pyi.startsWith('wljsxy'), 'pyi name: ' + neo.pyi);
console.log('enrich new item OK:', neo.py, '|', neo.pyi);

// 混合中英文（如 VPN 服务）
const mixed = { name: 'VPN 服务', cat: '综合门户', desc: '' };
upd.enrichItemWithMap(mixed, map);
assert.ok(mixed.py.startsWith('vpn'), 'mixed py: ' + mixed.py);
assert.ok(mixed.py.includes('fuwu'), 'mixed py fuwu');
console.log('mixed item OK:', mixed.py, '|', mixed.pyi);

// 映射表外字符优雅降级（不崩溃、不产生错误拼音）
const exotic = { name: '饕餮', cat: '', desc: '' };
upd.enrichItemWithMap(exotic, map);
assert.strictEqual(exotic.py, '', 'exotic py empty');
assert.strictEqual(exotic.pyi, '', 'exotic pyi empty');
console.log('unknown chars degrade gracefully OK');

// 已有拼音字段的条目不再覆盖
const withPy = { name: '图书馆', py: 'EXISTING', pyi: 'E' };
upd.enrichItemWithMap(withPy, map);
assert.strictEqual(withPy.py, 'EXISTING');

// ---------- 3. 版本比较 ----------
assert.strictEqual(upd.isNewerVersion('2026-07-13', '2026-07-20'), true);
assert.strictEqual(upd.isNewerVersion('2026-07-20', '2026-07-13'), false);
assert.strictEqual(upd.isNewerVersion('2026-07-13', '2026-07-13'), false);
assert.strictEqual(upd.isNewerVersion('', '2026-07-13'), true);
assert.strictEqual(upd.isNewerVersion('2026-07-13', ''), false);
console.log('version compare OK');

// ---------- 4. 缓存构造/解析 ----------
const cache = upd.buildCache({ updatedAt: '2026-07-20' }, { ratingUpdatedAt: '2026-07-01' },
                             [{ name: 'a' }], [{ name: 'b' }]);
const parsed = JSON.parse(JSON.stringify(cache));
assert.strictEqual(parsed.data[0].name, 'a');
assert.strictEqual(parsed.dataMeta.updatedAt, '2026-07-20');
console.log('cache round-trip OK');

// ---------- 5. 更新日志 ----------
const e1 = upd.makeLogEntry('2026-08-14T10:00:00Z', '2026-07-20', 303, 305, 'auto');
const e2 = upd.makeLogEntry('2026-08-15T10:00:00Z', '2026-07-25', 305, 310, 'manual');
assert.strictEqual(e1.version, '2026-07-20');
assert.strictEqual(e1.before, 303);
assert.strictEqual(e1.after, 305);
assert.strictEqual(e1.source, 'auto');
let log = upd.appendLogEntry(e1, []);
log = upd.appendLogEntry(e2, log);
assert.strictEqual(log.length, 2);
assert.strictEqual(log[1].source, 'manual');
// 上限截断：30 条
let big = [];
for (let i = 0; i < 35; i++) big = upd.appendLogEntry(upd.makeLogEntry('t', 'v', i, i + 1, 'auto'), big);
assert.strictEqual(big.length, 30);
assert.strictEqual(big[29].before, 34);
// 非法输入容错
assert.strictEqual(upd.appendLogEntry(e1, 'junk').length, 1);
assert.strictEqual(upd.appendLogEntry(null, null).length, 0);
// Node 无 localStorage：读写优雅降级
assert.deepStrictEqual(upd.readUpdateLog(), []);
upd.writeUpdateLog([e1]); // 不应抛错
console.log('update log helpers OK');

// ---------- 6. 真实远程数据端到端 ----------
(async () => {
  const base = upd.REMOTE_BASE;
  const files = upd.REMOTE_FILES;
  const sources = [];
  for (const f of files) {
    const res = await fetch(base + encodeURIComponent(f) + '?t=' + Date.now());
    assert.ok(res.ok, 'fetch ' + f + ' -> ' + res.status);
    sources.push(await res.text());
  }
  const w1 = {};
  new Function('window', sources[0])(w1);
  const w2 = {};
  new Function('window', sources[1])(w2);

  assert.ok(w1.JIAOWODAO_META && w1.JIAOWODAO_META.updatedAt, 'remote has updatedAt');
  assert.ok(Array.isArray(w1.JIAOWODAO_DATA) && w1.JIAOWODAO_DATA.length >= 100, 'remote data ok');
  console.log('remote meta:', JSON.stringify(w1.JIAOWODAO_META),
              '| club meta:', JSON.stringify(w2.JIAOWODAO_CLUB_META));
  console.log('remote counts:', w1.JIAOWODAO_DATA.length, '+', w2.JIAOWODAO_CLUB_DATA.length);

  // 用映射表为远程数据生成拼音
  upd.enrichListWithMap(w1.JIAOWODAO_DATA, map);
  upd.enrichListWithMap(w2.JIAOWODAO_CLUB_DATA, map);
  const allEnriched = w1.JIAOWODAO_DATA.every(x => typeof x.py === 'string' && x.py) &&
                      w2.JIAOWODAO_CLUB_DATA.every(x => typeof x.py === 'string' && x.py);
  assert.ok(allEnriched, 'all remote items enriched with pinyin');
  const lib = w1.JIAOWODAO_DATA.find(x => x.name.includes('图书馆'));
  assert.ok(lib && lib.pyi.indexOf('tsg') === 0, 'remote 图书馆 pyi starts tsg: ' + (lib && lib.pyi));
  console.log('remote 图书馆 py:', lib.py, '| pyi:', lib.pyi);

  // 与本地版本对比
  const localW = {};
  new Function('window', fs.readFileSync(path.join(APP, 'data/jiaowodao-data.js'), 'utf8'))(localW);
  const newer = upd.isNewerVersion(localW.JIAOWODAO_META.updatedAt, w1.JIAOWODAO_META.updatedAt);
  console.log('local:', localW.JIAOWODAO_META.updatedAt,
              '| remote:', w1.JIAOWODAO_META.updatedAt,
              '| update needed:', newer);

  console.log('ALL UPDATE TESTS PASSED');
})().catch(e => {
  console.error('E2E FAIL:', e.message);
  process.exit(1);
});
