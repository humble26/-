// 交我导桌面版 · 搜索核心逻辑单元测试
// 用法：node tools/test_search_core.js
const assert = require('assert');
const core = require('../search-plus.js');

const items = [
  { name: '图书馆', name_en: 'Library', cat: '综合门户', type: 'website',
    url: 'https://www.lib.sjtu.edu.cn/', desc: '馆藏检索与电子资源',
    py: 'tushuguan zonghemenhu guancangjiansuoyudianziziyuan', pyi: 'tsg zhmh gcjsydzzy' },
  { name: '教务处', name_en: 'Academic Affairs Office', cat: '职能部门', type: 'website',
    url: 'https://www.jwc.sjtu.edu.cn/', desc: '本科教学管理',
    py: 'jiaowuchu zhinengbumen benkejiaoxueguanli', pyi: 'jwc znbm bkjxgl' },
  { name: '教学信息服务网', name_en: 'Academic Information Service', cat: '综合门户', type: 'website',
    url: 'https://i.sjtu.edu.cn/', desc: '选课、成绩等教学服务',
    py: 'jiaoxuexinxifuwuwang zonghemenhu xuankechengjidengjiaoxuefuwu', pyi: 'jxxxfww zhmh xkcjdjxfu' },
  { name: '上海交通大学官网', name_en: 'SJTU Official Website', cat: '综合门户', type: 'website',
    url: 'https://www.sjtu.edu.cn/', desc: '学校中文主页',
    py: 'shanghaijiaotongdaxueguanwang zonghemenhu xuexiaozhongwenzhuye', pyi: 'shjtdxgw zhmh xxzwzy' },
  { name: '歌手联盟', name_en: '歌手联盟', type: 'club', cat: '五星社团', rating: 5,
    wechatName: '交大歌手联盟', qqGroups: ['1139417533'],
    py: 'geshoulinmeng wuxingshetuan', pyi: 'gslm wxst' },
  { name: '上海交大-密西根学院', name_en: 'UM-SJTU Joint Institute', cat: '特色学院', type: 'website',
    url: 'https://www.ji.sjtu.edu.cn/', desc: '国际化办学',
    py: 'shanghaijiaoda-mixigenxueyuan tesexueyuan guojihuabanxue', pyi: 'shjd-mxgxy tsxy gjhbx' },
];

function top(q, n) {
  return core.getSuggestions(items, q, n || 5).map(x => x.item.name);
}

// 拼音全拼
assert.strictEqual(top('tushuguan')[0], '图书馆', 'pinyin full: tushuguan -> 图书馆');
// 拼音首字母
assert.strictEqual(top('tsg')[0], '图书馆', 'pinyin initials: tsg -> 图书馆');
assert.strictEqual(top('jwc')[0], '教务处', 'pinyin initials: jwc -> 教务处');
// 描述里的拼音首字母（选课 -> xk）
assert.ok(top('xk')[0].includes('教学信息服务网'), 'desc pyi: xk -> 教学信息服务网');
// 英文名首字母
assert.strictEqual(top('sjtu')[0], '上海交通大学官网', 'en initials: sjtu -> 官网');
// 中文精确
assert.strictEqual(top('图书馆')[0], '图书馆', 'zh exact');
// 公众号名
assert.strictEqual(top('交大歌手联盟')[0], '歌手联盟', 'wechat name match');
// QQ 群号
assert.ok(top('1139417533').includes('歌手联盟'), 'qq group match');
// 无结果
assert.strictEqual(top('zzzz不存在')[0], undefined, 'no match -> empty');
// 排序：精确 > 前缀 > 包含
const exact = core.getSuggestions(items, '图书馆', 5);
assert.ok(exact[0].score > 0 && exact[0].item.name === '图书馆');
// URL 识别
assert.ok(core.isUrlLike('jaccount.sjtu.edu.cn'), 'domain is url-like');
assert.ok(core.isUrlLike('https://i.sjtu.edu.cn/'), 'http url is url-like');
assert.ok(core.isUrlLike('www.sjtu.edu.cn/a/b?x=1'), 'path url-like');
assert.ok(!core.isUrlLike('图书馆'), 'chinese not url');
assert.ok(!core.isUrlLike('jwc'), 'single word not url');
assert.strictEqual(core.normalizeUrl('jaccount.sjtu.edu.cn'), 'https://jaccount.sjtu.edu.cn');
// 英文缩写工具
assert.strictEqual(core.enInitials('SJTU Official Website'), 'sow');
assert.strictEqual(core.enInitials('UM-SJTU Joint Institute'), 'usji');
// 历史（Node 无 localStorage，应返回空数组且不抛错）
assert.deepStrictEqual(core.loadHistory(), []);
core.saveHistory('图书馆');
core.clearHistory();
assert.deepStrictEqual(core.loadHistory(), []);
// 预设栏
assert.strictEqual(core.SEARCH_PRESETS.length, 10);
assert.ok(core.SEARCH_PRESETS.some(p => p.q === 'jaccount'));

console.log('ALL SEARCH CORE TESTS PASSED (' + core.SEARCH_PRESETS.length + ' presets, ' + items.length + ' sample items)');
