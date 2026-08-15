# -*- coding: utf-8 -*-
"""
资源版本同步：把 app.html 中所有 css/js 资源引用加上 ?v=<版本号>。

版本号取自 settings.js 的 VERSION。版本更新后运行本脚本，资源 URL 随之变化，
WebView2/Edge 便不可能命中旧缓存（配合 launcher 的缓存清理形成双层保障）。

用法：python tools/sync_assets.py
"""
import io
import os
import re

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(TOOLS_DIR)
APP_HTML = os.path.join(APP_DIR, 'app.html')
SETTINGS_JS = os.path.join(APP_DIR, 'settings.js')


def read_version():
    s = io.open(SETTINGS_JS, encoding='utf-8').read()
    m = re.search(r"var VERSION = '([0-9]+\.[0-9]+\.[0-9]+)';", s)
    if not m:
        raise RuntimeError('VERSION not found in settings.js')
    return m.group(1)


def sync(version):
    s = io.open(APP_HTML, encoding='utf-8').read()

    def repl(m):
        pre, name, q, post = m.group(1), m.group(2), m.group(3) or '', m.group(4)
        if q:
            # 已有查询串：替换 v 参数（?v= 或 &v= 均可）；没有则追加
            if re.search(r'[?&]v=', q):
                q = re.sub(r'([?&])v=[^&]*', r'\g<1>v=' + version, q)
            else:
                q += '&v=' + version
        else:
            q = '?v=' + version
        return pre + name + q + post

    # 仅处理本地相对资源（css/js），不动 http(s) 外链与 data: 内联
    pattern = re.compile(
        r'((?:src|href)=")((?!https?:|data:|#)[^"]+?\.(?:js|css))(\?[^"]*)?(")')
    new, n = pattern.subn(repl, s)
    if n == 0:
        raise RuntimeError('no local js/css refs found in app.html')
    io.open(APP_HTML, 'w', encoding='utf-8', newline='\n').write(new)
    return n


if __name__ == '__main__':
    v = read_version()
    n = sync(v)
    print('synced %d asset refs to ?v=%s' % (n, v))
