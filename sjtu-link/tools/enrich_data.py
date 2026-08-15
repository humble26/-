# -*- coding: utf-8 -*-
"""
为「交我导」数据文件增强拼音搜索字段（离线执行一次即可）。

- py    : name + cat + desc 的完整拼音（小写、无音调、非中文原样小写）
- pyi   : 上述文本的拼音首字母缩写（如 教务处 -> jwc，SJTU -> sjtu）
- data/pinyin-map.js : 「字符 -> 拼音」映射表，供应用运行时对在线更新的
  新数据在浏览器端重新生成拼音字段。

流程：node 把 JS 数组提取为 JSON -> pypinyin 生成字段 -> 重新序列化为 JS 文件。
用法：python tools/enrich_data.py
依赖：pip install pypinyin；本机可用 node。
"""
import io
import json
import os
import re
import subprocess

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(TOOLS_DIR)
DATA_DIR = os.path.join(APP_DIR, 'data')

EXTRACT_JS = os.path.join(TOOLS_DIR, '_extract.js')
MAP_JS_PATH = os.path.join(DATA_DIR, 'pinyin-map.js')

TARGETS = [
    ('jiaowodao-data.js', 'JIAOWODAO_DATA'),
    ('jiaowodao-clubs.js', 'JIAOWODAO_CLUB_DATA'),
]

_CN_RE = re.compile('[\u4e00-\u9fff]')


def extract_json(file_path, var_name):
    out = subprocess.check_output(
        ['node', EXTRACT_JS, file_path, var_name],
        encoding='utf-8', errors='replace')
    return json.loads(out)


def build_pinyin_fields(text):
    from pypinyin import lazy_pinyin, Style
    if not text:
        return '', ''
    full = lazy_pinyin(text, style=Style.NORMAL)
    initials = lazy_pinyin(text, style=Style.FIRST_LETTER)
    py = ''.join(full)
    pyi = ''.join(initials)
    # lazy_pinyin 对非中文段落原样保留（大小写保持），统一小写
    py = py.lower()
    pyi = pyi.lower()
    return py, pyi


def enrich(items):
    for it in items:
        text = ' '.join(str(x) for x in
                        [it.get('name'), it.get('cat'), it.get('desc')] if x)
        py, pyi = build_pinyin_fields(text)
        it['py'] = py
        it['pyi'] = pyi
    return items


def write_js(file_path, meta_text, var_name, items):
    lines = [meta_text.rstrip('\n'), '', 'window.%s = [' % var_name]
    for it in items:
        lines.append('  ' + json.dumps(it, ensure_ascii=False) + ',')
    lines.append('];')
    io.open(file_path, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')


def collect_texts(items):
    """收集所有参与拼音的文本（含公众号名/QQ 备注，扩大映射表覆盖）"""
    texts = []
    for it in items:
        for k in ('name', 'cat', 'desc', 'wechatName', 'qqNote'):
            v = it.get(k)
            if isinstance(v, str) and v:
                texts.append(v)
    return texts


def generate_pinyin_map(all_texts):
    """生成 {字符: 拼音} 映射表（用于浏览器端对新数据再生成拼音字段）。"""
    from pypinyin import lazy_pinyin, Style
    chars = set()
    for text in all_texts:
        for ch in text:
            if _CN_RE.match(ch):
                chars.add(ch)
    mapping = {}
    for ch in sorted(chars):
        py = ''.join(lazy_pinyin(ch, style=Style.NORMAL)).lower()
        if py:
            mapping[ch] = py
    return mapping


def write_pinyin_map(mapping):
    body = 'window.JIAOWODAO_PINYIN = ' + json.dumps(
        mapping, ensure_ascii=False, sort_keys=True) + ';\n'
    io.open(MAP_JS_PATH, 'w', encoding='utf-8', newline='\n').write(body)
    print('已写入拼音映射表 %s（%d 个汉字）' % (MAP_JS_PATH, len(mapping)))


def main():
    all_texts = []
    for fname, var_name in TARGETS:
        path = os.path.join(DATA_DIR, fname)
        with io.open(path, encoding='utf-8') as f:
            text = f.read()
        # 提取 META 行（保持原样输出）
        m = re.search(r'window\.JIAOWODAO_[A-Z_]*META\s*=\s*\{[^}]*\};', text)
        meta_text = m.group(0) if m else ''
        items = extract_json(path, var_name)
        print('%s: %d 条' % (fname, len(items)))
        enrich(items)
        write_js(path, meta_text, var_name, items)
        all_texts.extend(collect_texts(items))
        print('  已写入拼音字段（py / pyi）')
    write_pinyin_map(generate_pinyin_map(all_texts))


if __name__ == '__main__':
    main()
