import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const TITLE = '학교 체육 수업 길잡이';
const DESC = '2022 개정 체육과 교육과정 수행평가 계획서를 교육과정·종목·평가 방법·에듀테크로 찾고, 양식 그대로 미리 본 뒤 한글·엑셀로 내려받으세요.';

/** 카카오톡·SNS 공유 미리보기(Open Graph) 태그를 넣는다.
 *  카카오톡은 그림 주소가 https:// 로 시작하는 전체 주소여야 그림을 보여 주므로
 *  .env.production 의 VITE_SITE_URL(배포 주소)을 앞에 붙인다. */
function shareTags(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/+$/, '');
  const abs = (p: string) => (base ? `${base}/${p}` : p);
  // 그림 내용이 바뀌면 주소 끝(?v=…)도 바뀌어 카카오톡이 새 그림을 다시 가져간다
  const ver = createHash('md5').update(readFileSync('public/og-image.png')).digest('hex').slice(0, 8);
  return {
    name: 'share-tags',
    transformIndexHtml() {
      const meta = (attr: 'property' | 'name', key: string, content: string) => ({
        tag: 'meta',
        attrs: { [attr]: key, content },
        injectTo: 'head' as const,
      });
      return [
        meta('property', 'og:type', 'website'),
        meta('property', 'og:site_name', TITLE),
        meta('property', 'og:title', TITLE),
        meta('property', 'og:description', DESC),
        meta('property', 'og:image', abs(`og-image.png?v=${ver}`)),
        meta('property', 'og:image:width', '1200'),
        meta('property', 'og:image:height', '630'),
        meta('property', 'og:locale', 'ko_KR'),
        ...(base ? [meta('property', 'og:url', `${base}/`)] : []),
        meta('name', 'twitter:card', 'summary_large_image'),
      ];
    },
  };
}

// base: './' → GitHub Pages, Netlify 등 어떤 하위 경로에 올려도 동작
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: './',
    plugins: [react(), shareTags(env.VITE_SITE_URL ?? '')],
    server: { port: 5180 },
  };
});
