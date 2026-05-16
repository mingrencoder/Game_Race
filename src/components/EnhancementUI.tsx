import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerData, GarageCar } from '../types';
import { VEHICLES_DB, ITEMS_DB, UPGRADE_CONFIG, SYS_CONFIG } from '../constants';
import VehiclePreview from './VehiclePreview';
import { Wrench, Zap, Shield, ArrowUpCircle } from 'lucide-react';

interface EnhancementUIProps {
  garage: PlayerData;
  setGarage: React.Dispatch<React.SetStateAction<PlayerData>>;
  onClose: () => void;
}

import { getVehicleStats, LEVEL_MULTI } from '../services/garageService';

/**
 * 赛车深度强化工坊界面
 * 处理赛车升星/强化进阶（+1 到 +5）等消耗大量材料的操作
 * 注意：只有服务器能够决定暴击/升级失败等最终随机状态，前端仅负责发送 payload。
 */
export default function EnhancementUI({ garage, setGarage, onClose }: EnhancementUIProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(garage.profile.activeCarId || garage.garage[0]?.carId);
  const vehicleState = garage.garage.find(c => c.carId === selectedVehicleId);
  const vehicleDef = VEHICLES_DB.find(v => v.id === selectedVehicleId);

  const getTierInt = (tier: string) => {
    const match = tier.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const getCurrentStats = (level: number) => {
    if (!vehicleDef) return { speed: 0, accel: 0, grip: 0, launch: 0, drift: 0 };
    
    // Simulate state with the target level, ignoring durability debuff for enhancement preview display by spoofing durability to SYS_CONFIG.MAX_DURABILITY
    const mockState = {
      ...vehicleState,
      durability: SYS_CONFIG.MAX_DURABILITY,
      level: level
    } as GarageCar;

    const stats = getVehicleStats(vehicleDef, mockState);

    return { 
      speed: stats.speed, 
      accel: stats.accel, 
      grip: stats.grip, 
      launch: stats.launch, 
      drift: stats.drift
    };
  };

  const currentStats = getCurrentStats(vehicleState?.level || 0);
  const nextStats = vehicleState && vehicleState.level < SYS_CONFIG.MAX_UPGRADE_LEVEL ? getCurrentStats(vehicleState.level + 1) : null;

  const [useShield, setUseShield] = useState(false);
  const [resultMsg, setResultMsg] = useState<{msg: string, success: boolean} | null>(null);

  if (!vehicleState || !vehicleDef) return null;

  const config = UPGRADE_CONFIG[vehicleState.level];
  const req = config ? { coreType: config.material, amount: config.cost, name: config.materialName } : null;
  const shield = config && config.protection ? { shieldType: config.protection, cost: config.protectionCost, name: config.protectionName } : null;
  const successRate = vehicleState.level < SYS_CONFIG.MAX_UPGRADE_LEVEL && config ? config.rate[getTierInt(vehicleDef.tier)] || 0 : 0;

  const handleUpgrade = () => {
    if (vehicleState.level >= SYS_CONFIG.MAX_UPGRADE_LEVEL) return;
    
    const token = localStorage.getItem('neon_token');
    if (!token) return;

    fetch('/api/upgrade/car', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ carId: vehicleState.carId, useProtectionCard: useShield })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.playerData) {
            setGarage(data.playerData);
            setResultMsg({ msg: data.message || '操作成功', success: data.isSuccess !== false });
        } else {
            setResultMsg({ msg: data.message || '强化失败！', success: false });
        }
    })
    .catch(err => {
        setResultMsg({ msg: '网络异常，强化失败。', success: false });
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="w-full max-w-5xl mb-4 flex justify-between items-center shrink-0">
        <h2 className="text-2xl md:text-3xl font-black text-accent-magenta italic flex items-center gap-2">
            <Wrench size={28} /> 强化工坊
        </h2>
        <button onClick={onClose} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all text-sm backdrop-blur-md shadow-lg">返回主菜单</button>
      </div>
      
      <div className="w-full max-w-5xl bg-zinc-900 border border-white/10 rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative max-h-[85vh] md:max-h-[80vh]">
        
        {/* Left Side: Vehicle List */}
        <div className="w-full md:w-1/3 border-r border-white/5 bg-black/50 p-4 shrink-0 max-h-[35vh] md:max-h-full overflow-y-auto">
          <div className="flex flex-col gap-2">
            {garage.garage.map(vState => vState.carId).map(id => {
               const v = VEHICLES_DB.find(x => x.id === id);
               const lvState = garage.garage.find(c => c.carId === id);
               if (!v) return null;
               return (
                 <button
                   key={id}
                   onClick={() => { setSelectedVehicleId(id); setResultMsg(null); setUseShield(false); }}
                   className={`p-3 rounded flex items-center justify-between text-left transition-colors border ${selectedVehicleId === id ? 'bg-accent-magenta/20 border-accent-magenta text-white' : 'bg-white/5 border-transparent text-zinc-400 hover:bg-white/10'}`}
                 >
                   <div>
                     <div className="font-bold">{v.name}</div>
                     <div className="text-xs opacity-70">Lv: +{lvState?.level || 0}</div>
                   </div>
                 </button>
               );
            })}
          </div>
        </div>

        {/* Right Side: Enhancement Studio */}
        <div className="w-full md:w-2/3 p-6 flex flex-col items-center overflow-y-auto">
           <div className="w-full flex justify-between items-center mb-6">
             <h3 className="text-2xl font-bold text-white">{vehicleDef.name} <span className="text-accent-yellow">+{vehicleState.level}</span></h3>
             <div className="text-xl font-bold text-accent-yellow bg-black/50 px-4 py-1 rounded">{garage.wallet.coins} ⟁</div>
           </div>

           <div className="relative w-full aspect-video md:aspect-auto md:h-64 flex justify-center items-center bg-black/30 rounded-xl mb-6 neon-panel">
             <VehiclePreview vehicleType={vehicleDef.type} width={180} height={180} color="#00f2ff" />
             {vehicleState.level >= SYS_CONFIG.MAX_UPGRADE_LEVEL && (
                <div className="absolute top-4 right-4 bg-accent-yellow text-black font-black px-3 py-1 rounded shadow-[0_0_15px_rgba(255,223,0,0.6)]">
                  MAX LEVEL
                </div>
             )}
           </div>

           <div className="w-full grid grid-cols-2 gap-4 text-sm mb-6">
             <div className="bg-black/40 p-3 rounded flex justify-between">
                <span className="text-zinc-400">极速</span>
                <span className="font-mono text-white flex items-center gap-2">
                  {currentStats.speed.toFixed(2)}
                  {nextStats && <span className="text-green-400">→ {nextStats.speed.toFixed(2)}</span>}
                </span>
             </div>
             <div className="bg-black/40 p-3 rounded flex justify-between">
                <span className="text-zinc-400">加速度</span>
                <span className="font-mono text-white flex items-center gap-2">
                  {currentStats.accel.toFixed(2)}
                  {nextStats && <span className="text-green-400">→ {nextStats.accel.toFixed(2)}</span>}
                </span>
             </div>
             <div className="bg-black/40 p-3 rounded flex justify-between">
                <span className="text-zinc-400">抓地</span>
                <span className="font-mono text-white flex items-center gap-2">
                  {currentStats.grip.toFixed(2)}
                  {nextStats && <span className="text-green-400">→ {nextStats.grip.toFixed(2)}</span>}
                </span>
             </div>
             <div className="bg-black/40 p-3 rounded flex justify-between flex-col col-span-2 md:col-span-1">
                <div className="flex justify-between w-full">
                  <span className="text-zinc-400">起步</span>
                  <span className="font-mono text-white flex items-center gap-2">
                    {currentStats.launch.toFixed(2)}
                    {nextStats && <span className="text-green-400">→ {nextStats.launch.toFixed(2)}</span>}
                  </span>
                </div>
             </div>
             <div className="bg-black/40 p-3 rounded flex justify-between flex-col col-span-2 md:col-span-1">
                <div className="flex justify-between w-full">
                  <span className="text-zinc-400">漂移</span>
                  <span className="font-mono text-white flex items-center gap-2">
                    {currentStats.drift.toFixed(2)}
                    {nextStats && <span className="text-green-400">→ {nextStats.drift.toFixed(2)}</span>}
                  </span>
                </div>
             </div>
           </div>

           {resultMsg && (
             <div className={`w-full p-3 text-center rounded mb-4 font-bold border ${resultMsg.success ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-red-500/20 text-red-500 border-red-500'}`}>
               {resultMsg.msg}
             </div>
           )}

           {vehicleState.level < SYS_CONFIG.MAX_UPGRADE_LEVEL && req ? (
             <div className="w-full bg-black/60 p-4 rounded-xl border border-white/10 flex flex-col gap-4">
                <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
                  <span className="text-zinc-400">成功率</span>
                  <span className="font-black text-xl text-accent-cyan">{(successRate * 100).toFixed(0)}%</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">强化核心消耗</span>
                  <div className="flex items-center gap-2">
                     <span className="text-white">{req.name} x{req.amount}</span>
                     <span className={`font-mono ${garage.inventory.materials[req.coreType] >= req.amount ? 'text-green-400' : 'text-red-400'}`}>
                        ({garage.inventory.materials[req.coreType]}/{req.amount})
                     </span>
                  </div>
                </div>

                {shield && (
                  <div className="flex justify-between items-center text-sm border-t border-white/10 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                      <input type="checkbox" checked={useShield} onChange={(e) => setUseShield(e.target.checked)} className="rounded text-accent-magenta focus:ring-accent-magenta bg-black" />
                      使用保护卡 (失败防掉级)
                    </label>
                    <div className="flex items-center gap-2">
                       <Shield size={16} className={`${useShield ? 'text-accent-magenta' : 'text-zinc-600'}`} />
                       <span className="text-white">{shield.name}</span>
                       <span className={`font-mono ${garage.inventory.protectors[shield.shieldType] > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ({garage.inventory.protectors[shield.shieldType]}/1)
                       </span>
                       {(useShield && garage.inventory.protectors[shield.shieldType] === 0) && <span className="text-accent-yellow">-{shield.cost}⟁</span>}
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleUpgrade}
                  className="mt-2 w-full py-3 bg-accent-magenta hover:bg-magenta-hover text-white font-black rounded flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,0,234,0.3)]"
                >
                  <ArrowUpCircle size={20} /> 执行强化
                </button>
             </div>
           ) : (
             <div className="w-full text-center text-zinc-500 italic mt-8 p-4 bg-white/5 rounded border border-white/5">
                此车辆已达到最高强化等级 (+{SYS_CONFIG.MAX_UPGRADE_LEVEL})
             </div>
           )}

        </div>
      </div>
    </motion.div>
  );
}
