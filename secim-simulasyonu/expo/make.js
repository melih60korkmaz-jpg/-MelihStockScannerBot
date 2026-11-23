// dist/index.html -> expo/game-html.js (node expo/make.js)
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
fs.writeFileSync(path.join(__dirname, 'game-html.js'), 'module.exports = ' + JSON.stringify(html) + ';\n');
console.log('game-html.js yazıldı', Math.round(html.length / 1024) + ' KB');
