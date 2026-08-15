// 交我导桌面版 · 真实数据搜索验证
// 用法：node tools/test_search_realdata.js
const fs = require('fs');
const path = require('path');
const core = require('../search-plus.js');

const w1 = {};
new Function('window', fs.readFileSync(path.join(__dirname, '../data/jiaowodao-data.js'), 'utf8'))(w1);
const w2 = {};
new Function('window', fs.readFileSync(path.join(__dirname, '../data/jiaowodao-clubs.js'), 'utf8'))(w2);
const items = [...w1.JIAOWODAO_DATA, ...w2.JIAOWODAO_CLUB_DATA];
console.log('real items:', items.length);

const cases = [
  ['tushuguan', '图书馆'],
  ['tsg', '图书馆'],
  ['jwc', '教务处'],
  ['xk', '教学信息服务网'],
  ['sjtu', '上海交通大学官网'],
  ['vpn', 'VPN 服务'],
  ['邮箱', '交大邮箱'],
  ['seiee', '电子信息与电气工程学院'],
  ['图书馆', '图书馆'],
  ['交大歌手', '歌手联盟'],
  ['yy', null],
  ['五星', null],
  ['zsb', null],
];
let failed = 0;
for (const [q, expect] of cases) {
  const top = core.getSuggestions(items, q, 3).map(x => x.item.name);
  console.log(('"' + q + '"').padEnd(10), '->', top.slice(0, 3).join(' | '));
  if (expect) {
    const ok = top[0] === expect;
    console.log('   期望 ' + expect + ' ' + (ok ? 'OK' : 'FAIL'));
    if (!ok) failed++;
  }
}
console.log(failed ? failed + ' FAILURES' : 'ALL REAL-DATA CHECKS PASSED');
process.exit(failed ? 1 : 0);
