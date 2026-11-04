"""연구회 평가계획서 양식(HWPX)에서 그림·미리보기를 뺀 '빈 틀'을 만든다.

웹에서 HWPX를 만들 때 이 틀의 스타일(글꼴, 표 테두리, 배경색)을 그대로 쓴다.
사용법: python tools/make_template.py 양식.hwpx public/template/plan-template.hwpx
"""
import re
import sys
import zipfile

src, out = sys.argv[1], sys.argv[2]
zin = zipfile.ZipFile(src)
zout = zipfile.ZipFile(out, 'w')
for info in zin.infolist():
    name = info.filename
    if name.startswith('BinData/') or name == 'Preview/PrvImage.png':
        continue
    data = zin.read(name)
    if name == 'Contents/content.hpf':
        s = data.decode('utf-8')
        s = re.sub(r'<opf:item id="image\d+"[^>]*/>', '', s)
        data = s.encode('utf-8')
    if name == 'Preview/PrvText.txt':
        data = '체육 평가계획서'.encode('utf-8')
    # mimetype 은 반드시 압축하지 않고 맨 앞에 둔다(ODF/OCF 규칙)
    ctype = zipfile.ZIP_STORED if name == 'mimetype' else zipfile.ZIP_DEFLATED
    zout.writestr(zipfile.ZipInfo(name, date_time=info.date_time), data, compress_type=ctype)
zout.close()
print('template written:', out)
