const fs = require('fs');
let c = fs.readFileSync('src/components/OnlineLobby.tsx', 'utf8');

c = c.replace(/accelerationId: car\.equippedParts\?\.acceleration \|\| null\s*\n\s*\}\)}/g, 
`accelerationId: car.equippedParts?.acceleration || null 
                            });
                            if (onUpdateActiveCar) onUpdateActiveCar(car.carId, car.equippedPaint || '#00f2ff', car.equippedPaint || 'livery_basic');
                         }}`);

c = c.replace(/<h3 className="text-white text-sm font-bold opacity-80 border-b border-white\/10 pb-2 mt-4">拥有的涂装<\/h3>/g,
`<h3 className="text-white text-sm font-bold opacity-80 border-b border-white/10 pb-2 mt-4">基础颜色</h3>
                    <div className="flex gap-2 mb-4">
                      {BASIC_COLORS.map(color => {
                        const isSelected = myPlayer?.liveryId === color;
                        return (
                          <div 
                            key={color} 
                            onClick={() => {
                               socketService.updatePlayer({ liveryId: color });
                               if (onUpdateActiveCar && myPlayer) {
                                  onUpdateActiveCar(myPlayer.vehicleId, color, color);
                               }
                            }}
                            className={\`w-10 h-10 rounded-full border-2 cursor-pointer transition-all \${isSelected ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-60 hover:opacity-100'}\`}
                            style={{ backgroundColor: color, boxShadow: isSelected ? \`0 0 15px \${color}\` : 'none' }}
                          ></div>
                        );
                      })}
                    </div>

                    <h3 className="text-white text-sm font-bold opacity-80 border-b border-white/10 pb-2 mt-4">拥有的涂装</h3>`);

c = c.replace(/onClick=\{\(\) => socketService\.updatePlayer\(\{ liveryId: livery\.id \}\)\}/g,
`onClick={() => {
                              socketService.updatePlayer({ liveryId: livery.id });
                              if (onUpdateActiveCar && myPlayer) {
                                  onUpdateActiveCar(myPlayer.vehicleId, livery.colors[0], livery.id);
                              }
                            }}`);

fs.writeFileSync('src/components/OnlineLobby.tsx', c);
