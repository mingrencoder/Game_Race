import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GarageData } from '../types';
import { VEHICLES_DB, ITEMS_DB, LIVERIES_DB } from '../constants';
import VehiclePreview from './VehiclePreview';
import { Cpu, Wind, Zap, Gauge, CircleDot } from 'lucide-react';

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

  const getItemIcon = (type: string) => {
    if (type === 'engine') return <Cpu size={32} className="text-[#00f2ff]" />;
    if (type === 'tires') return <CircleDot size={32} className="text-[#ff00ea]" />;
    if (type === 'acceleration') return <Zap size={32} className="text-[#f4ff40]" />;
    if (type === 'launch') return <Gauge size={32} className="text-[#00ff00]" />;
    if (type === 'drift') return <Wind size={32} className="text-[#ff2222]" />;
    return <Cpu size={32} />;
  };

  return (
    <motion.div
      key="shop"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col min-h-[100dvh] p-4 md:p-[60px] max-w-7xl mx-auto overflow-y-auto w-full"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {VEHICLES_DB.map(v => {
              const owned = garage.ownedVehicles.includes(v.id);
              const canAfford = garage.coins >= v.price;
              return (
                <div key={v.id} className="neon-panel p-4 flex flex-col justify-between gap-3">
                  <div className="flex justify-center items-center bg-black/40 rounded-lg py-4 border border-white/5 shadow-inner min-h-[120px]">
                    <VehiclePreview vehicleType={v.type} width={120} height={120} color="#00f2ff" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{v.name}</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-[10px] text-zinc-400">
                      <span>极速: {v.baseSpeed}</span>
                      <span>抓地: {v.baseGrip}</span>
                      <span>起步: {v.baseLaunch || 0}</span>
                      <span>漂移: {v.baseDriftSpeed || 0}</span>
                      <span>加速: {v.baseAcceleration || 0.15}</span>
                    </div>
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
              const categoryItems = ITEMS_DB.filter(i => i.type === category).sort((a, b) => a.price - b.price);
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
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
                        <div key={item.id} className="neon-panel p-4 flex flex-col justify-between gap-3 min-w-[200px]">
                          <div className="flex justify-center items-center h-20 bg-black/40 rounded-lg border border-white/5 shadow-inner">
                            {getItemIcon(item.type)}
                          </div>
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
          <div className="flex flex-col gap-8">
            {(['INTERMEDIATE', 'ADVANCED', 'ELITE'] as const).map(tier => {
              const tierLiveries = LIVERIES_DB.filter(l => l.tier === tier);
              if (tierLiveries.length === 0) return null;
              
              const tierNames = {
                'INTERMEDIATE': '锐意先锋系列改装漆面',
                'ADVANCED': '幻影流光系列限定漆面',
                'ELITE': '极光大师系列典藏漆面'
              };
              
              const tierColors = {
                 'INTERMEDIATE': 'text-[#ff4500] border-[#ff4500]/50 drop-shadow-[0_0_8px_rgba(255,69,0,0.5)]',
                 'ADVANCED': 'text-accent-cyan border-accent-cyan/50 drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]',
                 'ELITE': 'text-accent-magenta border-accent-magenta/50 drop-shadow-[0_0_8px_rgba(255,0,234,0.5)]'
              };

              return (
                <div key={tier}>
                  <h2 className={`text-xl font-bold border-b pb-2 mb-4 ${tierColors[tier]}`}>
                    {tierNames[tier]}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tierLiveries.map(l => {
                      const owned = garage.ownedLiveries.includes(l.id);
                      const canAfford = garage.coins >= l.price;
                      return (
                        <div key={l.id} className="neon-panel p-4 flex flex-col justify-between items-center gap-3">
                          <div className="bg-black/40 rounded p-2 mb-2 w-full flex justify-center border border-white/5">
                            <VehiclePreview vehicleType="standard" width={60} height={60} color="#fff" liveryData={{ isGradient: l.isGradient, colors: l.colors }} />
                          </div>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border border-white/20 shrink-0" 
                              style={{ background: l.isGradient ? `linear-gradient(135deg, ${l.colors.join(', ')})` : l.colors[0] }} 
                            />
                            <h3 className="text-sm font-bold text-white text-center leading-tight">{l.name}</h3>
                          </div>
                          {owned ? (
                            <span className="text-accent-cyan font-bold text-sm w-full text-center py-2 bg-accent-cyan/10 rounded">已拥有</span>
                          ) : (
                            <button 
                              onClick={() => buyLivery(l.id, l.price)}
                              disabled={!canAfford}
                              className="w-full py-2 bg-accent-yellow text-black font-bold rounded disabled:opacity-30 whitespace-nowrap transition-all hover:brightness-110 active:scale-95"
                            >
                              购买: {l.price} ⟁
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
      </div>

      <footer className="mt-8 flex justify-end shrink-0">
        <button onClick={onClose} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded transition-all">返回菜单</button>
      </footer>
    </motion.div>
  );
}
