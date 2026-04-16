import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GarageData } from '../types';
import { VEHICLES_DB, ITEMS_DB, LIVERIES_DB, BASIC_COLORS } from '../constants';

interface GarageProps {
  garage: GarageData;
  setGarage: React.Dispatch<React.SetStateAction<GarageData>>;
  onClose: () => void;
}

export default function GarageUI({ garage, setGarage, onClose }: GarageProps) {
  const [tab, setTab] = useState<'VEHICLES' | 'ITEMS' | 'LIVERIES'>('VEHICLES');

  const equipVehicle = (id: string) => setGarage(g => ({ ...g, equippedVehicle: id }));
  
  const equipItem = (id: string) => {
    const item = ITEMS_DB.find(i => i.id === id);
    if (!item) return;
    setGarage(g => ({
      ...g,
      equippedItems: {
        ...g.equippedItems,
        [item.type]: g.equippedItems[item.type as 'engine'|'tires'] === id ? null : id // Toggle
      }
    }));
  };

  const equipLivery = (val: string) => setGarage(g => ({ ...g, equippedLivery: val }));

  return (
    <motion.div
      key="garage"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col min-h-[100dvh] p-4 md:p-[60px] max-w-5xl mx-auto overflow-y-auto"
    >
      <header className="flex justify-between items-end mb-8 border-b border-white/10 pb-4 mt-8 md:mt-0">
        <h1 className="text-3xl md:text-4xl font-black italic text-accent-cyan tracking-widest">MY GARAGE</h1>
      </header>

      <div className="flex gap-4 mb-6">
        <button onClick={() => setTab('VEHICLES')} className={`px-4 py-2 text-sm md:text-base rounded-lg font-bold transition-all ${tab === 'VEHICLES' ? 'bg-accent-magenta text-white' : 'bg-white/10 text-white'}`}>车辆管理</button>
        <button onClick={() => setTab('ITEMS')} className={`px-4 py-2 text-sm md:text-base rounded-lg font-bold transition-all ${tab === 'ITEMS' ? 'bg-accent-magenta text-white' : 'bg-white/10 text-white'}`}>道具组装</button>
        <button onClick={() => setTab('LIVERIES')} className={`px-4 py-2 text-sm md:text-base rounded-lg font-bold transition-all ${tab === 'LIVERIES' ? 'bg-accent-magenta text-white' : 'bg-white/10 text-white'}`}>喷漆与涂装</button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {tab === 'VEHICLES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {garage.ownedVehicles.map(vId => {
              const v = VEHICLES_DB.find(x => x.id === vId);
              if (!v) return null;
              const isEquipped = garage.equippedVehicle === v.id;
              return (
                <div key={v.id} className={`neon-panel p-4 flex justify-between items-center transition-colors ${isEquipped ? 'border-accent-cyan bg-accent-cyan/10' : ''}`}>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{v.name}</h3>
                    <p className="text-xs text-zinc-400">极速: {v.baseSpeed} | 抓地: {v.baseGrip}</p>
                  </div>
                  <button 
                    onClick={() => equipVehicle(v.id)}
                    className={`px-4 py-2 rounded font-bold ${isEquipped ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                  >
                    {isEquipped ? '驾驭中' : '出战'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'ITEMS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {garage.ownedItems.map(itemId => {
              const item = ITEMS_DB.find(x => x.id === itemId);
              if (!item) return null;
              const isEquipped = garage.equippedItems[item.type] === item.id;
              return (
                <div key={item.id} className={`neon-panel p-4 flex justify-between items-center ${isEquipped ? 'border-accent-magenta bg-accent-magenta/10' : ''}`}>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{item.name}</h3>
                    <p className="text-xs text-zinc-400">{item.type === 'engine' ? '引擎部位' : '轮胎部位'} (点击卸载/安装)</p>
                  </div>
                  <button 
                    onClick={() => equipItem(item.id)}
                    className={`px-4 py-2 rounded font-bold ${isEquipped ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                  >
                    {isEquipped ? '已安装' : '安装'}
                  </button>
                </div>
              );
            })}
            {garage.ownedItems.length === 0 && (
              <div className="text-zinc-500 italic">尚未拥有任何道具，请前往商店购买。</div>
            )}
          </div>
        )}

        {tab === 'LIVERIES' && (
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-bold border-b border-white/10 pb-2 mb-4 text-white">基础漆色 (免费提供)</h2>
              <div className="flex gap-4 flex-wrap">
                {BASIC_COLORS.map(color => (
                  <button 
                    key={color}
                    onClick={() => equipLivery(color)}
                    className={`w-12 h-12 rounded-full border-2 transition-all ${garage.equippedLivery === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: color, boxShadow: garage.equippedLivery === color ? `0 0 20px ${color}` : 'none' }}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold border-b border-white/10 pb-2 mb-4 text-accent-magenta">特殊涂装 (商店购买)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {garage.ownedLiveries.map(lId => {
                  const l = LIVERIES_DB.find(x => x.id === lId);
                  if (!l) return null;
                  const isEquipped = garage.equippedLivery === l.id;
                  return (
                    <button 
                      key={l.id}
                      onClick={() => equipLivery(l.id)}
                      className={`neon-panel p-4 flex flex-col items-center gap-2 transition-all ${isEquipped ? 'border-accent-magenta bg-accent-magenta/10 shadow-[0_0_15px_rgba(255,0,234,0.3)]' : 'hover:border-white/30'}`}
                    >
                      <div 
                        className="w-16 h-16 rounded-full border border-white/20" 
                        style={{ background: l.isGradient ? `linear-gradient(135deg, ${l.colors.join(', ')})` : l.colors[0] }} 
                      />
                      <span className="font-bold text-sm text-center">{l.name}</span>
                    </button>
                  );
                })}
              </div>
              {garage.ownedLiveries.length === 0 && (
                <div className="text-zinc-500 italic">尚未拥有任何特殊涂装。</div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="mt-8 flex justify-end shrink-0">
        <button onClick={onClose} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded transition-all">返回菜单</button>
      </footer>
    </motion.div>
  );
}
