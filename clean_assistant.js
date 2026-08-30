const fs = require('fs');
const file = 'c:/Users/Chetan/Documents/arise2/client/src/pages/AIAssistant.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/sendBtn:\s*\([^)]*\)\s*=>\s*\(\{[\s\S]*?\}\),/, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Removed duplicate sendBtn');
