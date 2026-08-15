# -*- coding: utf-8 -*-
"""真实环境点击测试：验证三个页头盒子（设置/免责声明/更新数据）边框点击是否生效。"""
import time
import webview

INDEX = r'E:\harness\sjtu-link\app.html'


def runner():
    time.sleep(8)
    w = webview.windows[0]

    def js(expr):
        return w.evaluate_js(expr)

    try:
        # 等待所有脚本模块加载完成
        for _ in range(60):
            try:
                if js("!!(window.JWD_QR && window.JWD_PERSONAL && window.JWD_COUNTDOWN)"):
                    break
            except Exception:
                pass
            time.sleep(0.5)
        print('page ready, title:', repr(js("document.title")), flush=True)

        # 若免责声明弹窗开着，先点同意关闭
        js("var m=document.querySelector('.disclaimer-mask');"
           "if(m&&m.classList.contains('show')){document.getElementById('disclaimer-agree').click();}")
        time.sleep(1)

        # 1) 设置：点击整个盒子（不点按钮）应打开面板
        r1 = js("(function(){"
                "document.getElementById('settings-wrap').dispatchEvent(new MouseEvent('click',{bubbles:true}));"
                "var m=document.querySelector('.settings-mask');"
                "return (m&&m.classList.contains('show'))?'SHOW':'NO';})()")
        print('SETTINGS wrap click ->', r1, flush=True)
        js("var m=document.querySelector('.settings-mask');if(m){document.getElementById('settings-close').click();}")
        time.sleep(0.5)

        # 2) 免责声明：点击整个盒子应弹出弹窗
        r2 = js("(function(){"
                "document.getElementById('disclaimer-wrap').dispatchEvent(new MouseEvent('click',{bubbles:true}));"
                "var m=document.querySelector('.disclaimer-mask');"
                "return (m&&m.classList.contains('show'))?'SHOW':'NO';})()")
        print('DISCLAIMER wrap click ->', r2, flush=True)
        js("var m=document.querySelector('.disclaimer-mask');"
           "if(m&&m.classList.contains('show')){document.getElementById('disclaimer-agree').click();}")
        time.sleep(0.5)

        # 3) 更新数据：清空按钮文字后点击盒子，应立即变为「检查中…」
        r3 = js("(function(){"
                "var b=document.getElementById('update-btn');"
                "b.textContent='';"
                "document.getElementById('update-wrap').dispatchEvent(new MouseEvent('click',{bubbles:true}));"
                "return JSON.stringify(document.getElementById('update-btn').textContent);})()")
        print('UPDATE wrap click -> button text now:', r3, flush=True)
        time.sleep(1)
        # 按钮自身点击也应正常（对照）
        r4 = js("(function(){"
                "var b=document.getElementById('update-btn');"
                "b.textContent='';"
                "b.click();"
                "return JSON.stringify(document.getElementById('update-btn').textContent);})()")
        print('UPDATE button click -> button text now:', r4, flush=True)
    finally:
        try:
            w.destroy()
        except Exception:
            pass


webview.create_window('audit', INDEX, width=1100, height=800)
webview.start(runner, private_mode=False)
print('audit done', flush=True)
