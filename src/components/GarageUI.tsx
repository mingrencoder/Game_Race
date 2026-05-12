import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerData } from '../types';
import { VEHICLES_DB, ITEMS_DB, LIVERIES_DB, BASIC_COLORS } from '../constants';
import VehiclePreview from './VehiclePreview';
import { Cpu, Wind, Zap, Gauge, CircleDot, ShieldAlert } from 'lucide-react';

interface GarageProps {
  garage: PlayerData;
  setGarage: React.Dispatch<React.SetStateAction<PlayerData>>;
  onClose: () => void;
}

import { getVehicleStats } from '../services/garageService';

export default function GarageUI({ garage, setGarage, onClose }: GarageProps) {
  const [tab, setTab] = useState<'VEHICLES' | 'ITEMS' | 'LIVERIES'>('VEHICLES');
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);

  const equipVehicle = (id: string) => setGarage(p => ({ ...p, profile: { ...p.profile, activeCarId: id } }));
  
  const [pendingEquip, setPendingEquip] = useState<{ id: string | null, typeKey: string, oldId: string | null, fee: number } | null>(null);
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
      const token = localStorage.getItem('neon_token');
      if (!token) return;

      fetch('/api/shop/equipPart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ carId: garage.profile.activeCarId, partId: newId, targetSlot: typeKey })
      })
      .then(res => res.json())
      .then(data => {
          if (data.success && data.playerData) {
              setGarage(data.playerData);
              setPendingEquip(null);
          } else {
              setEquipError(data.message || '拆装失败');
              setTimeout(() => setEquipError(null), 3000);
               setPendingEquip(null);
          }
      })
      .catch(err => {
          setEquipError('网络异常');
          setTimeout(() => setEquipError(null), 3000);
          setPendingEquip(null);
      });
  };

  const equipLivery = (val: string) => {
      const token = localStorage.getItem('neon_token');
      if (!token) return;

      fetch('/api/shop/equipLivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ carId: garage.profile.activeCarId, liveryId: val })
      })
      .then(res => res.json())
      .then(data => {
          if (data.success && data.playerData) {
              setGarage(data.playerData);
          } else {
              console.error(data.message || '装备涂装失败');
          }
      })
      .catch(err => console.error('网络请求异常:', err));
  };

  const getItemIcon = (type: string, size: number = 32) => {
    if (type === 'engine') return <Cpu size={size} className="text-[#00f2ff]" />;
    if (type === 'tires') return <CircleDot size={size} className="text-[#ff00ea]" />;
    if (type === 'acceleration') return <Zap size={size} className="text-[#f4ff40]" />;
    if (type === 'launch') return <Gauge size={size} className="text-[#00ff00]" />;
    if (type === 'drift') return <Wind size={size} className="text-[#ff2222]" />;
    return <Cpu size={size} />;
  };

  const currentVehicleData = VEHICLES_DB.find(v => v.id === garage.profile.activeCarId) || VEHICLES_DB[0];
  const vState = garage.garage.find(c => c.carId === garage.profile.activeCarId);
  
  const stats = getVehicleStats(currentVehicleData, vState);
  
  const currentSpeed = stats.speed;
  const currentGrip = stats.grip;
  const currentLaunch = stats.launch;
  const currentDrift = stats.drift;
  const currentAccel = stats.accel;
  
  const engineBoost = stats.engineBoost;
  const tireBoost = stats.tireBoost;
  const launchBoost = stats.launchBoost;
  const driftBoost = stats.driftBoost;
  const accelBoost = stats.accelBoost;

  const handleMaintenance = () => {
    if (!vState || vState.durability >= 100) return;
    
    const token = localStorage.getItem('neon_token');
    if (!token) return;

    fetch('/api/shop/repairCar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ carId: garage.profile.activeCarId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.playerData) {
            setGarage(data.playerData);
            setShowMaintenanceConfirm(false);
        } else {
             console.error(data.message || '保养失败');
        }
    })
    .catch(err => console.error('网络请求异常:', err));
  };

  return (
    <motion.div
      key="garage"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-50 bg-[#0d0e15] flex flex-col h-[100dvh]"
    >
      <header className="shrink-0 z-10 bg-[#0d0e15]/95 backdrop-blur-md border-b border-white/10 w-full">
        <div className="p-4 md:px-8 md:pt-6 md:pb-4 max-w-6xl mx-auto flex flex-col gap-4 w-full">
          <div className="flex justify-between items-start w-full">
            <h1 className="text-3xl md:text-4xl font-black italic text-accent-cyan tracking-widest shrink-0 leading-none mt-2">我的车库</h1>
            <div className="flex flex-col items-end gap-2 shrink-0">
               <div className="text-accent-yellow font-mono text-sm md:text-lg font-bold bg-black/50 px-3 md:px-4 py-1.5 rounded-lg border border-accent-yellow/30">
                 余额: {garage.wallet.coins.toLocaleString()} ⟁
               </div>
               <button onClick={onClose} className="w-full px-4 md:px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all text-sm shadow-[0_4px_10px_rgba(0,0,0,0.5)] whitespace-nowrap text-center">返回主菜单</button>
            </div>
          </div>
          
          <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex gap-4 text-center flex-wrap shrink-0">
          <div>
            <div className="text-xs text-zinc-500 uppercase">极速</div>
            <div className="text-xl font-black text-accent-cyan">
              {currentSpeed.toFixed(2)} <span className="text-xs text-zinc-500">{engineBoost > 0 ? `(+${engineBoost.toFixed(2)})` : ''}</span>
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
              {currentLaunch.toFixed(2)} <span className="text-xs text-zinc-500">{launchBoost > 0 ? `(+${launchBoost.toFixed(2)})` : ''}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 uppercase">漂移速度</div>
            <div className="text-xl font-black text-purple-400">
              {currentDrift.toFixed(2)} <span className="text-xs text-zinc-500">{driftBoost > 0 ? `(+${driftBoost.toFixed(2)})` : ''}</span>
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
                 color={LIVERIES_DB.find(l => l.id === vState?.equippedPaint) ? '#ffffff' : (vState?.equippedPaint || '#00f2ff')} 
                 liveryData={LIVERIES_DB.find(l => l.id === vState?.equippedPaint) ? { isGradient: LIVERIES_DB.find(l => l.id === vState?.equippedPaint)!.isGradient, colors: LIVERIES_DB.find(l => l.id === vState?.equippedPaint)!.colors } : undefined}
               />
               {vState && (
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                    <div className="px-2 py-1 bg-black/60 rounded text-xs font-mono font-bold border border-white/10">
                       Lv. +{vState.level}
                    </div>
                    {vState.isPermanent ? (
                       <span className="text-[10px] text-accent-cyan border border-accent-cyan/30 bg-accent-cyan/10 px-1.5 py-0.5 rounded">永久</span>
                    ) : vState.expireAt ? (
                       Math.ceil((vState.expireAt - Date.now()) / (1000 * 60 * 60 * 24)) > 0 ? (
                          <span className="text-[10px] text-accent-yellow bg-accent-yellow/10 px-1.5 py-0.5 rounded border border-accent-yellow/30">剩余 {Math.ceil((vState.expireAt - Date.now()) / (1000 * 60 * 60 * 24))} 天</span>
                       ) : (
                          <span className="text-[10px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">⚠️ 租期已尽，请前往商店续费</span>
                       )
                    ) : null}
                  </div>
               )}
             </div>
             <div className="text-center font-bold text-lg text-white tracking-widest uppercase">
               {currentVehicleData.name}
             </div>
             
             {vState && (
               <div className="flex flex-col gap-2">
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">耐久度</span>
                    <span className={`font-mono font-bold ${vState.durability < 30 ? 'text-red-500' : 'text-green-400'}`}>
                      {vState.durability} / 100
                    </span>
                 </div>
                 <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${vState.durability < 30 ? 'bg-red-500' : 'bg-green-400'}`} 
                      style={{ width: `${vState.durability}%` }}
                    />
                 </div>
                 {vState.durability < 100 && (
                   <button 
                     onClick={() => setShowMaintenanceConfirm(true)}
                     className="mt-2 text-xs py-1.5 px-3 rounded border border-white/20 hover:bg-white/10 text-white flex justify-center items-center gap-2 transition-colors"
                   >
                     <ShieldAlert size={14} /> 保养 (耗费 {currentVehicleData.maintenanceFee} ⟁)
                   </button>
                 )}
               </div>
             )}

             <div className="text-center text-sm text-zinc-400 border-t border-white/10 pt-4">
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
                  {garage.garage.map(vStateItem => {
                    const v = VEHICLES_DB.find(x => x.id === vStateItem.carId);
                    if (!v) return null;
                    const isEquipped = garage.profile.activeCarId === v.id;
                    const state = vStateItem;
                    const isExpired = state && state.expireAt && state.expireAt < Date.now();
                    return (
                      <div key={v.id} className={`neon-panel p-2.5 flex flex-col justify-between gap-2 transition-colors ${isEquipped ? 'border-accent-cyan bg-accent-cyan/10' : ''} ${isExpired ? 'opacity-50 grayscale border-red-500/50' : ''}`}>
                        <div className="flex justify-center items-center bg-black/40 rounded-lg py-1.5 border border-white/5 shadow-inner min-h-[70px] relative">
                          {state.isPermanent ? (
                            <div className="absolute top-1 right-1 z-10"><span className="text-[10px] text-accent-cyan border border-accent-cyan/30 bg-accent-cyan/10 px-1.5 py-0.5 rounded">永久</span></div>
                          ) : state.expireAt && Math.ceil((state.expireAt - Date.now()) / (1000 * 60 * 60 * 24)) > 0 ? (
                            <div className="absolute top-1 right-1 z-10"><span className="text-[10px] text-accent-yellow bg-accent-yellow/10 px-1.5 py-0.5 rounded border border-accent-yellow/30">剩余 {Math.ceil((state.expireAt - Date.now()) / (1000 * 60 * 60 * 24))} 天</span></div>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-red-500 font-bold text-[10px] z-10 rounded-lg whitespace-normal text-center p-1 leading-tight border border-red-500/50">⚠️ 租期已尽请前往商店续费</div>
                          )}
                          <VehiclePreview vehicleType={v.type} width={60} height={60} color={LIVERIES_DB.find(l => l.id === state?.equippedPaint) ? '#ffffff' : (state?.equippedPaint || '#00f2ff')} liveryData={LIVERIES_DB.find(l => l.id === state?.equippedPaint) ? { isGradient: LIVERIES_DB.find(l => l.id === state?.equippedPaint)!.isGradient, colors: LIVERIES_DB.find(l => l.id === state?.equippedPaint)!.colors } : undefined} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white mb-0.5 leading-tight truncate">
                             {v.name}
                             {state?.level > 0 && <span className="text-accent-yellow ml-1 text-xs">+{state.level}</span>}
                          </h3>
                          <div className="grid grid-cols-2 gap-x-1 text-[8px] text-zinc-400">
                            <span className="truncate">极速:{v.baseSpeed}</span>
                            <span className="truncate">抓地:{v.baseGrip}</span>
                            <span className="truncate">起步:{v.baseLaunch || 0}</span>
                            <span className="truncate">漂移:{v.baseDriftSpeed || 0}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => !isExpired && equipVehicle(v.id)}
                          disabled={isExpired}
                          className={`w-full py-1 rounded text-[11px] font-bold transition-transform active:scale-95 ${isEquipped ? 'bg-white text-black' : isExpired ? 'bg-red-500/20 text-red-300' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        >
                          {isEquipped ? '驾驭中' : isExpired ? '无法出战' : '出战'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

        {tab === 'ITEMS' && (
          <div className="flex flex-col gap-6 w-full">
            {(['engine', 'tires', 'acceleration', 'launch', 'drift'] as const).map(category => {
              const categoryItems = Array.from(new Set([
                 ...Object.keys(garage.inventory.parts).filter(id => garage.inventory.parts[id] > 0),
                 ...(vState?.equippedParts ? Object.values(vState.equippedParts).filter(Boolean) as string[] : [])
              ])).filter(id => {
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
                      const isEquipped = vState?.equippedParts[category] === item.id;
                      
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
                            {isEquipped ? `卸载 (库存:${garage.inventory?.parts?.[item.id] || 0})` : `安装 (库存:${garage.inventory?.parts?.[item.id] || 0})`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {Object.keys(garage.inventory.parts).length === 0 && (
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
                    className={`w-12 h-12 rounded-full border-2 transition-all ${(vState?.equippedPaint || '') === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: color, boxShadow: (vState?.equippedPaint || '') === color ? `0 0 20px ${color}` : 'none' }}
                  />
                ))}
              </div>
            </div>

            {(['INTERMEDIATE', 'ADVANCED', 'ELITE'] as const).map(tier => {
              const ownedTierLiveries = garage.inventory.paints
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
                      const isEquipped = (vState?.equippedPaint || '') === l.id;
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
    </div>
  </div>
</div>
      <AnimatePresence>
        {equipError && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-black/90 p-4 border border-red-500/50 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.3)] max-w-sm w-full">
    <div className="text-red-500 text-center text-sm font-bold mb-4">{equipError}</div>
    <button onClick={() => setEquipError(null)} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition-colors">确定</button>
  </motion.div>
</div>
      )}

      {pendingEquip && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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

      {showMaintenanceConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex justify-center text-accent-yellow mb-4">
                <ShieldAlert size={48} />
              </div>
              <h2 className="text-xl font-bold text-center text-white mb-2">确认保养车辆？</h2>
              <p className="text-zinc-400 text-center text-sm mb-6">
                将恢复 {currentVehicleData.name} 的 100% 耐久度<br/>
                总花费：<span className="text-accent-yellow font-bold text-lg">{currentVehicleData.maintenanceFee} ⟁</span>
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowMaintenanceConfirm(false)}
                  className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleMaintenance}
                  disabled={garage.wallet.coins < currentVehicleData.maintenanceFee}
                  className="flex-1 py-2 bg-accent-yellow hover:brightness-110 text-black font-bold rounded transition-colors disabled:opacity-50"
                >
                  确认保养
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
