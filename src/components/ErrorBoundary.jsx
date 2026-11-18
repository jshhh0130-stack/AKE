// 화면 하나에 오류가 나도 앱 전체가 하얗게 멈추지 않게 하는 보호 장치
import { Component } from 'react';
import { Candle } from './Logo.jsx';

export default class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('에이크 화면 오류', err, info?.componentStack); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null }); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 12 }}>
        <Candle h={56} />
        <h2 style={{ margin: 0, fontSize: 20 }}>앗, 화면을 그리다 문제가 생겼어요</h2>
        <p className="small muted" style={{ margin: 0 }}>다시 열면 대부분 해결돼요. 계속되면 마이 › AI · 지도 연결에서 데이터를 지워 보세요.</p>
        <div className="btns" style={{ width: '100%', maxWidth: 320 }}>
          <button className="btn line" onClick={() => { this.setState({ err: null }); history.back(); }}>뒤로</button>
          <button className="btn pri" onClick={() => { this.setState({ err: null }); location.hash = '#/'; }}>처음으로</button>
        </div>
      </div>
    );
  }
}
