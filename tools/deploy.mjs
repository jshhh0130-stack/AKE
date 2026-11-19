// 배포: 빌드한 결과물(dist)을 GitHub Pages(gh-pages 브랜치)에 올리고, 소스(main)도 올린다.
// 사용: node tools/deploy.mjs
// (GitHub 'workflow' 권한을 추가하면 tools/ci/deploy.yml 을 .github/workflows/ 로 옮겨 자동 배포로 바꿀 수 있다)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REMOTE = 'https://github.com/jshhh0130-stack/AKE.git';
const run = (cmd, cwd = '.') => { console.log('>', cmd); return execSync(cmd, { cwd, stdio: 'inherit' }); };

run('node node_modules/vite/bin/vite.js build');
fs.writeFileSync(path.join('dist', '.nojekyll'), '');
fs.rmSync(path.join('dist', '.git'), { recursive: true, force: true });
const msg = `deploy ${new Date().toISOString()}`;
run('git init -q -b gh-pages', 'dist');
run('git add -A', 'dist');
run(`git -c user.name="${execSync('git config user.name').toString().trim()}" -c user.email="${execSync('git config user.email').toString().trim()}" commit -q -m "${msg}"`, 'dist');
run(`git push -q -f ${REMOTE} gh-pages`, 'dist');
fs.rmSync(path.join('dist', '.git'), { recursive: true, force: true });
run('git push -q -u origin main');
console.log('배포 완료: https://jshhh0130-stack.github.io/AKE/');
