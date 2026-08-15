/* 交我导桌面版 · 右键卡片菜单（复制标题 / 复制链接 / 复制名称） */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var menu = null;
  var current = null;

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function copyText(text, label) {
    var ok = false;
    try {
      var input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      ok = document.execCommand('copy');
      input.remove();
    } catch (e) { /* ignore */ }
    if (!ok && navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(function () {});
    }
    showToast(t('toastCopied', { name: label || text }));
  }

  function hideMenu() {
    if (menu) menu.style.display = 'none';
  }

  function openMenu(x, y, card) {
    var nameEl = card.querySelector('.name');
    var title = nameEl ? nameEl.textContent : '';
    var link = card.tagName === 'A' ? card.href : '';
    current = { title: title, link: link };

    var html = '';
    html += '<div class="ctx-item" data-act="title">' + escHtml(t('ctxCopyTitle')) + '</div>';
    if (link) {
      html += '<div class="ctx-item" data-act="link">' + escHtml(t('ctxCopyLink')) + '</div>';
    } else {
      html += '<div class="ctx-item" data-act="name">' + escHtml(t('ctxCopyName')) + '</div>';
    }
    html += '<div class="ctx-item" data-act="qr">' + escHtml(t('qrMenu')) + '</div>';
    menu.innerHTML = html;
    menu.style.display = 'block';
    var mw = menu.offsetWidth;
    var mh = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth - mw - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(y, window.innerHeight - mh - 8)) + 'px';
  }

  function ensureMenu() {
    if (menu) return;
    menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.display = 'none';
    document.body.appendChild(menu);
    menu.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('.ctx-item') : null;
      if (!el || !current) return;
      var act = el.getAttribute('data-act');
      if (act === 'title') copyText(current.title, current.title);
      else if (act === 'link') copyText(current.link, current.title);
      else if (act === 'name') copyText(current.title, current.title);
      else if (act === 'qr' && window.JWD_QR) {
        window.JWD_QR.show({ title: current.title, url: current.link });
      }
      hideMenu();
    });
  }

  ensureMenu();

  document.addEventListener('contextmenu', function (e) {
    var card = e.target && e.target.closest ? e.target.closest('.card') : null;
    if (!card) {
      hideMenu();
      return;
    }
    e.preventDefault();
    openMenu(e.clientX, e.clientY, card);
  });

  document.addEventListener('click', hideMenu);
  window.addEventListener('scroll', hideMenu, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideMenu();
  });
})();
