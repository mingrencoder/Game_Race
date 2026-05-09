const fs = require('fs');
let c = fs.readFileSync('src/components/GarageUI.tsx', 'utf8');

c = c.replace(/const categoryItems = Object\.keys\(garage\.inventory\.parts\)\.filter\(id => \{\s*const count = garage\.inventory\.parts\[id\] \|\| 0;\s*if \(count <= 0\) return false;\s*const item = ITEMS_DB\.find\(x => x\.id === id\);\s*return item\?\.type === category;\s*\}\)/m, 
`const categoryItems = Array.from(new Set([
                 ...Object.keys(garage.inventory.parts).filter(id => garage.inventory.parts[id] > 0),
                 ...(vState?.equippedParts ? Object.values(vState.equippedParts).filter(Boolean) as string[] : [])
              ])).filter(id => {
                 const item = ITEMS_DB.find(x => x.id === id);
                 return item?.type === category;
              })`);

fs.writeFileSync('src/components/GarageUI.tsx', c);
