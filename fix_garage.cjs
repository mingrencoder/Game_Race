const fs = require('fs');
let c = fs.readFileSync('src/components/GarageUI.tsx', 'utf8');

c = c.replace(/const equipItem = \(id: string\) => \{[^]*?\};\s*const equipLivery/m, 
`const [pendingEquip, setPendingEquip] = useState<{ id: string | null, typeKey: string, oldId: string | null, fee: number } | null>(null);
  const [equipError, setEquipError] = useState<string | null>(null);

  const equipItem = (id: string) => {
    const item = ITEMS_DB.find(i => i.id === id);
    if (!item) return;
    const typeKey = item.type as 'engine' | 'tires' | 'launch' | 'drift' | 'acceleration';
    const activeCar = garage.garage.find(v => v.carId === garage.profile.activeCarId);
    if (!activeCar) return;

    const currentEquippedId = activeCar.equippedParts?.[typeKey];
    
    if (currentEquippedId !== id) {
        if (!garage.inventory?.parts?.[id] || garage.inventory.parts[id] <= 0) {
            setEquipError("库存中没有该零件！请前往商店购买或在黑市抽取。");
            setTimeout(() => setEquipError(null), 3000);
            return;
        }
    }

    if (currentEquippedId) {
        const oldItem = ITEMS_DB.find(i => i.id === currentEquippedId);
        const fee = oldItem ? Math.floor(oldItem.price * 0.2) : 0;
        setPendingEquip({ id: currentEquippedId === id ? null : id, typeKey, oldId: currentEquippedId, fee });
    } else {
        commitEquip(id, typeKey, null, 0);
    }
  };

  const commitEquip = (newId: string | null, typeKey: string, oldId: string | null, fee: number) => {
      if (fee > 0 && garage.wallet.coins < fee) {
          setEquipError("金币不足，无法拆卸零件。");
          setTimeout(() => setEquipError(null), 3000);
          setPendingEquip(null);
          return;
      }
      
      setGarage(p => {
          const newData = { ...p };
          const newGarage = [...newData.garage];
          const targetIdx = newGarage.findIndex(v => v.carId === p.profile.activeCarId);
          if (targetIdx !== -1) {
              const v = { ...newGarage[targetIdx] };
              v.equippedParts = { ...v.equippedParts, [typeKey]: newId } as any;
              newGarage[targetIdx] = v;
              newData.garage = newGarage;
          }
          
          if (fee > 0) {
              newData.wallet = { ...newData.wallet, coins: newData.wallet.coins - fee };
          }
          
          if (!newData.inventory) newData.inventory = { parts: {}, liveries: [] };
          if (!newData.inventory.parts) newData.inventory.parts = {};
          
          if (oldId) {
              newData.inventory.parts[oldId] = (newData.inventory.parts[oldId] || 0) + 1;
          }
          if (newId) {
              newData.inventory.parts[newId] = Math.max(0, (newData.inventory.parts[newId] || 0) - 1);
          }
          
          return newData;
      });
      setPendingEquip(null);
  };

  const equipLivery`);

// insert modal
c = c.replace(/\{showMaintenanceConfirm && \(/g, 
`{equipError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-red-500/90 text-white px-6 py-3 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)] font-bold border border-red-400">
          {equipError}
        </div>
      )}

      {pendingEquip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-black border border-white/20 p-6 rounded-xl max-w-sm w-full neon-panel">
            <h3 className="text-xl font-bold mb-4 text-white">确认拆卸/替换零件？</h3>
            <p className="text-zinc-300 mb-6 text-sm">
              卸载或替换该零件将收取折旧费：<span className="text-accent-yellow font-bold">{pendingEquip.fee} ⟁</span> (原价的20%)。<br/><br/>
              确定执行吗？拆卸后，旧零件将返还至你的库存。
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setPendingEquip(null)}
                className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => commitEquip(pendingEquip.id, pendingEquip.typeKey, pendingEquip.oldId, pendingEquip.fee)}
                className="flex-1 py-2 rounded-lg bg-accent-yellow hover:bg-[#fff000] text-black font-bold transition-colors shadow-[0_0_15px_rgba(255,223,0,0.3)]"
              >
                确定拆卸
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showMaintenanceConfirm && (`);

c = c.replace(/\{isEquipped \? '已安装' : '安装'\}/g, 
`{isEquipped ? '不可变更(拆除选定)' : \`安装 (库存:\${garage.inventory?.parts?.[item.id] || 0})\`}`);
c = c.replace(/\{isEquipped \? '不可变更\(拆除选定\)' : /g,
`{isEquipped ? '卸载' : `);

fs.writeFileSync('src/components/GarageUI.tsx', c);
