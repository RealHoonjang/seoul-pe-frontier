/** PNG/JPEG/GIF/BMP 이미지의 가로·세로 픽셀 크기를 바이트에서 읽는다 */
export function imageSize(b: Uint8Array): { width: number; height: number; ext: string } | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b[0] === 0x89 && b[1] === 0x50) return { width: dv.getUint32(16), height: dv.getUint32(20), ext: 'png' };
  if (b[0] === 0x47 && b[1] === 0x49) return { width: dv.getUint16(6, true), height: dv.getUint16(8, true), ext: 'gif' };
  if (b[0] === 0x42 && b[1] === 0x4d) return { width: dv.getInt32(18, true), height: Math.abs(dv.getInt32(22, true)), ext: 'bmp' };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = dv.getUint16(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7), ext: 'jpg' };
      }
      i += 2 + len;
    }
  }
  return null;
}
