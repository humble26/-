# -*- coding: utf-8 -*-
"""二维码真实解码验证：OpenCV 解码 test_qrcode.js 生成的 PNG，内容必须一致。"""
import io
import json
import os

import cv2

out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_qr_out')
with open(os.path.join(out_dir, 'expected.json'), encoding='utf-8') as f:
    expected = json.load(f)

log = io.open(os.path.join(out_dir, 'decode_result.txt'), 'w', encoding='utf-8')
detector = cv2.QRCodeDetector()
failed = 0
for i, text in enumerate(expected):
    png = os.path.join(out_dir, 'qr_%d.png' % i)
    img = cv2.imread(png)
    assert img is not None, 'cannot read ' + png
    data, points, _ = detector.detectAndDecode(img)
    ok = data == text
    log.write('case %d: %s -> decoded=%s %s\n' % (
        i, text[:40], data[:40] if data else '(empty)', 'OK' if ok else 'FAIL'))
    if not ok:
        failed += 1
log.write('ALL QR DECODE TESTS PASSED' if failed == 0 else '%d FAILURES' % failed)
log.close()
print('results written; failures =', failed)
exit(1 if failed else 0)
