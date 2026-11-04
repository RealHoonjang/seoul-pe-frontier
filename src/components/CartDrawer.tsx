import { useEffect, useState } from 'react';
import { useApp } from '../ctx';
import { downloadZip } from '../lib/download';

export default function CartDrawer({ onClose }: { onClose: () => void }) {
  const { data, cart, toggleCart, clearCart, toast } = useApp();
  const [progress, setProgress] = useState<string | null>(null);
  const items = cart.map((id) => data.byId.get(id)!).filter(Boolean);

  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);

  const zip = async () => {
    setProgress('준비 중…');
    try {
      await downloadZip(items.map((x) => x.plan), data.stdMap, (d, t) => setProgress(`${d} / ${t}건 만드는 중…`));
      toast(`${items.length}건을 ZIP으로 내려받았습니다.`);
    } catch (e) {
      toast(`ZIP을 만들지 못했습니다: ${(e as Error).message}`);
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="담은 자료">
        <div className="drawer-head">
          <h2>담은 자료 {items.length}건</h2>
          <button className="btn ghost" onClick={onClose} aria-label="닫기">닫기</button>
        </div>
        <div className="drawer-body">
          {items.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>검색 결과 카드 오른쪽 위 네모를 눌러 자료를 담으세요.</p>
          ) : (
            items.map((x) => (
              <div className="drawer-item" key={x.plan.id}>
                <div>
                  <a href={`#/plan/${encodeURIComponent(x.plan.id)}`} onClick={onClose}>{x.plan.title}</a>
                  <small>{x.gradeKey} · {x.plan.sport} · {x.plan.author.school}</small>
                </div>
                <button className="btn ghost" onClick={() => toggleCart(x.plan.id)} aria-label={`${x.plan.title} 빼기`}>빼기</button>
              </div>
            ))
          )}
        </div>
        <div className="drawer-foot">
          <p>건마다 폴더를 만들어 한글 파일(HWPX), 원본 파일(있을 때), 채점기준·기록지 엑셀을 넣습니다.</p>
          <button className="btn primary" disabled={!items.length || !!progress} onClick={zip}>
            {progress ?? `ZIP으로 한꺼번에 내려받기 (${items.length}건)`}
          </button>
          {items.length > 0 && (
            <button className="btn ghost" onClick={clearCart}>모두 비우기</button>
          )}
        </div>
      </aside>
    </>
  );
}
