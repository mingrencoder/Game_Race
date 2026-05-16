import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, ShieldAlert, Cpu, Key, Database, ChevronRight, Hash, Search, Trash2, Edit, Check } from 'lucide-react';
import { VEHICLES_DB, ITEMS_DB, LIVERIES_DB, TRACKS, SYS_CONFIG } from '../constants';
import { PlayerData } from '../types';

interface GMConsoleUIProps {
  onClose?: () => void;
  playerData?: PlayerData;
  setPlayerData?: React.Dispatch<React.SetStateAction<PlayerData>>;
  onClearLeaderboard?: (trackId: string, laps: number) => void;
}

/**
 * 开发者与管理员 (GM) 专属终端控制台
 * 必须鉴权 (uid === 'admin') 才能使用对应的服务端特权 API
 * 支持发放货币、车辆、配件以及管理全服玩家和排行榜
 */
export default function GMConsoleUI({ onClose, playerData, setPlayerData, onClearLeaderboard }: GMConsoleUIProps) {
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C' | 'D'>('A');

  const [modalInfo, setModalInfo] = useState<{ visible: boolean; type: 'error' | 'success'; message: string }>({
    visible: false,
    type: 'success',
    message: ''
  });

  const showModal = (type: 'error' | 'success', message: string) => {
    setModalInfo({ visible: true, type, message });
  };

  // Mock target state
  const [targetProfile, setTargetProfile] = useState<{
    uid: string;
    nickname: string;
    status: string;
    banReason: string;
    coins: number;
  }>({
    uid: '', nickname: '', status: 'active', banReason: '', coins: 0
  });

  const [targetGarage, setTargetGarage] = useState<any[]>([]);
  const [targetInventory, setTargetInventory] = useState<PlayerData['inventory']>({
    materials: { core_primary: 0, core_advanced: 0, core_legendary: 0 },
    protectors: { card_silver: 0, card_gold: 0 },
    specialItems: { rename_card: 0 },
    parts: {},
    paints: []
  });
  const [inventoryDeltas, setInventoryDeltas] = useState<Record<string, number>>({});

  // Search/Load mock target
  const handleLoadTarget = () => {
    if (!targetIdentifier.trim()) {
      showModal('error', '请先输入目标车手 UID 或昵称进行查询');
      return;
    }
    const token = localStorage.getItem('neon_token');
    fetch('/api/gm/queryPlayer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ targetUid: targetIdentifier })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.targetData) {
        const pd = data.targetData;
        setTargetProfile({
          uid: pd.profile.uid,
          nickname: pd.profile.nickname,
          status: pd.profile.status,
          banReason: pd.profile.banReason || '',
          coins: pd.wallet.coins
        });
        setTargetGarage(pd.garage || []);
        setTargetInventory(pd.inventory || {
          materials: { core_primary: 0, core_advanced: 0, core_legendary: 0 },
          protectors: { card_silver: 0, card_gold: 0 },
          specialItems: { rename_card: 0 },
          parts: {},
          paints: []
        });
        setInventoryDeltas({});
        showModal('success', `成功查询到目标车手 [${pd.profile.uid}] 的全局数据快照。`);
      } else {
        showModal('error', data.message || '查询失败');
      }
    })
    .catch(err => {
      showModal('error', '网络连接异常');
      console.error(err);
    });
  };

  const validateTarget = () => {
    if (!targetIdentifier.trim() || !targetProfile.uid) {
      showModal('error', '请先输入目标车手 ID 或昵称，并点击【查询玩家信息】！');
      return false;
    }
    return true;
  };

  const renderItemCard = (id: string, name: string, stock: number, desc?: string, isBooleanType?: boolean) => {
     const delta = inventoryDeltas[id] || 0;
     const final = Math.max(0, stock + delta);
     return (
      <div key={id} className="border border-yellow-900/40 bg-black/40 p-3 flex flex-col gap-2">
         <div className="text-yellow-400 font-bold text-xs truncate" title={name}>{name}</div>
         <div className="text-[10px] text-yellow-700">当前拥有: {isBooleanType ? (stock ? '是' : '否') : stock} {desc ? `| ${desc}` : ''}</div>
         <div className="flex items-center mt-2 group">
            <button onClick={() => setInventoryDeltas(p => {
               const currentDelta = p[id] || 0;
               if (stock + currentDelta <= 0) return p;
               return { ...p, [id]: currentDelta - 1 };
            })} className="w-6 h-6 bg-yellow-900/30 text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold flex items-center justify-center">-</button>
            <input type="number" value={delta === 0 ? '' : delta} onChange={e => {
               let val = parseInt(e.target.value) || 0;
               if (stock + val < 0) { val = -stock; }
               setInventoryDeltas(p => ({ ...p, [id]: val }));
            }} placeholder="0" className="w-16 h-6 bg-black border-y border-yellow-900/30 text-yellow-300 text-center outline-none focus:border-yellow-500 text-xs" />
            <button onClick={() => setInventoryDeltas(p => ({...p, [id]: (p[id]||0)+1}))} className="w-6 h-6 bg-yellow-900/30 text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold flex items-center justify-center">+</button>
         </div>
         <div className={`text-[10px] mt-1 font-bold ${final > stock ? 'text-green-500' : final < stock ? 'text-red-500' : 'text-yellow-600'}`}>
            最终结果: {isBooleanType ? (final > 0 ? '是' : '否') : final}
         </div>
      </div>
     );
  };

  // ACTION A: Profile & Wallet
  const handleActionA = () => {
    if (!validateTarget()) return;
    const token = localStorage.getItem('neon_token');
    fetch('/api/gm/updateProfile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        targetUid: targetProfile.uid,
        updates: {
          status: targetProfile.status,
          banReason: targetProfile.banReason,
          nickname: targetProfile.nickname,
          wallet: {
            coins: targetProfile.coins
          }
        }
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showModal('success', `✅ 成功将特定车手 [ ${targetProfile.uid} ] 的状态更新为: ${targetProfile.status}，当前金币覆写为 ${targetProfile.coins} ⟁`);
      } else {
        showModal('error', data.message || '更新失败');
      }
    })
    .catch(err => showModal('error', '网络异常'));
  };

  // ACTION B: Garage New Car Form
  const [selectedNewCarId, setSelectedNewCarId] = useState<string>(VEHICLES_DB[0]?.id || '');
  const [newCarLevel, setNewCarLevel] = useState<number>(1);
  const [newCarDurability, setNewCarDurability] = useState<number>(SYS_CONFIG.MAX_DURABILITY);

  const handleActionB_Add = () => {
    if (!validateTarget()) return;
    if (!selectedNewCarId) {
      showModal('error', '请先从车辆库中选择一辆车！');
      return;
    }
    const token = localStorage.getItem('neon_token');
    fetch('/api/gm/manageVehicle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        targetUid: targetProfile.uid,
        action: 'add',
        vehicleData: { carId: selectedNewCarId, level: newCarLevel, durability: newCarDurability }
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.targetData) {
        const carTemplate = VEHICLES_DB.find(v => v.id === selectedNewCarId);
        showModal('success', `✅ 成功向车手 [ ${targetIdentifier} ] 的车库强制下发赛车配置 (名称: ${carTemplate?.name}, 等级: ${newCarLevel})`);
        setTargetGarage(data.targetData.garage || []);
      } else {
        showModal('error', data.message || '下发失败');
      }
    })
    .catch(err => showModal('error', '网络异常'));
  };

  const handleActionB_Delete = (idx: number) => {
    if (!validateTarget()) return;
    const token = localStorage.getItem('neon_token');
    const carId = targetGarage[idx].carId || targetGarage[idx].defaultVehicleId;
    fetch('/api/gm/manageVehicle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        targetUid: targetProfile.uid,
        action: 'delete',
        vehicleData: { carId }
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.targetData) {
        setTargetGarage(data.targetData.garage || []);
        showModal('success', `✅ 成功销毁目标的指定车辆。`);
      } else {
        showModal('error', data.message || '销毁失败');
      }
    })
    .catch(err => showModal('error', '网络异常'));
  };

  const handleActionB_Update = (idx: number, field: string, val: any) => {
    setTargetGarage(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleActionB_SaveUpdate = () => {
     if (!validateTarget()) return;
     const token = localStorage.getItem('neon_token');
     fetch('/api/gm/manageVehicle', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
       body: JSON.stringify({
         targetUid: targetProfile.uid,
         action: 'update',
         vehicleData: targetGarage // Backend handles the array of changes
       })
     })
     .then(res => res.json())
     .then(data => {
       if (data.success && data.targetData) {
         setTargetGarage(data.targetData.garage || []);
         showModal('success', `✅ 成功同步目标车库属性变更！`);
       } else {
         showModal('error', data.message || '保存失败');
       }
     })
     .catch(err => showModal('error', '网络异常'));
  };

  // ACTION C: Inventory
  const handleActionC = () => {
    if (!validateTarget()) return;
    const items: [string, number][] = Object.entries(inventoryDeltas).filter(([_, val]) => typeof val === 'number' && val !== 0) as [string, number][];
    if (items.length === 0) {
      showModal('error', '未检测到任何物资流水变化！');
      return;
    }
    
    const token = localStorage.getItem('neon_token');
    fetch('/api/gm/modifyInventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        targetUid: targetProfile.uid,
        deltas: inventoryDeltas
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.targetData) {
        let logs: string[] = [];
        items.forEach(([id, delta]) => {
          let displayName = id;
          if (id === 'core_primary') displayName = '强化核心(初级)';
          else if (id === 'core_advanced') displayName = '强化核心(高级)';
          else if (id === 'core_legendary') displayName = '强化核心(传说)';
          else if (id === 'card_silver') displayName = '白银保卡';
          else if (id === 'card_gold') displayName = '黄金保卡';
          else if (id === 'rename_card') displayName = '改名卡';
          else if (ITEMS_DB.find(i => i.id === id)) displayName = ITEMS_DB.find(i => i.id === id)!.name;
          else if (LIVERIES_DB.find(l => l.id === id)) displayName = LIVERIES_DB.find(l => l.id === id)!.name;
          logs.push(`${displayName}: ${delta > 0 ? '+' : ''}${delta}`);
        });
        showModal('success', `✅ 成功提交物资流水并校验入库:\n${logs.join('\n')}`);
        setTargetInventory(data.targetData.inventory || targetInventory);
        setInventoryDeltas({});
      } else {
        showModal('error', data.message || '提交物资修改失败');
      }
    })
    .catch(err => showModal('error', '网络异常'));
  };

  // ACTION D: Security
  const [newKey, setNewKey] = useState('');
  const [clearTrackId, setClearTrackId] = useState<string>(TRACKS[0]?.id || '');
  const [clearLaps, setClearLaps] = useState<number>(3);

  const handleActionD_Key = () => {
    if (!validateTarget()) return;
    if (!newKey.trim()) {
      showModal('error', '请提供新的访问密钥');
      return;
    }
    const token = localStorage.getItem('neon_token');
    fetch('/api/gm/resetPassword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        targetUid: targetProfile.uid,
        newPassword: newKey
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showModal('success', `强制重置车手 [ ${targetIdentifier} ] 的登录密钥成功`);
        setNewKey('');
      } else {
        showModal('error', data.message || '重置密码失败');
      }
    })
    .catch(err => showModal('error', '网络异常'));
  };

  const handleActionD_ClearBoard = () => {
    if (!clearTrackId) return;
    const token = localStorage.getItem('neon_token');
    fetch('/api/gm/clearLeaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        trackId: clearTrackId,
        laps: clearLaps
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        if (onClearLeaderboard) {
           onClearLeaderboard(clearTrackId, clearLaps);
        }
        const track = TRACKS.find(t => t.id === clearTrackId);
        showModal('success', `⚠️ 成功清洗赛道 [${track?.name || clearTrackId}] ${clearLaps}圈 的全量榜单记录！`);
      } else {
        showModal('error', data.message || '清榜失败');
      }
    })
    .catch(err => showModal('error', '网络异常'));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10"
    >
      <div className="flex flex-col w-full max-w-6xl h-[90vh] bg-black/95 text-green-500 font-mono text-sm relative border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)] rounded-lg overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-green-500/30 p-4 bg-green-950/20 shrink-0">
          <Terminal className="text-green-400 w-5 h-5" />
          <h2 className="text-green-400 font-bold uppercase tracking-wider text-base">系统管理终端 (GM Console) // 测试模式</h2>
          {onClose && (
            <button onClick={onClose} className="ml-auto text-green-500/50 hover:text-green-400 transition-colors px-4 py-1 border border-green-500/30 rounded">
              [ 关闭控制台 ]
            </button>
          )}
        </div>

        {/* Target Lock Section */}
        <div className="p-4 border-b border-green-500/20 bg-black/50 shrink-0">
          <label className="flex flex-col gap-2 relative max-w-xl">
            <span className="flex items-center gap-2 text-green-400 font-bold tracking-widest text-xs uppercase opacity-80">
              <Hash className="w-3 h-3" />
              目标车手锁定 [当前条件]
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetIdentifier}
                onChange={e => setTargetIdentifier(e.target.value)}
                placeholder="输入玩家 UID 或游戏内昵称进行查询..."
                className="flex-1 bg-black/80 border border-green-500/50 text-green-300 p-2 outline-none focus:border-green-400 focus:shadow-[0_0_8px_rgba(74,222,128,0.4)] transition-all placeholder:text-green-800"
              />
              <button onClick={handleLoadTarget} className="bg-green-600/20 text-green-400 border border-green-500 hover:bg-green-500 hover:text-black px-4 flex items-center gap-2 font-bold transition-colors">
                <Search className="w-4 h-4" /> 查询玩家信息
              </button>
            </div>
          </label>
        </div>

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar Tabs */}
          <div className="w-48 overflow-y-auto border-r border-green-500/20 bg-black/40 flex flex-col p-2 gap-2 shrink-0">
            <button 
              onClick={() => setActiveTab('A')}
              className={`flex items-center gap-2 p-2 px-3 rounded-sm transition-all text-left ${activeTab === 'A' ? 'bg-green-900/40 border-l-2 border-green-400 text-green-300 shadow-[inset_2px_0_10px_rgba(74,222,128,0.1)]' : 'hover:bg-green-900/20 text-green-700'}`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" /> 基础状态篡改
            </button>
            <button 
              onClick={() => setActiveTab('B')}
              className={`flex items-center gap-2 p-2 px-3 rounded-sm transition-all text-left ${activeTab === 'B' ? 'bg-green-900/40 border-l-2 border-green-400 text-green-300 shadow-[inset_2px_0_10px_rgba(74,222,128,0.1)]' : 'hover:bg-green-900/20 text-green-700'}`}
            >
              <Cpu className="w-4 h-4 shrink-0" /> 车辆全权管理
            </button>
            <button 
              onClick={() => setActiveTab('C')}
              className={`flex items-center gap-2 p-2 px-3 rounded-sm transition-all text-left ${activeTab === 'C' ? 'bg-green-900/40 border-l-2 border-green-400 text-green-300 shadow-[inset_2px_0_10px_rgba(74,222,128,0.1)]' : 'hover:bg-green-900/20 text-green-700'}`}
            >
              <Database className="w-4 h-4 shrink-0" /> 物资管理
            </button>
            <button 
              onClick={() => setActiveTab('D')}
              className={`flex items-center gap-2 p-2 px-3 rounded-sm transition-all text-left ${activeTab === 'D' ? 'bg-red-900/20 border-l-2 border-red-500 text-red-400 shadow-[inset_2px_0_10px_rgba(239,68,68,0.1)]' : 'hover:bg-red-900/10 text-red-900/70'}`}
            >
              <Key className="w-4 h-4 shrink-0" /> 清榜与安全
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 bg-black/60 relative overflow-y-auto">
            
            <AnimatePresence mode="wait">
              {/* ACTION A: Profile & Wallet */}
              {activeTab === 'A' && (
                <motion.div key="A" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-6">
                  <div className="border border-green-500/20 p-4 bg-green-950/10">
                    <h3 className="text-md font-bold text-green-400 flex items-center gap-2 mb-4 pb-2 border-b border-green-500/20">
                      <ChevronRight className="w-4 h-4" /> [模块 A] 目标配置大盘快照与覆写
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-green-600 text-xs">UID</label>
                          <input type="text" value={targetProfile.uid} disabled className="bg-black/50 border border-green-900 text-green-700 p-2 cursor-not-allowed" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-green-600 text-xs">车手昵称</label>
                          <input type="text" value={targetProfile.nickname} onChange={e => setTargetProfile({...targetProfile, nickname: e.target.value})} className="bg-black border border-green-500/30 text-green-400 p-2 outline-none focus:border-green-400" />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-green-600 text-xs">账户金币 (⟁) - 绝对值覆写</label>
                          <input type="number" value={targetProfile.coins} onChange={e => setTargetProfile({...targetProfile, coins: Number(e.target.value)})} className="bg-black border border-green-500/30 text-green-400 p-2 outline-none focus:border-green-400" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-green-600 text-xs">账户状态</label>
                          <select value={targetProfile.status} onChange={e => setTargetProfile({...targetProfile, status: e.target.value})} className="bg-black border border-green-500/30 text-green-400 p-2 outline-none">
                            <option value="active">正常 (ACTIVE)</option>
                            <option value="banned">封禁 (BANNED)</option>
                          </select>
                        </div>
                        {targetProfile.status === 'banned' && (
                          <div className="flex flex-col gap-1">
                            <label className="text-green-600 text-xs">封禁原因</label>
                            <input type="text" value={targetProfile.banReason} onChange={e => setTargetProfile({...targetProfile, banReason: e.target.value})} className="bg-black border border-green-500/30 text-green-400 p-2 outline-none" placeholder="e.g. 使用外挂" />
                          </div>
                        )}
                      </div>
                    </div>

                    <button onClick={handleActionA} className="mt-6 px-6 py-2 bg-green-600/20 text-green-300 border border-green-500 hover:bg-green-500 hover:text-black transition-all uppercase tracking-wider font-bold">
                      确认保存修改
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ACTION B: Garage */}
              {activeTab === 'B' && (
                <motion.div key="B" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-6">
                  {/* Create New Car */}
                  <div className="border border-cyan-500/20 p-4 bg-cyan-950/10">
                    <h3 className="text-md font-bold text-cyan-400 flex items-center gap-2 mb-4 pb-2 border-b border-cyan-500/20">
                      <ChevronRight className="w-4 h-4" /> [模块 B] 车辆全权指令 - 下发新车
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2 relative">
                        <label className="text-cyan-600 text-xs">从字典选择车型:</label>
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                           {VEHICLES_DB.map(v => (
                              <div 
                                key={v.id} 
                                onClick={() => setSelectedNewCarId(v.id)}
                                className={`border p-2 cursor-pointer transition-all ${selectedNewCarId === v.id ? 'border-cyan-400 bg-cyan-900/40 text-cyan-200' : 'border-cyan-900/50 hover:border-cyan-600 hover:bg-cyan-900/20 text-cyan-600'}`}
                              >
                                <div className="font-bold text-xs">{v.name}</div>
                                <div className="text-[10px] opacity-70 flex justify-between mt-1">
                                  <span>{v.tier}</span><span>spd:{v.baseSpeed}</span>
                                </div>
                              </div>
                           ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex flex-col gap-1 w-32">
                          <label className="text-cyan-600 text-xs">初始等级</label>
                          <input type="number" min="1" max="10" value={newCarLevel} onChange={e => setNewCarLevel(Number(e.target.value))} className="bg-black border border-cyan-500/30 text-cyan-400 p-2 outline-none" />
                        </div>
                        <div className="flex flex-col gap-1 w-32">
                          <label className="text-cyan-600 text-xs">耐久度</label>
                          <input type="number" min="0" max={SYS_CONFIG.MAX_DURABILITY} value={newCarDurability} onChange={e => setNewCarDurability(Number(e.target.value))} className="bg-black border border-cyan-500/30 text-cyan-400 p-2 outline-none" />
                        </div>
                        <div className="flex items-end">
                           <button onClick={handleActionB_Add} className="px-6 py-2 bg-cyan-600/20 text-cyan-300 border border-cyan-500 hover:bg-cyan-500 hover:text-black transition-all uppercase tracking-wider font-bold whitespace-nowrap">
                           强制下发至车库
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manage Garage */}
                  <div className="border border-cyan-500/20 p-4 bg-cyan-950/10">
                     <div className="flex justify-between items-center mb-4 pb-2 border-b border-cyan-500/20">
                        <h3 className="text-md font-bold text-cyan-400 flex items-center gap-2">
                           <Database className="w-4 h-4" /> 目标当前实况车库全息扫描
                           <span className="text-xs font-normal text-cyan-600">({targetGarage.length} 辆记录)</span>
                        </h3>
                        <button onClick={handleActionB_SaveUpdate} className="text-xs bg-cyan-900/50 border border-cyan-700 px-3 py-1 hover:bg-cyan-600 hover:text-black transition-colors"><Edit className="w-3 h-3 inline mr-1"/>保存修改</button>
                     </div>
                     <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {targetGarage.length === 0 && <div className="text-cyan-800 text-center py-4"> - 车库为空 - </div>}
                        {targetGarage.map((car, idx) => {
                           const vData = VEHICLES_DB.find(v => v.id === car.defaultVehicleId || v.id === car.carId) || { name: '未知车辆', tier: '??' };
                           const isPerm = car.isPermanent !== false; 
                           const pEngine = car.equippedParts?.engine ? ITEMS_DB.find(i=>i.id===car.equippedParts.engine)?.name : '未装备';
                           const pTires = car.equippedParts?.tires ? ITEMS_DB.find(i=>i.id===car.equippedParts.tires)?.name : '未装备';
                           const pStart = car.equippedParts?.launch ? ITEMS_DB.find(i=>i.id===car.equippedParts.launch)?.name : '未装备';
                           const pDrift = car.equippedParts?.drift ? ITEMS_DB.find(i=>i.id===car.equippedParts.drift)?.name : '未装备';
                           const pAccl = car.equippedParts?.acceleration ? ITEMS_DB.find(i=>i.id===car.equippedParts.acceleration)?.name : '未装备';
                           const pPaint = car.equippedPaint ? LIVERIES_DB.find(l=>l.id===car.equippedPaint)?.name : '经典出厂原色';
                           
                           return (
                              <div key={idx} className="flex flex-col bg-black/50 border border-cyan-900/40 p-3 text-xs text-cyan-200">
                                 <div className="flex items-center justify-between mb-2 pb-2 border-b border-cyan-900/40">
                                    <div className="flex items-center gap-3 w-1/3">
                                       <span className="font-bold text-cyan-400 text-sm">{vData.name}</span>
                                       <span className="text-[10px] text-cyan-700 bg-cyan-900/20 px-1">{vData.tier} CLASS</span>
                                       <span className="text-[10px] text-cyan-500/70 py-1">
                                          <select 
                                            value={isPerm ? 'true' : 'false'} 
                                            onChange={e => handleActionB_Update(idx, 'isPermanent', e.target.value === 'true')}
                                            className="bg-black border border-cyan-800/50 text-cyan-300 outline-none mr-2"
                                          >
                                            <option value="true">永久拥有</option>
                                            <option value="false">限时租赁</option>
                                          </select>
                                          {!isPerm && (
                                            <label className="flex items-center gap-1 inline-flex text-cyan-400">
                                              剩余天数:
                                              <input 
                                                type="number" 
                                                min="1" 
                                                value={Math.max(1, Math.ceil(((car.expireAt || Date.now()) - Date.now()) / (24*60*60*1000)))}
                                                onChange={e => {
                                                  const d = Math.max(1, parseInt(e.target.value) || 1);
                                                  handleActionB_Update(idx, 'expireAt', Date.now() + d * 24 * 60 * 60 * 1000);
                                                }}
                                                className="w-12 bg-black border border-cyan-800/50 outline-none text-center"
                                              />
                                            </label>
                                          )}
                                       </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                       <label className="flex items-center gap-1 text-cyan-500">等级:
                                          <input type="number" value={car.level||1} onChange={e=>handleActionB_Update(idx, 'level', Number(e.target.value))} className="w-12 bg-black border border-cyan-700/50 p-1 text-center font-bold text-cyan-300" />
                                       </label>
                                       <label className="flex items-center gap-1 text-cyan-500">耐久度:
                                          <input type="range" min="0" max={SYS_CONFIG.MAX_DURABILITY} value={car.durability ?? SYS_CONFIG.MAX_DURABILITY} onChange={e=>handleActionB_Update(idx, 'durability', Number(e.target.value))} className="w-24 accent-cyan-500" />
                                          <span className="w-8 text-right font-bold text-cyan-300">{car.durability ?? SYS_CONFIG.MAX_DURABILITY}</span>
                                       </label>
                                       <label className="flex items-center gap-1 text-cyan-500 ml-2">喷漆:
                                          <select
                                             value={car.equippedPaint || ''}
                                             onChange={e => handleActionB_Update(idx, 'equippedPaint', e.target.value || null)}
                                             className="bg-black border border-cyan-700/50 text-cyan-300 p-1 outline-none w-28 text-xs"
                                          >
                                             <option value="">(原色)</option>
                                             {LIVERIES_DB.map(l => (
                                               <option key={l.id} value={l.id}>{l.name}</option>
                                             ))}
                                          </select>
                                       </label>
                                    </div>
                                    <button onClick={()=>handleActionB_Delete(idx)} className="text-red-500 hover:text-red-400 bg-red-950/30 px-2 py-1 flex items-center gap-1 rounded border border-red-900/50"><Trash2 className="w-3 h-3"/> 强制销毁</button>
                                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-[10px] text-cyan-600 mt-1">
                                    <div className="flex flex-col"><span className="opacity-50">引擎</span><span className="text-cyan-400 truncate">{pEngine}</span></div>
                                    <div className="flex flex-col"><span className="opacity-50">轮胎</span><span className="text-cyan-400 truncate">{pTires}</span></div>
                                    <div className="flex flex-col"><span className="opacity-50">起步</span><span className="text-cyan-400 truncate">{pStart}</span></div>
                                    <div className="flex flex-col"><span className="opacity-50">漂移</span><span className="text-cyan-400 truncate">{pDrift}</span></div>
                                    <div className="flex flex-col"><span className="opacity-50">加速</span><span className="text-cyan-400 truncate">{pAccl}</span></div>
                                    <div className="flex flex-col"><span className="opacity-50">当前涂装</span><span className="text-cyan-300 truncate">{pPaint}</span></div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
                </motion.div>
              )}

              {/* ACTION C: Inventory Items */}
              {activeTab === 'C' && (
                <motion.div key="C" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-6 pb-20">
                  <div className="border border-yellow-500/20 p-4 bg-yellow-950/10">
                    <h3 className="text-md font-bold text-yellow-400 flex items-center gap-2 mb-4 pb-2 border-b border-yellow-500/20">
                      <ChevronRight className="w-4 h-4" /> [模块 C] 玩家全量物资分类管理
                    </h3>
                    <p className="text-xs text-yellow-600 mb-4">支持精准管理车手背包中的各类强化耗材、外观喷漆与性能配件。</p>

                    <div className="space-y-6">
                       {/* Category 1 */}
                       <div>
                          <h4 className="text-sm font-bold text-yellow-500 mb-2 border-b border-yellow-900/40 pb-1">强化耗材区</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {[
                                { id: 'core_primary', name: '强化核心(初级)', stock: targetInventory.materials?.core_primary || 0 },
                                { id: 'core_advanced', name: '强化核心(高级)', stock: targetInventory.materials?.core_advanced || 0 },
                                { id: 'core_legendary', name: '强化核心(传说)', stock: targetInventory.materials?.core_legendary || 0 },
                             ].map(item => renderItemCard(item.id, item.name, item.stock))}
                          </div>
                       </div>

                       {/* Category 2 */}
                       <div>
                          <h4 className="text-sm font-bold text-yellow-500 mb-2 border-b border-yellow-900/40 pb-1">特权与保护卡区</h4>
                           <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {[
                                { id: 'card_silver', name: '白银保卡', stock: targetInventory.protectors?.card_silver || 0 },
                                { id: 'card_gold', name: '黄金保卡', stock: targetInventory.protectors?.card_gold || 0 },
                                { id: 'rename_card', name: '改名卡', stock: targetInventory.specialItems?.rename_card || 0 },
                             ].map(item => renderItemCard(item.id, item.name, item.stock))}
                          </div>
                        </div>

                       {/* Category 3: Parts broken down */}
                       <div>
                          <h4 className="text-sm font-bold text-yellow-500 mb-2 border-b border-yellow-900/40 pb-1">引擎槽位 (Engine)</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {ITEMS_DB.filter(i => i.type === 'engine').map(item => renderItemCard(item.id, item.name, targetInventory.parts?.[item.id] || 0))}
                          </div>
                       </div>
                       
                       <div>
                          <h4 className="text-sm font-bold text-yellow-500 mb-2 border-b border-yellow-900/40 pb-1">轮胎槽位 (Tires)</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {ITEMS_DB.filter(i => i.type === 'tires').map(item => renderItemCard(item.id, item.name, targetInventory.parts?.[item.id] || 0))}
                          </div>
                       </div>
                       
                       <div>
                          <h4 className="text-sm font-bold text-yellow-500 mb-2 border-b border-yellow-900/40 pb-1">起步模块 (Launch)</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {ITEMS_DB.filter(i => i.type === 'launch').map(item => renderItemCard(item.id, item.name, targetInventory.parts?.[item.id] || 0))}
                          </div>
                       </div>
                       
                       <div>
                          <h4 className="text-sm font-bold text-yellow-500 mb-2 border-b border-yellow-900/40 pb-1">漂移模块 (Drift)</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {ITEMS_DB.filter(i => i.type === 'drift').map(item => renderItemCard(item.id, item.name, targetInventory.parts?.[item.id] || 0))}
                          </div>
                       </div>
                       
                       <div>
                          <h4 className="text-sm font-bold text-yellow-500 mb-2 border-b border-yellow-900/40 pb-1">加速模块 (Acceleration)</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {ITEMS_DB.filter(i => i.type === 'acceleration').map(item => renderItemCard(item.id, item.name, targetInventory.parts?.[item.id] || 0))}
                          </div>
                       </div>

                       {/* Category 4 */}
                       <div>
                          <h4 className="text-sm font-bold text-yellow-500 mb-2 border-b border-yellow-900/40 pb-1">喷漆涂装区</h4>
                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {LIVERIES_DB.map(item => renderItemCard(item.id, item.name, targetInventory.paints?.includes(item.id) ? 1 : 0, undefined, true))}
                          </div>
                        </div>

                    </div>
                  </div>
                  
                  {/* Sticky Footer */}
                  <div className="sticky bottom-0 bg-black/95 py-3 border-t border-yellow-500/30 z-10 text-center mt-4 shadow-[0_-10px_20px_rgba(0,0,0,0.8)]">
                    <button onClick={handleActionC} className="px-8 py-3 bg-yellow-600/20 text-yellow-300 border border-yellow-500 hover:bg-yellow-500 hover:text-black transition-all uppercase tracking-wider font-bold">
                       确认提交物资操作变化
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ACTION D: Security / Wipe */}
              {activeTab === 'D' && (
                <motion.div key="D" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-6">
                  
                  {/* Reset Key */}
                  <div className="border border-red-500/30 p-4 bg-red-950/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0 opacity-50"></div>
                    <h3 className="text-md font-bold text-red-500 flex items-center gap-2 mb-4 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)] pb-2 border-b border-red-500/20">
                      <ShieldAlert className="w-5 h-5 animate-pulse" /> [模块 D-1] 账户凭证强制覆写
                    </h3>
                    <div className="flex flex-col gap-1 max-w-md">
                      <label className="text-red-400/80 text-xs">New Secret Key:</label>
                      <input type="password" value={newKey} onChange={e => setNewKey(e.target.value)} className="bg-black border border-red-500/50 text-red-400 p-2 outline-none focus:border-red-400 focus:shadow-[0_0_10px_rgba(239,68,68,0.3)]" placeholder="*****" />
                      <span className="text-xs text-red-500/60 mt-1">警告: 这将立即令该目标已有的所有连接凭证失效。</span>
                  <button onClick={handleActionD_Key} className="mt-4 px-4 py-2 bg-red-950 border border-red-600 text-red-500 hover:bg-red-600 hover:text-black transition-all uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] w-fit">
                         确认重新下发凭证
                      </button>
                    </div>
                  </div>

                  {/* Wipe Leaderboard */}
                  <div className="border border-purple-500/30 p-4 bg-purple-950/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/0 via-purple-500 to-purple-500/0 opacity-50"></div>
                    <h3 className="text-md font-bold text-purple-400 flex items-center gap-2 mb-4 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)] pb-2 border-b border-purple-500/20">
                      <Trash2 className="w-5 h-5" /> [模块 D-2] 定点清榜协议
                    </h3>
                    <div className="flex flex-col gap-4 max-w-md">
                      <div className="flex gap-4">
                         <div className="flex flex-col gap-1 flex-1">
                            <label className="text-purple-400/80 text-xs">选择赛道字典:</label>
                            <select value={clearTrackId} onChange={e => setClearTrackId(e.target.value)} className="bg-black border border-purple-500/50 text-purple-300 p-2 outline-none focus:border-purple-400">
                               {TRACKS.map(t => <option key={t.id} value={t.id}>{t.name} ({t.id})</option>)}
                            </select>
                         </div>
                         <div className="flex flex-col gap-1 w-24">
                            <label className="text-purple-400/80 text-xs">圈数规格:</label>
                            <select value={clearLaps} onChange={e => setClearLaps(Number(e.target.value))} className="bg-black border border-purple-500/50 text-purple-300 p-2 outline-none focus:border-purple-400">
                               <option value={1}>1 Lap</option>
                               <option value={2}>2 Laps</option>
                               <option value={3}>3 Laps</option>
                               <option value={5}>5 Laps</option>
                            </select>
                         </div>
                      </div>
                      
                      <span className="text-xs text-purple-500/60 mt-1">警告: 执行将销毁该赛道指定圈数下的所有车手排位记录。不可逆转。</span>
                      <button onClick={handleActionD_ClearBoard} className="mt-2 px-4 py-2 bg-purple-950 border border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-black transition-all uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] w-fit flex items-center gap-2">
                         <Trash2 className="w-4 h-4"/> 确认清空榜单
                      </button>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Global Fixed Position Modal */}
        <AnimatePresence>
          {modalInfo.visible && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className={`max-w-md w-full bg-black border p-6 rounded-sm shadow-2xl relative overflow-hidden pointer-events-auto ${
                  modalInfo.type === 'error' 
                    ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' 
                    : 'border-green-500 shadow-[0_0_30px_rgba(74,222,128,0.2)]'
                }`}
              >
                {/* Decor lines */}
                <div className={`absolute top-0 left-0 w-full h-1 ${modalInfo.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '100% 4px' }}></div>
                
                <div className="flex items-start gap-4 relative z-10">
                  {modalInfo.type === 'error' ? (
                    <ShieldAlert className="w-8 h-8 text-red-500 flex-shrink-0 mt-1 animate-pulse" />
                  ) : (
                    <Terminal className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                  )}
                  
                  <div className="flex-1">
                    <h3 className={`font-bold font-mono uppercase mb-2 ${modalInfo.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                      {modalInfo.type === 'error' ? '>> 操作拦截 (ERROR) <<' : '>> 操作成功 (SUCCESS) <<'}
                    </h3>
                    <p className={`font-mono text-sm leading-relaxed whitespace-pre-wrap ${modalInfo.type === 'error' ? 'text-red-300' : 'text-green-300'}`}>
                      {modalInfo.message}
                    </p>
                  </div>
                </div>
                <div className="mt-6 border-t border-current pt-4 border-opacity-20 text-right">
                   <button 
                      onClick={() => setModalInfo(prev => ({...prev, visible: false}))} 
                      className={`px-6 py-2 font-bold uppercase transition-all ${
                         modalInfo.type === 'error' ? 'bg-red-950 text-red-400 border border-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-950 text-green-400 border border-green-500 hover:bg-green-500 hover:text-black'
                      }`}
                   >
                      确定 (Confirm)
                   </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.5); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34,197,94,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34,197,94,0.6); }
      `}</style>
    </motion.div>
  );
}

