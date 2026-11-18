// AI 실사 사진 창: 넣은 사진·시안 → AI가 실사 케이크 사진으로 → 그림판으로 고치기 → 가게 찾기 · 주문서에 넣기
// 다른 시트 안에서 열어도 화면 전체 위에 뜨도록 Portal로 그린다.
import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import Sketch from './Sketch.jsx';
import { Sheet, toast, PhotoPick, Portal } from './ui.jsx';
import { useApp } from '../lib/state.js';
import { navAfterSheet } from '../lib/router.js';
import { makeRealistic, engineInfo, saveEdited } from '../lib/imagegen.js';
import { loadImage, toDataURL } from '../lib/image.js';
import G from '../data/gallery.json';

const BASE = import.meta.env.BASE_URL;
const MODES = [
  ['real', '사진처럼 실사로', '모양·색·장식은 그대로 진짜 케이크 사진처럼'],
  ['onCake', '그림을 케이크 위에', '캐릭터·반려동물·그림을 크림으로 짠 케이크로'],
  ['opts', '고른 옵션대로', '사진 없이 모양·색·장식만으로 새로'],
];
const ENGINE_NAME = { gemini: '구글 제미나이', flux: '무료 AI (FLUX)', horde: '무료 대기열 AI', gallery: '예시 사진', sketch: '그림판' };

