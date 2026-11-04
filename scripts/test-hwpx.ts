// HWPX 생성기 점검: plans.json 의 일부(또는 전부)를 HWPX로 만들어 지정 폴더에 저장한다.
// 실행: npm run test:hwpx -- <출력폴더> [id ...]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { buildHwpx } from '../src/lib/hwpx';
import { imageSize } from '../src/lib/imagesize';
import type { EvalPlan, Standard } from '../src/types';

const [outDir, ...ids] = process.argv.slice(2);
if (!outDir) throw new Error('출력 폴더를 지정하세요');
mkdirSync(outDir, { recursive: true });

const plans: EvalPlan[] = JSON.parse(readFileSync('public/data/plans.json', 'utf-8'));
const stds: Standard[] = JSON.parse(readFileSync('public/data/standards.json', 'utf-8'));
const stdMap = new Map(stds.map((s) => [s.code, s.text]));
const template = readFileSync('public/template/plan-template.hwpx');

const xml = {
  parse: (s: string) => new DOMParser().parseFromString(s, 'text/xml') as unknown as Document,
  serialize: (d: Document) => new XMLSerializer().serializeToString(d as never),
};

for (const p of plans.filter((p) => !ids.length || ids.includes(p.id))) {
  let image = null;
  if (p.explanation.image) {
    const data = new Uint8Array(readFileSync(join('public', p.explanation.image)));
    const sz = imageSize(data)!;
    image = { data, ...sz };
  }
  const out = await buildHwpx(p, { template, xml, standardText: (c) => stdMap.get(c), image });
  writeFileSync(join(outDir, `${p.id}.hwpx`), out);
  console.log('wrote', p.id, out.length);
}
