const fs = require('fs');
let c = fs.readFileSync('src/components/OnlineLobby.tsx', 'utf8');

c = c.replace(/<VehiclePreview\s+vehicleType=\{VEHICLES_DB\.find\(v => v\.id === myPlayer\?\.vehicleId\)\?\.type \|\| 'standard'\}\s+color=\{LIVERIES_DB\.find\(l => l\.id === myPlayer\?\.liveryId\) \? '#ffffff' : '#00f2ff'\}\s+width=\{160\} height=\{160\}\s+liveryData=\{myPlayer\?\.liveryId \? LIVERIES_DB\.find\(l => l\.id === myPlayer\.liveryId\)! : undefined\}\s+\/>/g, 
`<VehiclePreview 
                    vehicleType={VEHICLES_DB.find(v => v.id === myPlayer?.vehicleId)?.type || 'standard'} 
                    color={LIVERIES_DB.find(l => l.id === myPlayer?.liveryId) ? '#ffffff' : (myPlayer?.liveryId || '#00f2ff')} 
                    width={160} height={160}
                    liveryData={myPlayer?.liveryId ? LIVERIES_DB.find(l => l.id === myPlayer.liveryId)! : undefined}
                  />`);

c = c.replace(/<VehiclePreview vehicleType=\{vDef\.type\} width=\{60\} height=\{60\} color="#fff" \/>/g, 
`<VehiclePreview vehicleType={vDef.type} width={60} height={60} color={LIVERIES_DB.find(l => l.id === car.equippedPaint) ? '#ffffff' : (car.equippedPaint || '#00f2ff')} liveryData={LIVERIES_DB.find(l => l.id === car.equippedPaint)!} />`);

c = c.replace(/<VehiclePreview vehicleType=\{VEHICLES_DB\.find\(v => v\.id === p\.vehicleId\)\?\.type \|\| 'standard'\} width=\{40\} height=\{40\} color="#fff" liveryData=\{LIVERIES_DB\.find\(l => l\.id === p\.liveryId\)!\} \/>/g, 
`<VehiclePreview vehicleType={VEHICLES_DB.find(v => v.id === p.vehicleId)?.type || 'standard'} width={40} height={40} color={LIVERIES_DB.find(l => l.id === p.liveryId) ? '#ffffff' : (p.liveryId || '#00f2ff')} liveryData={LIVERIES_DB.find(l => l.id === p.liveryId)!} />`);

fs.writeFileSync('src/components/OnlineLobby.tsx', c);
