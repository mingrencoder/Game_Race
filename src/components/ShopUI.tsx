import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GarageData } from '../types';
import { VEHICLES_DB, ITEMS_DB, LIVERIES_DB } from '../constants';

interface ShopProps {
  garage: GarageData;
  setGarage: React.Dispatch<React.SetStateAction<GarageData>>;
  onClose: () => void;
}

export default function ShopUI({ garage, setGarage, onClose }: ShopProps) {
  const [tab, setTab] = useState<'VEHICLES' | 'ITEMS' | 'LIVERIES'>('VEHICLES');

  const buyVehicle = (id: string, price: number) => {
    if (garage.coins >= price && !garage.ownedVehicles.includes(id)) {
      setGarage(g => ({
        ...g,
        coins: g.coins - price,
        ownedVehicles: [...g.ownedVehicles, id]
      }));
    }
  };

  const buyItem = (id: string, price: number) => {
    if (garage.coins >= price && !garage.ownedItems.includes(id)) {
      setGarage(g => ({
        ...g,
        coins: g.coins - price,
        ownedItems: [...g.ownedItems, id]
      }));
    }
  };

  const buyLivery = (id: string, price: number) => {
    if (garage.coins >= price && !garage.ownedLiveries.includes(id)) {
      setGarage(g => ({
        ...g,
        coins: g.coins - price,
        ownedLiveries: [...g.ownedLiveries, id]
      }));
    }
  };

  return (
    <motion.div
      key="shop"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col min-h-[100dvh] p-4 md:p-[60px] max-w-5xl mx-auto overflow-y-auto"
    >
      <header className="flex justify-between items-end mb-8 border-b border-white/10 pb-4 mt-8 md:mt-0">
        <h1 className="text-3xl md:text-4xl font-black italic text-accent-magenta tracking-widest">补给站</h1>
        <div className="text-xl md:text-2xl font-bold text-accent-yellow">{garage.coins} ⟁</div>
      </header>

      <div className="flex gap-4 mb-6">
        <button onClick={() => setTab('VEHICLES')} className={`px-6 py-2 rounded-lg font-bold transition-all ${tab === 'VEHICLES' ? 'bg-accent-cyan text-black' : 'bg-white/10 text-white'}`}>赛车中心</button>
        <button onClick={() => setTab('ITEMS')} className={`px-6 py-2 rounded-lg font-bold transition-all ${tab === 'ITEMS' ? 'bg-accent-cyan text-black' : 'bg-white/10 text-white'}`}>零件改装</button>
        <button onClick={() => setTab('LIVERIES')} className={`px-6 py-2 rounded-lg font-bold transition-all ${tab === 'LIVERIES' ? 'bg-accent-cyan text-black' : 'bg-white/10 text-white'}`}>喷漆与涂装</button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {tab === 'VEHICLES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VEHICLES_DB.map(v => {
              const owned = garage.ownedVehicles.includes(v.id);
              const canAfford = garage.coins >= v.price;
              return (
                <div key={v.id} className="neon-panel p-4 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{v.name}</h3>
                    <p className="text-xs text-zinc-400">极速: {v.baseSpeed} | 抓地: {v.baseGrip} | 起步: {(v.baseLaunch || 0)} | 漂移: {(v.baseDriftSpeed || 0)}</p>
                  </div>
                  {owned ? (
                    <span className="text-accent-cyan font-bold text-sm w-full text-center py-2 bg-accent-cyan/10 rounded">已拥有</span>
                  ) : (
                    <button 
                      onClick={() => buyVehicle(v.id, v.price)}
                      disabled={!canAfford}
                      className="w-full py-2 bg-accent-yellow text-black font-bold rounded disabled:opacity-30 transition-all hover:brightness-110 active:scale-95"
                    >
                      购买: {v.price} ⟁
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'ITEMS' && (
          <div className="flex flex-col gap-6 w-full">
            {(['engine', 'tires', 'acceleration', 'launch', 'drift'] as const).map(category => {
              const categoryItems = ITEMS_DB.filter(i => i.type === category);
              if (categoryItems.length === 0) return null;
              
              const categoryNames = {
                engine: '引擎部位 (提供极速加成)',
                tires: '轮胎部位 (提供抓地力加成)',
                acceleration: '动力控制模块 (提供全局加速能力加成)',
                launch: '起跑部位 (提供起步加速度加成)',
                drift: '悬挂部位 (提供漂移速度与稳定性加成)'
              };

              return (
                <div key={category} className="mb-4 w-full">
                  <h2 className="text-xl font-bold border-b border-white/10 pb-2 mb-4 text-accent-cyan shrink-0">{categoryNames[category]}</h2>
                  <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                    {categoryItems.map(item => {
                      const owned = garage.ownedItems.includes(item.id);
                      const canAfford = garage.coins >= item.price;
                      
                      let boostDesc = '';
                      if (item.speedBoost || item.boostValue && item.type === 'engine') boostDesc = `极速 +${item.speedBoost || item.boostValue}`;
                      if (item.gripBoost || item.boostValue && item.type === 'tires') boostDesc = `抓地 +${item.gripBoost || item.boostValue}`;
                      if (item.launchBoost) boostDesc = `起步 +${item.launchBoost}`;
                      if (item.driftSpeedBoost) boostDesc = `漂移速度 +${item.driftSpeedBoost}`;
                      if (item.accelerationBoost) boostDesc = `加速能力 +${item.accelerationBoost * 100}%`;

                      return (
                        <div key={item.id} className="neon-panel p-4 flex flex-col justify-between gap-3 w-64 shrink-0 snap-center">
                          <div>
                            <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                            <p className="text-xs text-accent-yellow">{boostDesc}</p>
                          </div>
                          {owned ? (
                            <span className="text-accent-cyan font-bold text-sm w-full text-center py-2 bg-accent-cyan/10 rounded">已拥有</span>
                          ) : (
                            <button 
                              onClick={() => buyItem(item.id, item.price)}
                              disabled={!canAfford}
                              className="w-full py-2 bg-accent-yellow text-black font-bold rounded disabled:opacity-30 transition-all hover:brightness-110 active:scale-95"
                            >
                              购买: {item.price} ⟁
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'LIVERIES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LIVERIES_DB.map(l => {
              const owned = garage.ownedLiveries.includes(l.id);
              const canAfford = garage.coins >= l.price;
              return (
                <div key={l.id} className="neon-panel p-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full border border-white/20" 
                      style={{ background: l.isGradient ? `linear-gradient(135deg, ${l.colors.join(', ')})` : l.colors[0] }} 
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">{l.name}</h3>
                    </div>
                  </div>
                  {owned ? (
                    <span className="text-accent-cyan font-bold">已拥有</span>
                  ) : (
                    <button 
                      onClick={() => buyLivery(l.id, l.price)}
                      disabled={!canAfford}
                      className="px-4 py-2 bg-accent-yellow text-black font-bold rounded disabled:opacity-30"
                    >
                      {l.price} ⟁
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="mt-8 flex justify-end shrink-0">
        <button onClick={onClose} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded transition-all">返回菜单</button>
      </footer>
    </motion.div>
  );
}
