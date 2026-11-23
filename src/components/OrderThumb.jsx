// 주문 썸네일: 사진(참고 사진·고른 대표 디자인)이 있으면 사진, 없으면 앱 케이크 그림
import { CakeView } from './ui.jsx';
import { orderView } from '../lib/ordertext.js';
import { orderPhoto } from '../lib/designs.js';

export default function OrderThumb({ order, fancy = false, badge = false }) {
  const src = orderPhoto(order);
  return (<>
    {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <CakeView o={orderView(order)} fancy={fancy} />}
    {badge && order.o?.pickName && <span className="pickbadge">고른 디자인</span>}
  </>);
}
