# -*- coding: utf-8 -*-
"""launcher 缓存失效机制测试。
场景 A：文件更新 -> 清缓存成功 -> 标记更新
场景 B：清缓存失败（目录被占用模拟）-> 标记不更新（下次重试）
场景 C：无变化 -> 不重复清缓存
"""
import os
import shutil
import sys
import tempfile

sys.path.insert(0, r'E:\harness\sjtu-link')
import launcher

tmp = tempfile.mkdtemp(prefix='jwd_cache_test_')


def setup(has_marker, marker_val=None):
    """构造隔离环境：临时前端文件 + 临时缓存目录 + 可选标记文件。"""
    appdir = os.path.join(tmp, 'app')
    os.makedirs(appdir, exist_ok=True)
    cache1 = os.path.join(tmp, 'cache', 'Cache')
    cache2 = os.path.join(tmp, 'cache', 'Code Cache')
    os.makedirs(cache1, exist_ok=True)
    os.makedirs(cache2, exist_ok=True)
    # 缓存里放点假内容
    with open(os.path.join(cache1, 'data_1'), 'w') as f:
        f.write('stale')
    with open(os.path.join(cache2, 'js'), 'w') as f:
        f.write('stale-js')
    # 前端文件
    html = os.path.join(appdir, 'app.html')
    with open(html, 'w') as f:
        f.write('html')
    js = os.path.join(appdir, 'x.js')
    with open(js, 'w') as f:
        f.write('js')
    marker = os.path.join(appdir, '.app_cache_ver')
    if has_marker:
        with open(marker, 'w') as f:
            f.write(str(marker_val))
    # 打桩
    launcher.APP_DIR = appdir
    launcher.INDEX_HTML = html
    launcher.WEBVIEW_CACHE_DIRS = [cache1, cache2]
    launcher.CACHE_MARKER = marker
    return appdir, marker


def read_marker(marker):
    try:
        with open(marker, 'r') as f:
            return int(f.read().strip())
    except Exception:
        return None


# 场景 A：首次运行（无标记）-> 清缓存 + 写标记
setup(False)
launcher.invalidate_stale_cache()
a_ok = (not os.path.exists(os.path.join(tmp, 'cache', 'Cache'))) and \
       (read_marker(launcher.CACHE_MARKER) == launcher._frontend_mtime())
print('A) first run clears cache & writes marker:', a_ok)

# 场景 C：再次运行（标记一致）-> 不再清缓存（重建缓存目录后应保留）
os.makedirs(os.path.join(tmp, 'cache', 'Cache'), exist_ok=True)
with open(os.path.join(tmp, 'cache', 'Cache', 'data_2'), 'w') as f:
    f.write('new')
launcher.invalidate_stale_cache()
c_ok = os.path.exists(os.path.join(tmp, 'cache', 'Cache', 'data_2'))
print('C) no change -> cache untouched:', c_ok)

# 场景 B：文件更新 + 缓存目录被占用（用只读文件模拟删除失败）
setup(True, launcher._frontend_mtime())
# 在缓存目录放一个只读文件（Windows 下删除会失败）
ro = os.path.join(tmp, 'cache', 'Cache', 'locked')
with open(ro, 'w') as f:
    f.write('lock')
os.chmod(ro, 0o444)
before_marker = read_marker(launcher.CACHE_MARKER)
# 让前端文件更新（mtime 变化）
html = launcher.INDEX_HTML
os.utime(html, (os.path.getatime(html), os.path.getmtime(html) + 5))
launcher.invalidate_stale_cache()
b_ok = (read_marker(launcher.CACHE_MARKER) == before_marker)
print('B) delete failed -> marker NOT updated (retry next launch):', b_ok)
os.chmod(ro, 0o644)

failed = not (a_ok and c_ok and b_ok)
print('LAUNCHER CACHE TESTS:', 'ALL PASSED' if not failed else 'FAILED')
shutil.rmtree(tmp, ignore_errors=True)
sys.exit(1 if failed else 0)
