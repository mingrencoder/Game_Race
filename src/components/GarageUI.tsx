import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GarageData } from '../types';
import { VEHICLES_DB, ITEMS_DB, LIVERIES_DB, BASIC_COLORS } from '../constants';
import VehiclePreview from './VehiclePreview';
import { Cpu, Wind, Zap, Gauge, CircleDot } from 'lucide-react';

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
    setGarage(g => {
      const typeKey = item.type as keyof typeof g.equippedItems;
      return {
        ...g,
        equippedItems: {
          ...g.equippedItems,
          [typeKey]: g.equippedItems[typeKey] === id ? null : id
        }
      };
    });
  };

  const equipLivery = (val: string) => setGarage(g => ({ ...g, equippedLivery: val }));

  const getItemIcon = (type: string, size: number = 32) => {
    if (type === 'engine') return <Cpu size={size} className="text-[#00f2ff]" />;
    if (type === 'tires') return <CircleDot size={size} className="text-[#ff00ea]" />;
    if (type === 'acceleration') return <Zap size={size} className="text-[#f4ff40]" />;
    if (type === 'launch') return <Gauge size={size} className="text-[#00ff00]" />;
    if (type === 'drift') return <Wind size={size} className="text-[#ff2222]" />;
    return <Cpu size={size} />;
  };

  const currentVehicleData = VEHICLES_DB.find(v => v.id === garage.equippedVehicle) || VEHICLES_DB[0];
  const engineBoost = ITEMS_DB.find(i => i.id === garage.equippedItems.engine)?.speedBoost || ITEMS_DB.find(i => i.id === garage.equippedItems.engine)?.boostValue || 0;
  const tireBoost = ITEMS_DB.find(i => i.id === garage.equippedItems.tires)?.gripBoost || ITEMS_DB.find(i => i.id === garage.equippedItems.tires)?.boostValue || 0;
  const launchBoost = ITEMS_DB.find(i => i.id === garage.equippedItems.launch)?.launchBoost || 0;
  const driftBoost = ITEMS_DB.find(i => i.id === garage.equippedItems.drift)?.driftSpeedBoost || 0;
  const accelBoost = ITEMS_DB.find(i => i.id === garage.equippedItems.acceleration)?.accelerationBoost || 0;
  
  const currentSpeed = currentVehicleData.baseSpeed + engineBoost;
  const currentGrip = currentVehicleData.baseGrip + tireBoost;
  const currentLaunch = currentVehicleData.baseLaunch + launchBoost;
  const currentDrift = currentVehicleData.baseDriftSpeed + driftBoost;
  const currentAccel = (currentVehicleData.baseAcceleration || 0.15) + accelBoost;

  return (
    <motion.div
      key="garage"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-50 bg-[#0d0e15] flex flex-col h-[100dvh]"
    >
      <header className="shrink-0 z-10 bg-[#0d0e15]/95 backdrop-blur-md border-b border-white/10 w-full relative">
        <div className="p-4 md:px-[60px] md:pt-[60px] md:pb-4 max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full">
          <h1 className="text-3xl md:text-4xl font-black italic text-accent-cyan tracking-widest shrink-0">我的车库</h1>
          
          <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex gap-4 mt-2 md:mt-0 text-center flex-wrap shrink-0">
          <div>
            <div className="text-xs text-zinc-500 uppercase">极速</div>
            <div className="text-xl font-black text-accent-cyan">
              {currentSpeed.toFixed(1)} <span className="text-xs text-zinc-500">{engineBoost > 0 ? `(+${engineBoost})` : ''}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 uppercase">抓地</div>
            <div className="text-xl font-black text-accent-yellow">
              {currentGrip.toFixed(2)} <span className="text-xs text-zinc-500">{tireBoost > 0 ? `(+${tireBoost.toFixed(2)})` : ''}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 uppercase">起步</div>
            <div className="text-xl font-black text-green-400">
              {currentLaunch.toFixed(1)} <span className="text-xs text-zinc-500">{launchBoost > 0 ? `(+${launchBoost.toFixed(1)})` : ''}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 uppercase">漂移速度</div>
            <div className="text-xl font-black text-purple-400">
              {currentDrift.toFixed(1)} <span className="text-xs text-zinc-500">{driftBoost > 0 ? `(+${driftBoost.toFixed(1)})` : ''}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 uppercase">加速</div>
            <div className="text-xl font-black text-orange-400">
              {currentAccel.toFixed(2)} <span className="text-xs text-zinc-500">{accelBoost > 0 ? `(+${accelBoost.toFixed(2)})` : ''}</span>
            </div>
          </div>
        </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto w-full px-4">
        <div className="py-4 md:py-8 w-full max-w-7xl mx-auto h-full flex flex-col md:flex-row gap-8">
          
          {/* 左侧：车辆总览与预览 */}
          <div className="hidden md:flex flex-col gap-4 w-64 shrink-0">
             <div className="bg-black/40 rounded-xl border border-white/10 p-6 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
               <VehiclePreview 
                 vehicleType={currentVehicleData.type} 
                 width={200} 
                 height={200} 
                 color={LIVERIES_DB.find(l => l.id === garage.equippedLivery) ? '#ffffff' : garage.equippedLivery} 
                 liveryData={LIVERIES_DB.find(l => l.id === garage.equippedLivery) ? { isGradient: LIVERIES_DB.find(l => l.id === garage.equippedLivery)!.isGradient, colors: LIVERIES_DB.find(l => l.id === garage.equippedLivery)!.colors } : undefined}
               />
             </div>
             <div className="text-center font-bold text-lg text-white tracking-widest uppercase">
               {currentVehicleData.name}
             </div>
             <div className="text-center text-sm text-zinc-400">
               我的出战赛车
             </div>
          </div>

          {/* 右侧：选项卡与列表 */}
          <div className="flex-1 flex flex-col h-full min-w-0">
            <div className="flex gap-4 mb-6 shrink-0 overflow-x-auto pb-2 scorllbar-hide">
              <button 
                onClick={() => setTab('VEHICLES')} 
                className={`px-4 py-2 text-sm md:text-base rounded-lg font-bold transition-all whitespace-nowrap ${tab === 'VEHICLES' ? 'bg-accent-magenta text-white shadow-[0_0_15px_rgba(255,0,234,0.3)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                1. 车辆改装
              </button>
              <button 
                onClick={() => setTab('ITEMS')} 
                className={`px-4 py-2 text-sm md:text-base rounded-lg font-bold transition-all whitespace-nowrap ${tab === 'ITEMS' ? 'bg-accent-magenta text-white shadow-[0_0_15px_rgba(255,0,234,0.3)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                2. 零件强化
              </button>
              <button 
                onClick={() => setTab('LIVERIES')} 
                className={`px-4 py-2 text-sm md:text-base rounded-lg font-bold transition-all whitespace-nowrap ${tab === 'LIVERIES' ? 'bg-accent-magenta text-white shadow-[0_0_15px_rgba(255,0,234,0.3)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                3. 外观重绘
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pb-8">
              {tab === 'VEHICLES' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {garage.ownedVehicles.map(vId => {
                    const v = VEHICLES_DB.find(x => x.id === vId);
                    if (!v) return null;
                    const isEquipped = garage.equippedVehicle === v.id;
                    return (
                      <div key={v.id} className={`neon-panel p-2.5 flex flex-col justify-between gap-2 transition-colors ${isEquipped ? 'border-accent-cyan bg-accent-cyan/10' : ''}`}>
                        <div className="flex justify-center items-center bg-black/40 rounded-lg py-1.5 border border-white/5 shadow-inner min-h-[70px]">
                          <VehiclePreview vehicleType={v.type} width={60} height={60} color={isEquipped ? garage.equippedLivery.startsWith('#') ? garage.equippedLivery : '#00f2ff' : '#00f2ff'} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white mb-0.5 leading-tight truncate">{v.name}</h3>
                          <div className="grid grid-cols-2 gap-x-1 text-[8px] text-zinc-400">
                            <span className="truncate">极速:{v.baseSpeed}</span>
                            <span className="truncate">抓地:{v.baseGrip}</span>
                            <span className="truncate">起步:{v.baseLaunch || 0}</span>
                            <span className="truncate">漂移:{v.baseDriftSpeed || 0}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => equipVehicle(v.id)}
                          className={`w-full py-1 rounded text-[11px] font-bold transition-transform active:scale-95 ${isEquipped ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        >
                          {isEquipped ? '驾驭中' : '出战'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

        {tab === 'ITEMS' && (
          <div className="flex flex-col gap-6 w-full">
            {(['engine', 'tires', 'acceleration', 'launch', 'drift'] as const).map(category => {
              const categoryItems = garage.ownedItems.filter(id => {
                const item = ITEMS_DB.find(x => x.id === id);
                return item?.type === category;
              }).sort((a, b) => {
                const itemA = ITEMS_DB.find(x => x.id === a);
                const itemB = ITEMS_DB.find(x => x.id === b);
                return (itemA?.price || 0) - (itemB?.price || 0);
              });

              if (categoryItems.length === 0) return null;

              const categoryNames = {
                engine: '引擎部位 (提供极速加成)',
                tires: '轮胎部位 (提供抓地力加成)',
                acceleration: '动力控制模块 (提供全局加速能力加成)',
                launch: '起步部位 (提供起步加速度加成)',
                drift: '悬挂部位 (提供漂移速度与稳定性加成)'
              };

              return (
                <div key={category} className="mb-4 w-full">
                  <h2 className="text-lg font-bold border-b border-white/10 pb-1.5 mb-3 text-accent-cyan shrink-0">{categoryNames[category]}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-2">
                    {categoryItems.map(itemId => {
                      const item = ITEMS_DB.find(x => x.id === itemId);
                      if (!item) return null;
                      const isEquipped = garage.equippedItems[category] === item.id;
                      
                      let boostDesc = '';
                      if (item.speedBoost || item.boostValue && item.type === 'engine') boostDesc = `极速 +${item.speedBoost || item.boostValue}`;
                      if (item.gripBoost || item.boostValue && item.type === 'tires') boostDesc = `抓地 +${item.gripBoost || item.boostValue}`;
                      if (item.launchBoost) boostDesc = `起步 +${item.launchBoost}`;
                      if (item.driftSpeedBoost) boostDesc = `漂移速度 +${item.driftSpeedBoost}`;
                      if (item.accelerationBoost) boostDesc = `加速能力 +${item.accelerationBoost * 100}%`;

                      return (
                        <div key={item.id} className={`neon-panel p-3 flex flex-col justify-between gap-2 ${isEquipped ? 'border-accent-magenta bg-accent-magenta/10 shadow-[0_0_15px_rgba(255,0,234,0.15)]' : ''}`}>
                          <div className="flex justify-center items-center h-16 bg-black/40 rounded-lg border border-white/5 shadow-inner">
                            {getItemIcon(item.type, 28)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white mb-0.5 truncate">{item.name}</h3>
                            <p className="text-[10px] text-accent-yellow truncate">{boostDesc}</p>
                          </div>
                          <button 
                            onClick={() => equipItem(item.id)}
                            className={`w-full py-1.5 rounded text-xs font-bold transition-all hover:scale-105 active:scale-95 ${isEquipped ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                          >
                            {isEquipped ? '已安装' : '安装'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
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
              <h2 className="text-xl font-bold border-b pb-2 mb-4 text-[#888888] border-[#888888]/50 drop-shadow-[0_0_8px_rgba(136,136,136,0.5)]">
                新星启航基础漆面 (免费提供)
              </h2>
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

            {(['INTERMEDIATE', 'ADVANCED', 'ELITE'] as const).map(tier => {
              const ownedTierLiveries = garage.ownedLiveries
                 .map(lId => LIVERIES_DB.find(x => x.id === lId))
                 .filter((l): l is NonNullable<typeof l> => l !== undefined && l.tier === tier);

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
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {ownedTierLiveries.map(l => {
                      const isEquipped = garage.equippedLivery === l.id;
                      return (
                        <button 
                          key={l.id}
                          onClick={() => equipLivery(l.id)}
                          className={`neon-panel p-3 flex flex-col items-center gap-1.5 transition-all ${isEquipped ? 'border-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'hover:border-white/30'}`}
                        >
                          <div className="bg-black/40 rounded p-1 mb-1 w-full flex justify-center border border-white/5">
                            <VehiclePreview vehicleType="standard" width={50} height={50} color="#fff" liveryData={{ isGradient: l.isGradient, colors: l.colors }} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div 
                              className="w-3.5 h-3.5 rounded-full border border-white/20 inline-block align-middle mr-1.5" 
                              style={{ background: l.isGradient ? `linear-gradient(135deg, ${l.colors.join(', ')})` : l.colors[0] }} 
                            />
                            <span className="font-bold text-xs text-center align-middle truncate max-w-[80px]">{l.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {ownedTierLiveries.length === 0 && (
                    <div className="text-zinc-500 italic">尚未拥有此类别的涂装。</div>
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
          </div>
        </div>
      </div>
    </motion.div>
  );
}
