import JSZip from 'jszip';
import type { EvalPlan, Standard } from '../types';
import { buildHwpx, type HwpxImage } from './hwpx';
import { imageSize } from './imagesize';
import { SCHOOL_SHORT } from './labels';
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();

export function baseName(p: EvalPlan): string {
  return safe(`${SCHOOL_SHORT[p.schoolLevel]}${p.grade}_${p.sport}_${p.title}`);
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`파일을 불러오지 못했습니다: ${url}`);
  return new Uint8Array(await r.arrayBuffer());
}

let templateCache: Promise<Uint8Array> | null = null;
const template = () => (templateCache ??= fetchBytes('template/plan-template.hwpx'));

/** SVG·WebP 등은 캔버스로 PNG로 바꾼다 (한글 문서에 넣을 수 있게) */
async function rasterize(src: string): Promise<HwpxImage> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const w = img.naturalWidth || 800;
  const h = img.naturalHeight || 600;
  const scale = Math.min(1, 1600 / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
  return { data: new Uint8Array(await blob.arrayBuffer()), ext: 'png', width: c.width, height: c.height };
}

async function loadImage(src?: string): Promise<HwpxImage | null> {
  if (!src) return null;
  try {
    const data = await fetchBytes(src);
    const sz = imageSize(data);
    if (sz) return { data, ...sz };
    return await rasterize(src);
  } catch {
    return null;
  }
}

const browserXml = {
  parse: (s: string) => new DOMParser().parseFromString(s, 'application/xml'),
  serialize: (d: Document) => new XMLSerializer().serializeToString(d),
};

export async function makeHwpx(plan: EvalPlan, stdMap: Map<string, Standard>): Promise<Blob> {
  const bytes = await buildHwpx(plan, {
    template: await template(),
    xml: browserXml,
    standardText: (c) => stdMap.get(c)?.text,
    image: await loadImage(plan.explanation.image),
  });
  return new Blob([bytes], { type: 'application/hwp+zip' });
}

export async function downloadHwpx(plan: EvalPlan, stdMap: Map<string, Standard>) {
  saveBlob(await makeHwpx(plan, stdMap), `${baseName(plan)}.hwpx`);
}

export async function downloadFile(path: string, filename: string) {
  saveBlob(new Blob([await fetchBytes(path)]), filename);
}

export function extOf(path: string) {
  return path.split('.').pop()!.toLowerCase();
}

/** 브라우저 인쇄 창 → 'PDF로 저장'. 파일 이름이 수행평가명이 되도록 제목을 잠시 바꾼다 */
export function printPlan(plan: EvalPlan) {
  const old = document.title;
  document.title = baseName(plan);
  const restore = () => {
    document.title = old;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  window.print();
}

/** 여러 건을 한 번에: 건마다 폴더를 만들어 HWPX·원본·채점기준 엑셀을 넣는다 */
export async function downloadZip(
  plans: EvalPlan[],
  stdMap: Map<string, Standard>,
  onProgress?: (done: number, total: number) => void,
) {
  const { buildWorkbook } = await import('./excel');
  const zip = new JSZip();
  let done = 0;
  for (const p of plans) {
    const dir = zip.folder(baseName(p))!;
    dir.file(`${baseName(p)}.hwpx`, await makeHwpx(p, stdMap));
    for (const f of [p.files?.hwp, p.files?.hwpx, p.files?.pdf].filter(Boolean) as string[]) {
      dir.file(`원본_${baseName(p)}.${extOf(f)}`, await fetchBytes(f));
    }
    dir.file(`${baseName(p)}_채점기준.xlsx`, await buildWorkbook(p, stdMap));
    onProgress?.(++done, plans.length);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const date = new Date().toISOString().slice(0, 10);
  saveBlob(blob, `체육평가계획_${plans.length}건_${date}.zip`);
}
