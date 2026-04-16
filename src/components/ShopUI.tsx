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
        <h1 className="text-3xl md:text-4xl font-black italic text-accent-magenta tracking-widest">STORE</h1>
        <div className="text-xl md:text-2xl font-bold text-accent-yellow">{garage.coins} ⟁</div>
      </header>

      <div className="flex gap-4 mb-6">
        <button onClick={() => setTab('VEHICLES')} className={`px-6 py-2 rounded-lg font-bold transition-all ${tab === 'VEHICLES' ? 'bg-accent-cyan text-black' : 'bg-white/10 text-white'}`}>赛车 (VEHICLES)</button>
        <button onClick={() => setTab('ITEMS')} className={`px-6 py-2 rounded-lg font-bold transition-all ${tab === 'ITEMS' ? 'bg-accent-cyan text-black' : 'bg-white/10 text-white'}`}>道具 (ITEMS)</button>
        <button onClick={() => setTab('LIVERIES')} className={`px-6 py-2 rounded-lg font-bold transition-all ${tab === 'LIVERIES' ? 'bg-accent-cyan text-black' : 'bg-white/10 text-white'}`}>涂装 (LIVERIES)</button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {tab === 'VEHICLES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VEHICLES_DB.map(v => {
              const owned = garage.ownedVehicles.includes(v.id);
              const canAfford = garage.coins >= v.price;
              return (
                <div key={v.id} className="neon-panel p-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{v.name}</h3>
                    <p className="text-xs text-zinc-400">极速: {v.baseSpeed} | 抓地: {v.baseGrip}</p>
                  </div>
                  {owned ? (
                    <span className="text-accent-cyan font-bold">已拥有</span>
                  ) : (
                    <button 
                      onClick={() => buyVehicle(v.id, v.price)}
                      disabled={!canAfford}
                      className="px-4 py-2 bg-accent-yellow text-black font-bold rounded disabled:opacity-30"
                    >
                      {v.price} ⟁
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'ITEMS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ITEMS_DB.map(item => {
              const owned = garage.ownedItems.includes(item.id);
              const canAfford = garage.coins >= item.price;
              return (
                <div key={item.id} className="neon-panel p-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{item.name}</h3>
                    <p className="text-xs text-zinc-400">{item.type === 'engine' ? `速度提升: +${item.boostValue}` : `抓地提升: +${item.boostValue}`}</p>
                  </div>
                  {owned ? (
                    <span className="text-accent-cyan font-bold">已拥有</span>
                  ) : (
                    <button 
                      onClick={() => buyItem(item.id, item.price)}
                      disabled={!canAfford}
                      className="px-4 py-2 bg-accent-yellow text-black font-bold rounded disabled:opacity-30"
                    >
                      {item.price} ⟁
                    </button>
                  )}
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
