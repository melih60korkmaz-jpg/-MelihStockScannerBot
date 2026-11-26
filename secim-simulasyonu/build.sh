#!/bin/sh
cd "$(dirname "$0")"; mkdir -p dist
node -e "
const fs=require('fs');
const js=['data','geo','engine','ui','harita','gece','oyun2','gorsel','kariyer','rehber','hakkinda','sekmeler','genisle','yardim','boot'].map(f=>fs.readFileSync('src/'+f+'.js','utf8')).join('\n').replace(/<\/script/g,'<\\\\/script');
const out=fs.readFileSync('src/template.html','utf8').replace('/*CSS*/',()=>fs.readFileSync('src/style.css','utf8')).replace('/*JS*/',()=>js);
fs.writeFileSync('dist/index.html',out);
fs.writeFileSync('dist/_check.js',js);
"
node --check dist/_check.js && echo "SYNTAX OK" && ls -la dist/index.html
