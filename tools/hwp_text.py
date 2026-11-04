import sys, zlib, struct, olefile

path, out = sys.argv[1], sys.argv[2]
ole = olefile.OleFileIO(path)
hdr = ole.openstream('FileHeader').read()
compressed = bool(hdr[36] & 1)
sections = sorted([e for e in ole.listdir() if e[0] == 'BodyText'], key=lambda e: int(e[1][7:]))
lines = []
for s in sections:
    data = ole.openstream(s).read()
    if compressed:
        data = zlib.decompress(data, -15)
    i = 0
    while i < len(data):
        h = struct.unpack_from('<I', data, i)[0]
        tag = h & 0x3FF
        level = (h >> 10) & 0x3FF
        size = (h >> 20) & 0xFFF
        i += 4
        if size == 0xFFF:
            size = struct.unpack_from('<I', data, i)[0]
            i += 4
        rec = data[i:i+size]
        i += size
        if tag == 67:  # PARA_TEXT
            txt = []
            j = 0
            while j < len(rec):
                c = struct.unpack_from('<H', rec, j)[0]
                if c < 32:
                    if c in (0, 10, 13, 24, 25, 26, 27, 28, 29, 30, 31):
                        if c == 10: txt.append('\n')
                        j += 2
                    elif c == 9:
                        txt.append('\t'); j += 16
                    else:
                        j += 16
                    continue
                txt.append(chr(c)); j += 2
            t = ''.join(txt).strip()
            if t:
                lines.append(('  ' * min(level, 6)) + t)
        elif tag == 77:  # TABLE
            lines.append('  ' * min(level, 6) + '[TABLE]')
open(out, 'w', encoding='utf-8', errors='replace').write('\n'.join(lines))
print(len(lines), 'lines;', [e for e in ole.listdir()][:40])

