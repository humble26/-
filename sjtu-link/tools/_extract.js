// 辅助脚本：把「交我导」数据 JS 文件中的数组原样提取为 JSON（避免手写 JS 解析器）。
// 用法：node _extract.js <数据文件路径> <全局变量名>
const fs = require('fs');
const file = process.argv[2];
const varName = process.argv[3];
if (!file || !varName) { console.error('usage: node _extract.js <file> <varName>'); process.exit(1); }
const src = fs.readFileSync(file, 'utf8');
const sandbox = {};
// 数据文件只含对象/数组字面量，eval 是安全的
new Function('window', src)(sandbox);
const data = sandbox[varName];
if (!Array.isArray(data)) { console.error('not an array: ' + varName); process.exit(1); }
process.stdout.write(JSON.stringify(data));
