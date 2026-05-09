const fs = require('fs');
let c = fs.readFileSync('src/components/GameCanvas.tsx', 'utf8');

c = c.replace(/color: livery \? '#ffffff' : getUniqueColor\(\),/g, 
`color: livery ? '#ffffff' : (p.liveryId?.startsWith('#') ? p.liveryId : getUniqueColor()),`);

// Wait, the other one is `aiLiveryData ? '#ffffff' : getUniqueColor()`. But `aiLiveryData` is for AI.
c = c.replace(/color: aiLiveryData \? '#ffffff' : getUniqueColor\(\),/g,
`color: aiLiveryData ? '#ffffff' : (rosterAI.liveryId?.startsWith('#') ? rosterAI.liveryId : getUniqueColor()),`);

fs.writeFileSync('src/components/GameCanvas.tsx', c);
