const fs = require('fs');
const content = fs.readFileSync('src/app/solarsystem/components/Planet.tsx', 'utf8');
console.log(content.split('\n').filter((l,i) => i>50 && i<150).join('\n'));