export default function AIStudio({ open, onClose, input = null, inputs = null, opts = {}, onUse, useLabel = '이 사진 쓰기', sketchTexts = [], title = 'AI 실사 사진 만들기' }) {
  const st = useApp();
  const [src, setSrc] = useState(null);
  const [mode, setMode] = useState('real');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [stage, setStage] = useState('');
  const [note, setNote] = useState('');
  const [pic, setPic] = useState(null); // { src, engine, id }
  const [jobId, setJobId] = useState(null);
  const [sketch, setSketch] = useState(false);
  useEffect(() => {
    if (!open) return;
    const first = input || inputs?.[0]?.src || null;
    setSrc(first); setMode(first ? 'real' : 'opts'); setExtra(''); setBusy(false); setMsg(''); setNote(''); setPic(null); setJobId(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const job = jobId ? (st.aiJobs || []).find((j) => j.id === jobId) : null;
  // 무료 대기열에서 다 만들어지면 바로 보여 주기
  useEffect(() => {
    if (!jobId || job) return;
    const done = (st.aiPics || []).find((p) => p.job === jobId);
    if (done) { setPic({ src: done.src, engine: done.engine, id: done.id }); setJobId(null); setBusy(false); setMsg(''); }
  }, [st.aiJobs, st.aiPics]); // eslint-disable-line react-hooks/exhaustive-deps
  // 기다리는 동안 볼 비슷한 예시 사진
  const similar = useMemo(() => (G.items || []).map((g) => ({ g, sc: (g.d === opts.design ? 3 : 0) + (g.cr === opts.cream ? 2 : 0) + (g.sh === opts.shape ? 1 : 0) })).sort((a, b) => b.sc - a.sc).slice(0, 4).map((x) => x.g), [opts.design, opts.cream, opts.shape]);
  const eng = engineInfo(st.settings);
  const useMode = src ? mode : 'opts';

  const run = async () => {
    setBusy(true); setPic(null); setNote(''); setMsg('준비하는 중…'); setStage('');
    try {
      const r = await makeRealistic({ mode: useMode, image: useMode === 'opts' ? null : src, opts, extra, onStatus: (s) => { setMsg(s.msg); setStage(s.stage || ''); } });
      if (r.pic) { setPic({ src: r.pic.src, engine: r.engine, id: r.pic.id }); setBusy(false); setMsg(''); }
      else if (r.job) { setJobId(r.job.id); setNote(r.note || ''); setMsg(''); }
    } catch (e) { setBusy(false); setMsg(''); toast(e.message || 'AI 사진을 만들지 못했어요', 4000); }
  };
  const pickFile = async (f) => { try { const el = await loadImage(f); setSrc(toDataURL(el, 1024, 0.9)); setMode('real'); setPic(null); } catch (e) { toast(e.message || '사진을 읽지 못했어요'); } };
  const useSample = (g) => { setPic({ src: `${BASE}gallery/${g.id}.webp`, engine: 'gallery', id: g.id }); };

  return (
    <Portal>
      <Sheet open={open} onClose={onClose} title={title} height="94%">
        {!pic && (<>
          <div className="lbl">바탕 사진</div>
          <div className="ai-in">
            <div className="ai-thumb">{src ? <img src={src} alt="" /> : <Icon n="image" />}</div>
            <div className="grow">
              {inputs?.length > 1 && <div className="chips" style={{ marginBottom: 8 }}>{inputs.map((x) => <button key={x.id} className={`chip sm ${src === x.src ? 'on' : ''}`} onClick={() => { setSrc(x.src); setPic(null); }}>{x.label}</button>)}</div>}
              <div className="row wrap">
                <PhotoPick onPick={pickFile} className="btn line sm"><Icon n="image" size="sm" />{src ? '다른 사진' : '사진 넣기'}</PhotoPick>
                {src && <button className="btn ghost sm" onClick={() => { setSrc(null); setMode('opts'); }}>사진 빼기</button>}
              </div>
            </div>
          </div>
          <div className="lbl" style={{ marginTop: 18 }}>어떻게 만들까요?</div>
          <div className="ai-modes">
            {MODES.map(([id, n, d]) => { const off = id !== 'opts' && !src; return (
              <button key={id} className={`opt ${useMode === id ? 'on' : ''}`} disabled={off} onClick={() => setMode(id)}>{n}<small>{off ? '사진을 넣으면 돼요' : d}</small></button>); })}
          </div>
          <div className="lbl" style={{ marginTop: 18 }}>더 원하는 것 <span className="xs muted">선택</span></div>
          <input className="inp" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="예) 체리 많이, 하늘색 크림, 리본" />
          <div className="ai-eng"><Icon n="sparkle" size="sm" /><span className="grow"><b>{eng.name}</b> · {eng.sub}</span><button onClick={() => { onClose(); navAfterSheet('/settings', {}); }}>연결</button></div>
          <div className="xs muted" style={{ marginTop: 6 }}>AI는 한글 글씨를 잘 못 그려서 문구는 지워요. 문구는 그림판에서 예쁜 글씨체로 얹어요.</div>
          {!busy && !job && <button className="btn pri block" style={{ marginTop: 14 }} onClick={run}><Icon n="sparkle" size="sm" />AI 실사 사진 만들기</button>}
          {busy && !job && <div className="ai-wait"><div className="loader" /><b>{msg || 'AI가 그리는 중…'}</b><span className="xs muted">{stage === 'horde' ? '빠른 무료 AI를 다 써서 무료 대기열로 넘어가요' : stage === 'gemini' ? '보통 10~30초 걸려요' : '보통 20~40초 걸려요'}</span></div>}
          {job && (
            <div className="ai-wait">
              <div className="loader" />
              <b>무료 대기열에서 만드는 중이에요</b>
              <span className="small muted">{job.queue != null ? `앞에 ${job.queue}명 · 약 ${Math.max(1, Math.round((job.wait || 60) / 60))}분` : '줄 서는 중…'}</span>
              {note && <span className="xs muted">{note}</span>}
              <span className="xs muted">이 창을 닫아도 돼요. 다 되면 알림으로 알려 드리고, 관심 › 내가 만든 사진에 모여요.</span>
            </div>
          )}
          {(busy || job) && (<>
            <div className="lbl" style={{ marginTop: 18 }}>기다리는 동안 비슷한 예시 사진 <span className="xs muted">눌러서 바로 써요</span></div>
            <div className="ai-sim">{similar.map((g) => <button key={g.id} onClick={() => useSample(g)}><img src={`${BASE}gallery/s/${g.id}.webp`} alt={g.t} /></button>)}</div>
          </>)}
        </>)}
        {pic && (
          <div className="ai-out">
            <div className="ai-img"><img src={pic.src} alt="AI 실사 사진" /><span className="ai">{pic.engine === 'gallery' ? '예시 사진' : pic.engine === 'sketch' ? '그림판으로 고친 사진' : `AI 예시 사진 · ${ENGINE_NAME[pic.engine] || 'AI'}`}</span></div>
            <div className="btns" style={{ marginTop: 12 }}>
              <button className="btn line" onClick={() => setSketch(true)}><Icon n="pen" size="sm" />그림판으로 고치기</button>
              <button className="btn line" onClick={() => { setPic(null); }}><Icon n="refresh" size="sm" />다시 만들기</button>
            </div>
            {onUse && <button className="btn pri block" style={{ marginTop: 8 }} onClick={() => { onUse(pic.src, pic); onClose(); }}>{useLabel}</button>}
            <div className="xs muted center" style={{ marginTop: 10 }}>{pic.engine === 'gallery' ? '관심 탭의 예시 사진이에요.' : '만든 사진은 관심 › 내가 만든 사진에도 모여요.'} 실제 케이크는 가게마다 조금 달라요.</div>
          </div>
        )}
      </Sheet>
      {sketch && pic && (
        <Sketch src={pic.src} texts={sketchTexts} onClose={() => setSketch(false)}
          onSave={(out) => {
            const g = pic.engine === 'gallery' ? (G.items || []).find((x) => x.id === pic.id) : null; // 예시 사진을 고쳤으면 그 케이크 정보로
            const p = saveEdited(out, { from: pic.id, engine: 'sketch', opts: g ? { design: g.d, shape: g.sh, cream: g.cr, size: g.sz, styles: g.st } : opts });
            setPic({ src: out, engine: 'sketch', id: p.id }); toast('고친 사진을 저장했어요');
          }} />
      )}
    </Portal>
  );
}
