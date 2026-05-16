import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerData } from '../types';
import { VEHICLES_DB, LIVERIES_DB } from '../constants';
import { User, Lock, Save, X } from 'lucide-react';

interface PlayerInfoUIProps {
  playerData: PlayerData;
  setPlayerData: React.Dispatch<React.SetStateAction<PlayerData>>;
  onClose: () => void;
}

/**
 * 个人资料中心前端 UI 组件
 * 提供修改昵称（消耗改名卡）、修改密码及预览当前战车等功能
 */
export default function PlayerInfoUI({ playerData, setPlayerData, onClose }: PlayerInfoUIProps) {
  const [nickname, setNickname] = useState(playerData.profile.nickname);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{type: 'error'|'success', text: string} | null>(null);

  const activeCarState = playerData.garage.find(c => c.carId === playerData.profile.activeCarId);
  const baseVehicle = VEHICLES_DB.find(v => v.id === playerData.profile.activeCarId) || VEHICLES_DB[0];
  const paintId = activeCarState?.equippedPaint;
  const currentPaint = paintId ? LIVERIES_DB.find(l => l.id === paintId)?.name || '基础涂装' : '基础涂装';

  const renameCardsCount = playerData.inventory?.specialItems?.rename_card || 0;

  const handleSaveNickname = () => {
    setMessage(null);
    if (!nickname.trim()) return;
    if (nickname.trim() === playerData.profile.nickname) return;
    
    if (renameCardsCount <= 0) {
      setMessage({ type: 'error', text: '缺少改名卡，请前往商店特殊分类购买' });
      return;
    }

    const token = localStorage.getItem('neon_token');
    fetch('/api/player/nickname', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newNickname: nickname.trim() })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setPlayerData(p => ({
          ...p,
          profile: {
            ...p.profile,
            nickname: nickname.trim()
          },
          inventory: {
            ...p.inventory,
            specialItems: {
              ...p.inventory.specialItems,
              rename_card: (p.inventory.specialItems?.rename_card || 0) - 1
            }
          }
        }));
        setMessage({ type: 'success', text: '昵称修改成功！' });
      } else {
        setMessage({ type: 'error', text: data.error || data.message || '修改失败' });
      }
    })
    .catch(err => {
      setMessage({ type: 'error', text: '网络请求失败' });
    });
  };

  const handleSavePassword = () => {
    setMessage(null);

    if (!oldPassword) {
      setMessage({ type: 'error', text: '请输入旧密码' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码长度至少需要 6 个字符' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '新密码不一致' });
      return;
    }
    
    const token = localStorage.getItem('neon_token');
    fetch('/api/player/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ oldPassword, newPassword })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setMessage({ type: 'success', text: '密码修改成功' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: data.error || data.message || '修改失败' });
      }
    })
    .catch(err => {
      setMessage({ type: 'error', text: '网络请求失败' });
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="neon-panel bg-[#0a0a0a] max-w-[500px] w-full p-6 md:p-8 rounded-xl border border-white/20 shadow-2xl relative overflow-y-auto max-h-[90vh]"
      >
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h2 className="text-xl md:text-2xl font-black text-accent-cyan uppercase tracking-wider flex items-center gap-2">
            <User className="text-[#00f2ff]" /> 我的信息与属性
          </h2>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white px-3 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>


        
        <div className="space-y-8">
          {/* 基础资产 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-accent-magenta uppercase tracking-widest border-l-2 border-accent-magenta pl-2">基础资产与身份</h3>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">账号ID (UID)</span>
                <span className="text-white font-mono text-sm select-all">{playerData.profile.uid}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">总资产</span>
                <span className="text-accent-yellow font-black text-xl">{playerData.wallet.coins} ⟁</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">赛车总数</span>
                <span className="text-white font-mono">{playerData.garage.length} 辆</span>
              </div>
            </div>
          </div>

          {/* 当前赛车配置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-accent-cyan uppercase tracking-widest border-l-2 border-accent-cyan pl-2">当前赛车配置</h3>
            <div className="bg-black/40 p-4 rounded-lg border border-white/5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">已装备赛车：</span>
                <span className="text-white font-bold">{baseVehicle.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">强化等级：</span>
                <span className="text-accent-yellow font-mono">Lv.{activeCarState?.level || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">当前喷漆：</span>
                <span className="text-accent-magenta">{currentPaint}</span>
              </div>
            </div>
          </div>

          {/* 账号设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-accent-yellow uppercase tracking-widest border-l-2 border-accent-yellow pl-2">账号设置</h3>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-6">
              
              {/* 昵称修改 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-zinc-500 font-bold uppercase">修改车手代号</label>
                  <span className="text-xs font-mono text-zinc-400">
                    改名卡: <span className={renameCardsCount > 0 ? "text-accent-yellow font-bold" : "text-red-500"}>{renameCardsCount}</span> 张
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded pt-2 pb-2 px-3 text-white focus:border-[#00f2ff] outline-none font-mono text-sm"
                  />
                  <button
                    onClick={handleSaveNickname}
                    disabled={nickname.trim() === playerData.profile.nickname}
                    className="bg-[#00f2ff]/20 text-[#00f2ff] px-4 rounded font-bold hover:bg-[#00f2ff] hover:text-black transition-colors flex items-center justify-center border border-[#00f2ff]/50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Save size={16} />
                  </button>
                </div>
              </div>

              <div className="h-[1px] bg-white/10 w-full" />

              {/* 密码修改 */}
              <div className="space-y-3">
                <label className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1"><Lock size={14} /> 修改访问密钥</label>
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="旧密码"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-white placeholder-zinc-600 focus:border-[#ff0055] outline-none font-mono text-sm"
                  />
                  <input
                    type="password"
                    placeholder="新密码"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-white placeholder-zinc-600 focus:border-[#ff0055] outline-none font-mono text-sm"
                  />
                  <input
                    type="password"
                    placeholder="确认新密码"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-white placeholder-zinc-600 focus:border-[#ff0055] outline-none font-mono text-sm"
                  />

                  <button
                    onClick={handleSavePassword}
                    className="w-full mt-2 bg-[#ff0055]/20 text-[#ff0055] py-2 rounded font-bold hover:bg-[#ff0055] hover:text-white transition-colors border border-[#ff0055]/50 flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> 保存新密码
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`neon-panel w-full max-w-sm p-6 flex flex-col gap-4 rounded-xl border bg-[#0a0a0a] ${
                message.type === 'error' 
                  ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                  : 'border-accent-cyan shadow-[0_0_20px_rgba(0,242,255,0.3)]'
              }`}
            >
              <h3 className={`text-xl font-black ${message.type === 'error' ? 'text-red-500' : 'text-accent-cyan'}`}>
                {message.type === 'error' ? '❌ 操作失败' : '✅ 操作成功'}
              </h3>
              <p className="text-white text-sm font-bold">
                {message.text}
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setMessage(null)}
                  className={`px-6 py-2 font-bold rounded flex items-center justify-center transition-all ${
                    message.type === 'error'
                      ? 'bg-red-500 text-white hover:bg-red-400'
                      : 'bg-accent-cyan text-black hover:bg-accent-cyan/80'
                  }`}
                >
                  确定
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
