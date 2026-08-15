// 交我导桌面版 · 二维码模块测试
// 1) 结构测试：内置 qrcode 库可用、矩阵合法、确定性
// 2) 生成 PNG 供 Python + OpenCV 解码验证
// 用法：node tools/test_qrcode.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const qrcode = require('../qrcode.js');
// 与生产代码一致：UTF-8 编码（默认 Latin-1 截断会导致中文乱码）
if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
}

// ---------- PNG 编码器（仅用于测试渲染） ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function pngEncode(modules, quiet, scale) {
  const n = modules.length;
  const px = (n + quiet * 2) * scale;
  const raw = Buffer.alloc(px * (px * 4 + 1));
  for (let y = 0; y < px; y++) {
    raw[y * (px * 4 + 1)] = 0; // filter none
    for (let x = 0; x < px; x++) {
      const mx = Math.floor((x - quiet * scale) / scale);
      const my = Math.floor((y - quiet * scale) / scale);
      const dark = mx >= 0 && my >= 0 && mx < n && my < n && modules[my][mx];
      const o = y * (px * 4 + 1) + 1 + x * 4;
      raw[o] = dark ? 0 : 255;
      raw[o + 1] = dark ? 0 : 255;
      raw[o + 2] = dark ? 0 : 255;
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(px, 0);
  ihdr.writeUInt32BE(px, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function qrMatrix(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const m = [];
  for (let r = 0; r < n; r++) {
    m.push([]);
    for (let c = 0; c < n; c++) m[r].push(qr.isDark(r, c));
  }
  return { size: n, matrix: m };
}

// ---------- 结构测试 ----------
const cases = [
  'https://www.sjtu.edu.cn/',
  'https://jaccount.sjtu.edu.cn/',
  '上海交通大学图书馆',
  'https://i.sjtu.edu.cn/very/long/path?x=1&y=2'
];
const outDir = path.join(__dirname, '_qr_out');
fs.mkdirSync(outDir, { recursive: true });

cases.forEach((text, idx) => {
  const { size, matrix } = qrMatrix(text);
  assert.ok(size >= 21 && size <= 177, 'valid version size: ' + size);
  // 三个定位角必须存在（7x7 找形图案：边框全深、中心十字深、内环白）
  const hasFinder = (r, c) => {
    const dark = (rr, cc) => matrix[r + rr][c + cc];
    return dark(0, 0) && dark(0, 6) && dark(6, 0) && dark(6, 6) &&
      dark(0, 3) && dark(3, 0) && dark(3, 6) && dark(6, 3) && dark(3, 3) &&
      !dark(1, 3) && !dark(3, 1);
  };
  assert.ok(hasFinder(0, 0) && hasFinder(0, size - 7) && hasFinder(size - 7, 0), 'finders present');
  // 确定性：同一输入两次生成一致
  const again = qrMatrix(text);
  assert.deepStrictEqual(again.matrix, matrix, 'deterministic');
  // 不同输入生成不同矩阵
  const other = qrMatrix(text + '#x');
  assert.notDeepStrictEqual(other.matrix, matrix, 'differs for diff input');
  // 写出 PNG 供解码验证
  fs.writeFileSync(path.join(outDir, 'qr_' + idx + '.png'), pngEncode(matrix, 4, 8));
  console.log('case ' + idx + ': ' + text.slice(0, 50) + ' -> ' + size + 'x' + size + ' OK');
});

// 期望内容清单（解码验证用）
fs.writeFileSync(path.join(outDir, 'expected.json'), JSON.stringify(cases, null, 2));

// ---------- 默认文件名建议 ----------
const share = require('../qrcode-share.js');
const sf = share.suggestFilename;
assert.strictEqual(sf('上海交通大学官网', 'https://www.sjtu.edu.cn/'), '上海交通大学官网.png');
assert.strictEqual(sf('图书馆', 'https://www.lib.sjtu.edu.cn/'), '图书馆.png');
// 非法字符过滤
assert.strictEqual(sf('a/b:c*d?e"f<g>h|i', 'x'), 'a_b_c_d_e_f_g_h_i.png');
// 首尾点/空格清理
assert.strictEqual(sf('  我的笔记.. ', 'x'), '我的笔记.png');
// 保留名回退
assert.strictEqual(sf('CON', 'x'), 'jiaowodao-qr.png');
assert.strictEqual(sf('nul', 'x'), 'jiaowodao-qr.png');
// 空内容回退
assert.strictEqual(sf('', ''), 'jiaowodao-qr.png');
assert.strictEqual(sf(null, null), 'jiaowodao-qr.png');
// 超长截断（60 字 + '.png' 4 字符 = 64）
const longName = '很'.repeat(100);
assert.strictEqual(sf(longName, 'x').length, 64);
// 无标题时回退到内容（连续非法字符合并为一个下划线）
assert.strictEqual(sf('', 'https://www.sjtu.edu.cn/'), 'https_www.sjtu.edu.cn_.png');
console.log('ALL FILENAME SUGGESTION TESTS PASSED');

console.log('ALL QRCODE STRUCTURAL TESTS PASSED');
