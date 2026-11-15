// 케이크 시안 그림 확인용 갤러리 HTML 만들기
import fs from 'node:fs/promises';
import { cakeSVG } from '../src/lib/cake.js';

const cases = [
  { shape: 'round', size: 'h1', design: 'simple', cream: 'white', text: '생일 축하해', font: 'jua', textColor: 'berry' },
  { shape: 'heart', size: 'h1', design: 'vintage', cream: 'pink', text: '사랑해', font: 'pen', textColor: 'berry', toppings: ['pearl'] },
  { shape: 'square', size: 'h2', design: 'heartdots', cream: 'butter', text: 'HAPPY BIRTHDAY', font: 'script', textColor: 'choco', extras: ['candle'] },
  { shape: 'round', size: 'dosirak', design: 'simple', cream: 'mint', text: '고생했어', font: 'gaegu', textColor: 'navy', extras: ['plate', 'card'] },
  { shape: 'round', size: 'h2', design: 'flower', cream: 'lavender', text: '칠순 축하드려요', font: 'gowun', textColor: 'navy', toppings: ['freshflower'] },
  { shape: 'round', size: 'h1', design: 'drip', cream: 'cocoa', text: '20살 축하해', font: 'jua', textColor: 'white', extras: ['numcandle', 'topper'], toppings: ['strawberry'] },
  { shape: 'heart', size: 'mini', design: 'character', cream: 'sky', text: '곰돌이 생일', font: 'melody', textColor: 'choco', toppings: ['sprinkle'] },
  { shape: 'round', size: 'h3', design: 'photo', cream: 'white', text: '첫 돌 축하해', font: 'jua', textColor: 'berry', toppings: ['cherry', 'ribbon'] },
  { shape: 'square', size: 'dosirak', design: 'vintage', cream: 'hotpink', text: 'LOVE', font: 'script', textColor: 'white', toppings: ['macaron'], variant: 1 },
];
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Jua&family=Nanum+Pen+Script&family=Gaegu:wght@700&family=Gowun+Dodum&family=Hi+Melody&family=Dancing+Script:wght@700&display=swap">
<style>body{margin:0;display:grid;grid-template-columns:repeat(3,300px);gap:8px;padding:8px;background:#eee}div{background:#fff;border-radius:12px;overflow:hidden}svg{display:block;width:300px;height:250px}</style></head><body>
${cases.map((c, i) => `<div>${cakeSVG(c, { uid: 'g' + i, fancy: i === 0 })}</div>`).join('')}
${[0, 1, 2].map((v) => `<div>${cakeSVG({ ...cases[0], variant: v, toppings: ['cherry'] }, { uid: 'v' + v })}</div>`).join('')}
</body></html>`;
await fs.mkdir('tools/shots', { recursive: true });
await fs.writeFile('tools/shots/gallery.html', html);
console.log('ok');
