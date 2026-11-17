// 조사 결과(tools/research/*.json) 한눈에 보기
import fs from 'node:fs';
const read = (f) => JSON.parse(fs.readFileSync(new URL(`./research/${f}.json`, import.meta.url), 'utf8').replace(/^﻿/, ''));
for (const f of process.argv.slice(2).length ? process.argv.slice(2) : ['yeongtong', 'gwonseon', 'paldal', 'jangan']) {
  const j = read(f);
  console.log('==', f, j.shops.length);
  for (const s of j.shops) console.log([s.name, s.dong, s.isCustomCake, s.status, JSON.stringify(s.price), s.insta, (s.styles || []).join('/'), s.addr, s.sameDay, s.closed, s.hours].join(' | '));
}
