// 알림 종 + 알림함 + 알림 설정
import { useState } from 'react';
import Icon from './Icon.jsx';
import { Sheet, Toggle, toast } from './ui.jsx';
import { useApp, setState } from '../lib/state.js';
import { unreadNotis, readAll, askPermission } from '../lib/notify.js';
import { navAfterSheet } from '../lib/router.js';
import { ago } from '../lib/util.js';

const KIND_ICON = { status: 'receipt', proof: 'image', chat: 'chat' };

export function NotiBell({ role, dark = false }) {
  const st = useApp();
  const [open, setOpen] = useState(false);
  const n = unreadNotis(st, role);
  const list = (st.notis || []).filter((x) => x.role === role);
  return (
    <>
      <button className={`bell ${dark ? 'dark' : ''}`} onClick={() => setOpen(true)} aria-label={`알림 ${n}개`}>
        <Icon n="bell" />
        {n > 0 && <span className="badge">{n > 9 ? '9+' : n}</span>}
      </button>
      <Sheet open={open} onClose={() => { setOpen(false); readAll(role); }} title="알림">
        {list.length === 0 && <div className="empty"><div className="big"><Icon n="bell" /></div>아직 알림이 없어요.<br />주문 소식과 메시지가 오면 여기에 모여요.</div>}
        {list.map((x) => (
          <button key={x.id} className="list-row" onClick={() => { setOpen(false); readAll(role); if (x.link) navAfterSheet(x.link, {}); }}>
            <span className="setrow" style={{ all: 'unset', position: 'relative' }}><Icon n={KIND_ICON[x.kind] || 'bell'} />{!x.read && <i style={{ position: 'absolute', right: -3, top: -3, width: 8, height: 8, borderRadius: 4, background: 'var(--p500)' }} />}</span>
            <div className="grow"><div className="t small" style={{ fontWeight: x.read ? 600 : 800 }}>{x.title}</div><div className="s">{x.body}</div></div>
            <span className="xs muted">{ago(x.at)}</span>
          </button>
        ))}
        {list.length > 0 && <button className="btn ghost block sm" style={{ marginTop: 10 }} onClick={() => setState((s) => ({ ...s, notis: (s.notis || []).filter((y) => y.role !== role) }))}>알림 모두 지우기</button>}
        <div className="hr" />
        <NotiSettings role={role} />
      </Sheet>
    </>
  );
}

export function NotiSettings({ role }) {
  const st = useApp();
  const set = st.notiSet?.[role] || {};
  const upd = (k, v) => setState((s) => ({ ...s, notiSet: { ...s.notiSet, [role]: { ...s.notiSet[role], [k]: v } } }));
  const rows = role === 'o'
    ? [['status', '주문 알림', '새 주문 · 수정 요청 · 취소'], ['proof', '시안 알림', '손님의 시안 승인 · 수정 요청'], ['chat', '메시지 알림', '손님이 보낸 메시지']]
    : [['status', '주문 상태 알림', '확정 · 제작 · 픽업 준비'], ['proof', '시안 도착 알림', '사장님이 보낸 제작 전 시안'], ['chat', '메시지 알림', '사장님이 보낸 메시지']];
  return (
    <div>
      <div className="b small" style={{ marginBottom: 4 }}>알림 설정 <span className="xs muted">({role === 'o' ? '사장님' : '고객'})</span></div>
      <div className="card" style={{ padding: '0 14px' }}>
        {rows.map(([k, t, s]) => <div key={k} className="list-row"><div className="grow"><div className="t">{t}</div><div className="s">{s}</div></div><Toggle on={set[k] !== false} onChange={(v) => upd(k, v)} label={t} /></div>)}
        <div className="list-row"><div className="grow"><div className="t">소리 · 진동</div></div><Toggle on={set.sound !== false} onChange={(v) => upd('sound', v)} label="소리" /></div>
        <div className="list-row"><div className="grow"><div className="t">휴대폰 알림창에 띄우기</div><div className="s">앱이 열려 있거나 최근에 열어 둔 동안 알림창에 떠요</div></div>
          <Toggle on={!!set.browser} label="휴대폰 알림" onChange={async (v) => {
            if (!v) { upd('browser', false); return; }
            const p = await askPermission();
            if (p === 'granted') { upd('browser', true); toast('휴대폰 알림을 켰어요'); } else toast(p === 'unsupported' ? '이 기기는 알림창을 지원하지 않아요. 홈 화면에 앱을 설치하면 쓸 수 있어요' : '알림이 차단돼 있어요. 브라우저 설정에서 허용해 주세요', 4000);
          }} /></div>
      </div>
    </div>
  );
}
