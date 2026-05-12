import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { socketService } from '../services/socketService';
import { VEHICLES_DB, LIVERIES_DB, ITEMS_DB, TRACKS, BASIC_COLORS } from '../constants';
import VehiclePreview from './VehiclePreview';

export const OnlineMenu = ({ initialName, onBack, onStartLobby }: { initialName?: string, onBack: () => void, onStartLobby: () => void }) => {
  const [playerName, setPlayerName] = useState(initialName || '车手_' + Math.floor(Math.random() * 1000));
  const [roomIdInput, setRoomIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const [adminDestroyRoomId, setAdminDestroyRoomId] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminModalError, setAdminModalError] = useState('');

  const [targetJoinRoomId, setTargetJoinRoomId] = useState<string | null>(null);
  const [joinInputId, setJoinInputId] = useState('');
  const [joinModalError, setJoinModalError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  const fetchRooms = () => {
    socketService.getRooms((res) => {
      if (res.success) {
        setRooms(res.rooms);
      }
    });
  };

  useEffect(() => {
    socketService.connect();
    
    // Check initial connection state
    if (socketService.socket?.connected) {
      setIsConnected(true);
    }
    
    // Setup listeners for connection changes
    socketService.socket?.on('connect', () => setIsConnected(true));
    socketService.socket?.on('disconnect', () => setIsConnected(false));
    socketService.socket?.on('connect_error', () => setIsConnected(false));

    fetchRooms();
    const iv = setInterval(fetchRooms, 3000);
    return () => {
      clearInterval(iv);
      socketService.socket?.off('connect');
      socketService.socket?.off('disconnect');
      socketService.socket?.off('connect_error');
    };
  }, []);

  const handleCreate = () => {
    if (!playerName.trim()) return setError('请输入昵称');
    socketService.createRoom(playerName.trim(), { enabled: passwordEnabled, password: passwordInput.trim() }, (res) => {
      if (res.success) {
        onStartLobby();
      } else {
        setError(res.error || '创建失败');
      }
    });
  };

  const handleJoin = (directRoomId?: string, attemptPassword?: string) => {
    const idToJoin = (directRoomId || roomIdInput).trim();
    const finalPassword = attemptPassword?.trim();
    if (!playerName.trim()) {
      if (targetJoinRoomId) setJoinModalError('请输入昵称');
      else setError('请输入昵称');
      return;
    }
    if (!idToJoin) {
      if (targetJoinRoomId) setJoinModalError(needsPassword ? '请输入房间密码' : '无效的房间');
      else setError('请输入房间密码');
      return;
    }
    socketService.joinRoom(idToJoin, playerName.trim(), finalPassword, (res) => {
      if (res.success) {
        setTargetJoinRoomId(null);
        setJoinInputId('');
        onStartLobby();
      } else {
        if (res.needsPassword) {
          setNeedsPassword(true);
          setTargetJoinRoomId(idToJoin);
          setJoinModalError(res.error || '该房间设有密码');
        } else {
          if (targetJoinRoomId) {
             setJoinModalError('加入失败: ' + (res.error || '房间不存在或密码错误'));
          } else {
             setError(res.error || '加入失败');
          }
        }
      }
    });
  };

  const executeJoinWithInput = () => {
    if (!targetJoinRoomId) {
       setJoinModalError('参数错误');
       return;
    }
    if (needsPassword && !joinInputId) {
       setJoinModalError('请输入房间密码');
       return;
    }
    handleJoin(targetJoinRoomId, joinInputId);
  };

  const executeAdminDestroy = () => {
    if (!adminDestroyRoomId) return;
    if (!adminPassword) {
      setAdminModalError('请输入密码');
      return;
    }
    socketService.adminDestroyRoom(adminDestroyRoomId, adminPassword, (res) => {
      if (res.success) {
        setAdminDestroyRoomId(null);
        setAdminPassword('');
        setAdminModalError('');
        setError('房间已成功销毁');
        fetchRooms();
      } else {
        setAdminModalError('销毁失败: ' + res.error);
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto min-h-0 relative">
      <div className="neon-panel p-8 max-w-4xl w-full bg-black/60 backdrop-blur flex flex-col md:flex-row gap-8">
        {/* Left Side: Create/Join manually */}
        <div className="flex-1">
          <h2 className="text-3xl font-black text-accent-cyan uppercase mb-6 tracking-widest text-left">在线对战</h2>
          
          {!isConnected && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm leading-relaxed">
              <strong>⚠ 无法连接到对战服务器</strong><br/>
              如果您的网站部署在 Netlify 等纯静态托管平台上，在线游戏功能将无法运行（它们不支持长期的 WebSocket 和 Node.js 环境）。<br/>
              请考虑部署到 <strong>Render, Railway, Heroku,</strong> 等支持 Node.js 的平台。
            </div>
          )}

          {error && <div className="text-red-500 mb-4 bg-red-500/10 p-2 rounded">{error}</div>}
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">你的昵称</label>
              <input 
                type="text" 
                value={playerName} 
                onChange={e => setPlayerName(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded p-3 text-white focus:border-accent-cyan outline-none"
              />
            </div>
            <div>
               <button 
                 onClick={handleCreate} 
                 disabled={!isConnected}
                 className={`w-full py-4 text-white font-black rounded transition-opacity ${isConnected ? 'bg-accent-magenta hover:opacity-90' : 'bg-zinc-600 cursor-not-allowed opacity-50'}`}
               >
                 创建新房间
               </button>
               <div className="mt-2 flex items-center gap-3">
                 <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer">
                    <input type="checkbox" checked={passwordEnabled} onChange={e => setPasswordEnabled(e.target.checked)} className="accent-accent-magenta" />
                    设置房间密码
                 </label>
                 {passwordEnabled && (
                   <input 
                     type="text" 
                     value={passwordInput} 
                     onChange={e => setPasswordInput(e.target.value)} 
                     placeholder="输入密码"
                     className="flex-1 bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-white focus:border-accent-magenta outline-none"
                   />
                 )}
               </div>
            </div>
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-zinc-500">外部房间</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">输入房间密码加入</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={roomIdInput} 
                  onChange={e => setRoomIdInput(e.target.value)}
                  placeholder="输入密码在此快速加入"
                  className="flex-1 bg-black/40 border border-white/20 rounded p-3 text-white focus:border-accent-cyan outline-none"
                />
                <button 
                  onClick={() => handleJoin()} 
                  disabled={!isConnected}
                  className={`px-6 font-black rounded transition-all ${isConnected ? 'bg-accent-cyan text-black hover:shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'bg-zinc-600 cursor-not-allowed opacity-50'}`}
                >
                  快速加入
                </button>
              </div>
            </div>
          </div>

          <button onClick={onBack} className="w-full py-3 bg-white/10 text-white rounded hover:bg-white/20 transition-all">
            返回主菜单
          </button>
        </div>

        {/* Right Side: Room List */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-accent-yellow">房间列表</h3>
            <button onClick={fetchRooms} className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-white/5 rounded">刷新</button>
          </div>
          <div className="flex-1 bg-black/40 rounded border border-white/10 p-2 overflow-y-auto max-h-[350px]">
            {rooms.length === 0 ? (
              <div className="text-center text-zinc-500 mt-10">暂无活跃房间</div>
            ) : (
              <div className="space-y-2">
                {rooms.map(r => (
                  <div key={r.roomId} className="flex flex-col bg-white/5 p-3 rounded border border-white/5 hover:border-accent-cyan/50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 pr-2">
                        <div className="text-accent-cyan font-bold truncate flex items-center gap-1">
                          {r.hasPassword && <span title="需要密码">🔒</span>}
                          {r.roomName || `${r.hostName} 的房间`}
                        </div>
                        <div className="text-xs text-zinc-500 truncate">人数: {r.playersCount}/6 | 状态: {r.status === 'LOBBY' ? '大厅中' : '比赛中'}</div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button 
                          onClick={() => { 
                            if (!r.hasPassword) {
                              handleJoin(r.roomId);
                            } else {
                              setTargetJoinRoomId(r.roomId); 
                              setJoinInputId(''); 
                              setError(''); 
                              setJoinModalError('');
                              setNeedsPassword(r.hasPassword);
                            }
                          }} 
                          className="px-3 py-1 bg-accent-cyan/20 text-accent-cyan text-xs rounded hover:bg-accent-cyan/40 font-bold transition-all"
                          disabled={r.status !== 'LOBBY'}
                        >
                          {r.status === 'LOBBY' ? '确认加入' : '比赛中'}
                        </button>
                        <button
                          onClick={() => setAdminDestroyRoomId(r.roomId)}
                          className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] rounded hover:bg-red-500/30 font-bold transition-colors border border-red-500/20"
                        >
                          强制销毁
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {targetJoinRoomId && (
        <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-accent-cyan/50 p-6 rounded-lg max-w-sm w-full shadow-[0_0_30px_rgba(0,242,255,0.3)]">
            <h3 className="text-xl font-bold text-accent-cyan mb-4">{needsPassword ? '房间已加密' : '确认加入'}</h3>
            <p className="text-white/70 text-sm mb-4">{needsPassword ? '该房间设有访问限制，请输入房间密码：' : '确定要加入该房间吗？'}</p>
            {needsPassword && (
              <input 
                type="text" 
                value={joinInputId}
                onChange={(e) => { setJoinInputId(e.target.value); setJoinModalError(''); }}
                className="w-full bg-black/50 border border-white/20 rounded p-2 text-white mb-2 outline-none focus:border-accent-cyan"
                placeholder="请输入密码"
                autoFocus
              />
            )}
            {joinModalError && <div className="text-red-500 text-sm mb-4">{joinModalError}</div>}
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setTargetJoinRoomId(null);
                  setJoinInputId('');
                  setJoinModalError('');
                  setError('');
                }} 
                className="flex-1 py-2 bg-white/10 text-white rounded hover:bg-white/20"
              >
                取消
              </button>
              <button 
                onClick={executeJoinWithInput}
                className="flex-1 py-2 bg-accent-cyan text-black font-bold rounded hover:bg-accent-cyan/80"
              >
                {needsPassword ? '确认' : '加入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {adminDestroyRoomId && (
        <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/50 p-6 rounded-lg max-w-sm w-full shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <h3 className="text-xl font-bold text-red-500 mb-4">销毁房间</h3>
            <p className="text-white/70 text-sm mb-4">您正在强制销毁该房间，请输入管理员密码继续：</p>
            <input 
              type="password" 
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); setAdminModalError(''); }}
              className="w-full bg-black/50 border border-white/20 rounded p-2 text-white mb-2 outline-none focus:border-red-500"
              placeholder="请输入密码..."
            />
            {adminModalError && <div className="text-red-500 text-sm mb-4">{adminModalError}</div>}
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setAdminDestroyRoomId(null);
                  setAdminPassword('');
                  setAdminModalError('');
                }} 
                className="flex-1 py-2 bg-white/10 text-white rounded hover:bg-white/20"
              >
                取消
              </button>
              <button 
                onClick={executeAdminDestroy}
                className="flex-1 py-2 bg-red-500 text-white font-bold rounded hover:bg-red-600"
              >
                确认销毁
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { TrackSelector } from './TrackSelector';

export const OnlineLobby = ({ activeCarId, coins, garage, onBack, onStartGame, onViewLeaderboard, onUpdateActiveCar }: { activeCarId: string, coins: number, garage: any[], onBack: () => void, onStartGame: () => void, onViewLeaderboard?: (trackId: string) => void, onUpdateActiveCar?: (carId: string, color: string, liveryId: string | null) => void }) => {
  const [room, setRoom] = useState(socketService.room);
  const [showTrackSelector, setShowTrackSelector] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [startGameError, setStartGameError] = useState<string | null>(null);
  const hasSyncedInitVehicle = React.useRef(false);
  
  useEffect(() => {
    setRoom(socketService.room);
    const unsub = socketService.subscribe(() => {
      if (socketService.room) {
        setRoom({ ...socketService.room });
      }
    });

    socketService.socket?.on('gameStarted', () => {
       onStartGame();
    });

    // Auto update status if returning to LOBBY
    socketService.socket?.on('returnedToLobby', (r: any) => {
      if (r) {
        socketService.room = r;
        setRoom({ ...r } as any);
      }
    });

    socketService.socket?.on('kicked', () => {
      onBack(); // Go back to room list or menu
    });

    return () => {
      unsub();
      socketService.socket?.off('gameStarted');
      socketService.socket?.off('returnedToLobby');
      socketService.socket?.off('kicked');
    }
  }, [onStartGame, onBack]);

  if (!room) return <div className="p-8 text-center">Loading...</div>;

  const myPlayer = room.players.find(p => p.id === socketService.playerId);

  React.useEffect(() => {
    if (myPlayer && !hasSyncedInitVehicle.current) {
        hasSyncedInitVehicle.current = true;
        const activeCar = garage.find(c => c.carId === activeCarId);
        if (activeCar) {
            socketService.updatePlayer({ 
                vehicleId: activeCar.carId, 
                liveryId: activeCar.equippedPaint || 'livery_basic', 
                engineId: activeCar.equippedParts?.engine || null, 
                tiresId: activeCar.equippedParts?.tires || null, 
                launchId: activeCar.equippedParts?.launch || null, 
                driftId: activeCar.equippedParts?.drift || null, 
                accelerationId: activeCar.equippedParts?.acceleration || null 
            });
        }
    }
  }, [myPlayer, garage, activeCarId]);

  const isHost = myPlayer?.isHost;
  const allReady = room.players.every(p => p.isReady || p.isAI);
  const allOthersReady = room.players.filter(p => p.id !== room.hostId).every(p => p.isReady || p.isAI);

  const handleVehicleChange = (dir: number) => {
    if (!myPlayer) return;
    const ownedCarIds = Array.from(new Set(garage.map(g => g.carId)));
    if (ownedCarIds.length === 0) return; // 防御性判断
    const vIdx = ownedCarIds.indexOf(myPlayer.vehicleId);
    let nextIdx = (vIdx + dir + ownedCarIds.length) % ownedCarIds.length;
    // 如果当前选的没在车库里(比如刚进来默认的)，强制给第一个
    if (vIdx === -1) nextIdx = 0; 
    socketService.updatePlayer({ vehicleId: ownedCarIds[nextIdx] });
  };

  const handleLiveryChange = (dir: number) => {
    if (!myPlayer) return;
    const lIdx = LIVERIES_DB.findIndex(l => l.id === myPlayer.liveryId);
    let nextIdx = (lIdx + dir + LIVERIES_DB.length) % LIVERIES_DB.length;
    socketService.updatePlayer({ liveryId: LIVERIES_DB[nextIdx].id });
  };

  const generateAIConfig = (overrideDiff?: number) => {
    const diff = overrideDiff ?? (room?.settings.aiDifficulty || 2);
    const isElite = diff === 5;
    
    let availableVehicles = VEHICLES_DB;
    if (isElite) {
      availableVehicles = VEHICLES_DB.filter(v => v.price >= 3000 || v.id === 'car_boss' || v.id === 'car_legend');
    } else {
      if (diff === 1) availableVehicles = VEHICLES_DB.filter(v => v.price <= 1200);
      else if (diff === 2) availableVehicles = VEHICLES_DB.filter(v => v.price >= 800 && v.price <= 1500);
      else if (diff === 3) availableVehicles = VEHICLES_DB.filter(v => v.price >= 1500 && v.price <= 3000);
      else if (diff === 4) availableVehicles = VEHICLES_DB.filter(v => v.price >= 2000);
    }
    if (availableVehicles.length === 0) availableVehicles = VEHICLES_DB;
    
    const v = availableVehicles[Math.floor(Math.random() * availableVehicles.length)];
    const l = LIVERIES_DB[Math.floor(Math.random() * LIVERIES_DB.length)];
    
    const probUpgrade = isElite ? 1.0 : (diff === 4 ? 0.9 : diff * 0.25);
    const isTopTier = isElite || diff === 4;
    
    const engines = ITEMS_DB.filter(i => i.type === 'engine' && (isTopTier ? i.price >= 1000 : i.price <= 1000));
    const tires = ITEMS_DB.filter(i => i.type === 'tires' && (isTopTier ? i.price >= 1000 : i.price <= 1000));
    const launch = ITEMS_DB.filter(i => i.type === 'launch' && (isTopTier ? i.price >= 1000 : i.price <= 1000));
    const drift = ITEMS_DB.filter(i => i.type === 'drift' && (isTopTier ? i.price >= 1000 : i.price <= 1000));
    const accel = ITEMS_DB.filter(i => i.type === 'acceleration' && (isTopTier ? i.price >= 1000 : i.price <= 1000));
    
    return {
      vehicleId: v.id,
      liveryId: l.id,
      engineId: Math.random() < probUpgrade && engines.length ? engines[Math.floor(Math.random() * engines.length)].id : undefined,
      tiresId: Math.random() < probUpgrade && tires.length ? tires[Math.floor(Math.random() * tires.length)].id : undefined,
      launchId: Math.random() < probUpgrade && launch.length ? launch[Math.floor(Math.random() * launch.length)].id : undefined,
      driftId: Math.random() < probUpgrade && drift.length ? drift[Math.floor(Math.random() * drift.length)].id : undefined,
      accelerationId: Math.random() < probUpgrade && accel.length ? accel[Math.floor(Math.random() * accel.length)].id : undefined,
      style: ['OPTIMAL', 'AGGRESSIVE', 'CAUTIOUS', 'DRIFTER'][Math.floor(Math.random() * 4)] as any
    };
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4 z-[100] flex flex-col gap-2 items-start">
        <button onClick={onBack} className="text-zinc-400 hover:text-white px-4 py-2 bg-black/50 rounded backdrop-blur border border-white/10 text-sm">
          &lt; 退出房间
        </button>
        <button onClick={() => onViewLeaderboard?.(room.settings.trackId || 'oval')} className="text-accent-yellow hover:text-white px-4 py-2 bg-black/50 rounded backdrop-blur border border-accent-yellow/50 text-sm">
          🏆 排行榜
        </button>
      </div>
      <div className="absolute top-16 right-4 z-[100] text-white text-sm bg-black/50 px-4 py-2 rounded backdrop-blur border border-white/10 flex flex-col items-end gap-1">
        <div>您的昵称: <span className="text-accent-cyan font-bold">{myPlayer?.name || '您'}</span></div>
        <div className="text-accent-yellow font-mono text-xs">金币: {coins.toLocaleString()} ⟁</div>
      </div>
      <div className="neon-panel max-w-5xl w-full flex flex-col md:flex-row gap-6 p-6">
         {/* Left Side: My Settings */}
         <div className="flex-1 border-r border-white/10 pr-6">
            <h2 className="text-xl font-bold mb-6">在线对战</h2>

            <div className="flex flex-col items-center gap-4">
               <div className="bg-black/40 rounded-xl border border-white/10 p-6 flex flex-col items-center justify-center w-full relative">
                  {garage.find(c => c.carId === myPlayer?.vehicleId) && (
                     <div className="absolute top-4 right-4 text-xs font-mono font-bold text-accent-yellow bg-black/50 px-2 py-1 rounded border border-accent-yellow/30">
                        Lv.+{garage.find(c => c.carId === myPlayer?.vehicleId)?.level || 0}
                     </div>
                  )}
                  <VehiclePreview 
                    vehicleType={VEHICLES_DB.find(v => v.id === myPlayer?.vehicleId)?.type || 'standard'} 
                    color={LIVERIES_DB.find(l => l.id === myPlayer?.liveryId) ? '#ffffff' : (myPlayer?.liveryId || '#00f2ff')} 
                    width={160} height={160}
                    liveryData={LIVERIES_DB.find(l => l.id === myPlayer?.liveryId) || undefined}
                  />
                  <div className="mt-4 text-center">
                     <div className="font-bold text-lg">{VEHICLES_DB.find(v => v.id === myPlayer?.vehicleId)?.name || '未知车辆'}</div>
                     <div className="text-xs text-zinc-500 mt-1">
                        {['engine', 'tires', 'launch', 'drift', 'acceleration']
                           .map(t => ITEMS_DB.find(i => i.id === garage.find(c => c.carId === myPlayer?.vehicleId)?.equippedParts?.[t as any])?.name)
                           .filter(Boolean).join(' | ') || '无配件'}
                     </div>
                  </div>
               </div>
               
               <div className="w-full">
                 <button 
                   onClick={() => setShowConfigModal(true)}
                   className={`w-full py-2 mb-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded border border-white/20 transition-all ${myPlayer?.isReady ? 'opacity-50 pointer-events-none' : ''}`}
                 >
                   更改配置
                 </button>
               </div>

               {isHost ? (
                 <div className="relative w-full">
                   {room.settings.isTeamMode && room.players.length < 4 && (
                      <div className="absolute -top-12 left-0 right-0 text-red-500 font-bold bg-red-500/20 border border-red-500/50 rounded py-2 text-center text-sm shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                        人数不足 4 人，无法开启组队赛
                      </div>
                   )}
                   <button 
                     onClick={() => {
                       if (room.settings.isTeamMode) {
                         const redCount = room.players.filter(p => p.team === 'RED').length;
                         const blueCount = room.players.filter(p => p.team === 'BLUE').length;
                         if (redCount !== blueCount || redCount === 0 || (redCount + blueCount !== room.players.length)) {
                           setStartGameError('无法开始：红队和蓝队的车手数量必须一致，且所有车手都必须分配队伍！');
                           return;
                         }
                       }
                       
                       // 1. 强制将房主自身设置为 Ready，防止后端的“全员就绪强校验”拦截开赛请求
                       socketService.setReady(true);
                       
                       // 2. 向服务端发送真正的开赛请求
                       socketService.startGame();
                       
                       // 3. 【核心修复】：彻底删除这里的 onStartGame() 调用！
                       // 房主必须和所有人一样，等待服务端统一广播 `gameStarted` 事件后，由 useEffect 触发跳转。
                     }}
                     title={!allOthersReady ? '等待其他玩家准备...' : ''}
                     disabled={!allOthersReady || (room.settings.isTeamMode && room.players.length < 4)}
                     className={`w-full py-4 rounded font-black text-xl transition-all ${allOthersReady && !(room.settings.isTeamMode && room.players.length < 4) ? 'bg-accent-yellow text-black shadow-[0_0_20px_rgba(255,234,0,0.4)]' : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'}`}
                   >
                     {!allOthersReady ? '等待其他玩家准备...' : '开始比赛'}
                   </button>
                 </div>
               ) : (
                 <button 
                   onClick={() => socketService.setReady(!myPlayer?.isReady)}
                   className={`w-full py-4 rounded font-black text-xl transition-all ${myPlayer?.isReady ? 'bg-accent-cyan text-black shadow-[0_0_20px_rgba(0,242,255,0.4)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                 >
                   {myPlayer?.isReady ? '取消准备' : '准备比赛'}
                 </button>
               )}
               
               {/* Map Preview */}
               <div className="w-full mt-4 bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col relative overflow-hidden">
                 <div className="flex justify-between items-center mb-2">
                   <h3 className="text-xs text-zinc-500">当前比赛地图</h3>
                   {isHost ? (
                     <div className="flex gap-2 text-xs">
                       <button onClick={() => socketService.updateSettings({ laps: Math.max(1, (room.settings.laps || 2) - 1) })} className="px-1 hover:text-white">-</button>
                       <span className="text-accent-cyan font-bold block bg-white/10 px-2 rounded">{room.settings.laps || 2} 圈</span>
                       <button onClick={() => socketService.updateSettings({ laps: Math.min(10, (room.settings.laps || 2) + 1) })} className="px-1 hover:text-white">+</button>
                     </div>
                   ) : (
                     <span className="text-accent-cyan font-bold text-xs">{room.settings.laps || 2} 圈</span>
                   )}
                 </div>
                 <button 
                   onClick={() => isHost && setShowTrackSelector(true)}
                   className={`flex-1 flex flex-col items-center justify-center p-2 rounded transition-all ${isHost ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}
                 >
                   <svg width="100" height="50" viewBox="0 0 1600 1200" className="opacity-80">
                     <path 
                       d={TRACKS.find(t => t.id === room.settings.trackId)?.waypoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'} 
                       fill="none" 
                       stroke="#00f2ff" 
                       strokeWidth="80" 
                       strokeLinejoin="round" 
                       strokeLinecap="round" 
                     />
                   </svg>
                   <span className="mt-2 text-sm font-bold text-zinc-300">
                     {TRACKS.find(t => t.id === room.settings.trackId)?.name}
                   </span>
                 </button>
               </div>
            </div>
         </div>

         {/* Settings Modal */}
         <AnimatePresence>
           {showConfigModal && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur"
             >
               <motion.div 
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 exit={{ scale: 0.9, y: 20 }}
                 className="neon-panel max-w-3xl w-full p-6 flex flex-col bg-black/80 max-h-[80vh]"
               >
                 <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold text-accent-cyan">选择车辆与涂装配置</h2>
                   <button onClick={() => setShowConfigModal(false)} className="text-zinc-500 hover:text-white">✕</button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto pr-2 gap-4 flex flex-col">
                   <h3 className="text-white text-sm font-bold opacity-80 border-b border-white/10 pb-2">我的车库</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                     {garage.map(car => {
                       const vDef = VEHICLES_DB.find(v => v.id === car.carId);
                       if (!vDef) return null;
                       const isSelected = myPlayer?.vehicleId === car.carId;
                       return (
                         <div 
                           key={car.carId} 
                           onClick={() => { socketService.updatePlayer({ vehicleId: car.carId, 
                               liveryId: car.equippedPaint || 'livery_basic',
                               engineId: car.equippedParts?.engine || null, 
                               tiresId: car.equippedParts?.tires || null, 
                               launchId: car.equippedParts?.launch || null, 
                               driftId: car.equippedParts?.drift || null, 
                               accelerationId: car.equippedParts?.acceleration || null 
                            });
                            if (onUpdateActiveCar) onUpdateActiveCar(car.carId, car.equippedPaint || '#00f2ff', car.equippedPaint || 'livery_basic');
                         }}
                           className={`p-3 rounded border text-left flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isSelected ? 'border-accent-cyan bg-accent-cyan/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                         >
                           <div className="text-xs font-mono font-bold w-full text-right text-accent-yellow">Lv.+{car.level}</div>
                           <VehiclePreview vehicleType={vDef.type} width={60} height={60} color={LIVERIES_DB.find(l => l.id === car.equippedPaint) ? '#ffffff' : (car.equippedPaint || '#00f2ff')} liveryData={LIVERIES_DB.find(l => l.id === car.equippedPaint) || undefined} />
                           <div className="text-sm font-bold truncate w-full text-center">{vDef.name}</div>
                           <div className="text-[10px] text-zinc-500 truncate w-full text-center">
                             {['engine', 'tires', 'launch', 'drift', 'acceleration'].map(t => ITEMS_DB.find(i => i.id === car.equippedParts?.[t])?.name).filter(Boolean).join(' | ') || '无配件'}
                           </div>
                         </div>
                       );
                     })}
                   </div>

                   <h3 className="text-white text-sm font-bold opacity-80 border-b border-white/10 pb-2 mt-4">基础颜色</h3>
                    <div className="flex gap-2 mb-4">
                      {BASIC_COLORS.map(color => {
                        const isSelected = myPlayer?.liveryId === color;
                        return (
                          <div 
                            key={color} 
                            onClick={() => {
                               socketService.updatePlayer({ liveryId: color });
                               if (onUpdateActiveCar && myPlayer) {
                                  onUpdateActiveCar(myPlayer.vehicleId, color, color);
                               }
                            }}
                            className={`w-10 h-10 rounded-full border-2 cursor-pointer transition-all ${isSelected ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            style={{ backgroundColor: color, boxShadow: isSelected ? `0 0 15px ${color}` : 'none' }}
                          ></div>
                        );
                      })}
                    </div>

                    <h3 className="text-white text-sm font-bold opacity-80 border-b border-white/10 pb-2 mt-4">拥有的涂装</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                     {LIVERIES_DB.filter(l => l.price === 0 || garage.some(c => c.equippedPaint === l.id /* simplify: ideally should come from unlocked liveries but for this prd we only change equipped paint */)).map(livery => {
                       const isSelected = myPlayer?.liveryId === livery.id;
                       return (
                         <div 
                           key={livery.id} 
                           onClick={() => {
                              socketService.updatePlayer({ liveryId: livery.id });
                              if (onUpdateActiveCar && myPlayer) {
                                  onUpdateActiveCar(myPlayer.vehicleId, livery.colors[0], livery.id);
                              }
                            }}
                           className={`p-2 rounded border text-center cursor-pointer transition-all flex flex-col items-center gap-2 ${isSelected ? 'border-accent-magenta bg-accent-magenta/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                         >
                           <div className="w-full h-8 rounded" style={{
                              background: livery.isGradient 
                                ? `linear-gradient(135deg, ${livery.colors[0]} 0%, ${livery.colors[1]} 50%, ${livery.colors[2] || livery.colors[1]} 100%)`
                                : livery.colors[0],
                              border: '1px solid rgba(255,255,255,0.1)'
                           }}></div>
                           <div className="text-xs font-bold truncate w-full">{livery.name}</div>
                         </div>
                       );
                     })}
                     <div className="col-span-full mt-2 text-xs text-zinc-500 opacity-60">* 暂不支持在这里购买新涂装，可更换已持有或默认涂装。</div>
                   </div>
                 </div>
               </motion.div>
             </motion.div>
           )}
         </AnimatePresence>

         {/* Track Selector Modal */}
         <AnimatePresence>
           {showTrackSelector && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
             >
               <motion.div 
                 initial={{ scale: 0.9, y: 20 }}
                 animate={{ scale: 1, y: 0 }}
                 exit={{ scale: 0.9, y: 20 }}
                 className="neon-panel max-w-4xl w-full p-6 flex flex-col"
               >
                 <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold text-accent-cyan">选择赛道</h2>
                   <button onClick={() => setShowTrackSelector(false)} className="text-zinc-500 hover:text-white">✕</button>
                 </div>
                 
                 <TrackSelector 
                    selectedTrackId={room.settings.trackId}
                    onSelect={(id) => {
                      socketService.updateSettings({ trackId: id });
                      setShowTrackSelector(false);
                    }}
                 />
               </motion.div>
             </motion.div>
           )}
         </AnimatePresence>

         {/* Right Side: Room Info & Players */}
         <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6 bg-black/40 p-4 border border-white/10 rounded">
               <div className="flex-1 mr-4">
                 <span className="text-zinc-500 text-xs lowercase tracking-wider opacity-60">房间名称:</span>
                 {isHost ? (
                   <input 
                     type="text" 
                     value={room.settings.roomName || ''} 
                     onChange={e => socketService.updateSettings({ roomName: e.target.value })}
                     className="w-full bg-transparent text-xl font-bold text-accent-yellow outline-none border-b border-white/10 focus:border-accent-yellow transition-colors pb-1"
                     placeholder="输入房间名称"
                   />
                 ) : (
                   <p className="text-xl font-bold text-accent-yellow truncate">{room.settings.roomName || `${room.hostName} 的房间`}</p>
                 )}
               </div>
               {isHost ? (
                  <button onClick={() => { socketService.disbandRoom(); }} className="px-4 py-2 bg-red-500/20 text-red-500 rounded border border-red-500/50 hover:bg-red-500/50 hover:text-white font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                    解散房间
                  </button>
               ) : (
                 <button onClick={() => { socketService.leaveRoom(); onBack(); }} className="px-4 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 border border-red-500/30">
                   退出离开
                 </button>
               )}
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-accent-magenta">车手列表 ({room.players.length}/6)</h3>
              {isHost && (
                <button 
                  onClick={() => socketService.addAi(generateAIConfig())}
                  disabled={room.players.length >= 6}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-xs rounded transition-all disabled:opacity-50"
                >
                  + 添加 AI
                </button>
              )}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto mb-4 custom-scrollbar">
               {[...room.players].sort((a,b)=>((b.score||0)-(a.score||0))).map(p => (
                 <div key={p.id} className={`flex items-center justify-between p-3 rounded border ${p.isReady || p.isAI ? 'border-accent-cyan/30 bg-accent-cyan/10' : 'border-white/10 bg-white/5'}`}>
                    <div className="flex items-center gap-3">
                       <VehiclePreview vehicleType={VEHICLES_DB.find(v => v.id === p.vehicleId)?.type || 'standard'} width={40} height={40} color={LIVERIES_DB.find(l => l.id === p.liveryId) ? '#ffffff' : (p.liveryId || '#00f2ff')} liveryData={LIVERIES_DB.find(l => l.id === p.liveryId) || undefined} />
                       <div>
                         <span className="font-bold flex items-center gap-2">
                           {p.name}
                           {p.isHost && <span className="text-[10px] bg-accent-yellow text-black px-1 rounded-sm">房主</span>}
                           {p.isAI && <span className="text-[10px] bg-zinc-600 px-1 rounded-sm">AI</span>}
                         </span>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {room.settings.isTeamMode && (
                        <button 
                          onClick={() => {
                            if (!isHost && p.id !== socketService.playerId) return; // Only host can change others
                            const newTeam = p.team === 'BLUE' ? 'RED' : 'BLUE';
                            if (p.id === socketService.playerId) socketService.updatePlayer({ team: newTeam });
                            else if (isHost) socketService.updatePlayerByHost(p.id, { team: newTeam });
                          }}
                          disabled={!isHost && p.id !== socketService.playerId}
                          className={`text-[10px] px-2 py-0.5 rounded transition-colors mr-2 ${!p.team ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/50' : p.team === 'RED' ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-blue-500/20 text-blue-500 border border-blue-500/50'} ${(!isHost && p.id !== socketService.playerId) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                        >
                          {!p.team ? '选择队伍' : p.team === 'RED' ? '红队' : '蓝队'}
                        </button>
                      )}
                      {isHost && !p.isAI && !p.isHost && (
                        <button 
                          onClick={() => socketService.transferHost(p.id)}
                          className="text-[10px] bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/50 hover:bg-accent-yellow hover:text-black px-1.5 py-0.5 rounded transition-colors mr-2"
                        >
                          移交房主
                        </button>
                      )}
                      <span className={`text-xs font-bold ${p.isReady || p.isAI ? 'text-accent-cyan' : 'text-zinc-500'}`}>
                        {p.isReady || p.isAI ? '● 已准备' : '等待中...'}
                      </span>
                      {isHost && !p.isHost && (
                        <button 
                          onClick={() => p.isAI ? socketService.removeAi(p.id) : socketService.kickPlayer(p.id)} 
                          className="ml-2 text-red-400 hover:text-red-300 transition-colors p-1"
                          title={p.isAI ? "移除 AI" : "踢出玩家"}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                 </div>
               ))}
               
               {Array.from({ length: 6 - room.players.length }).map((_, i) => (
                 <div key={i} className="p-3 border border-white/5 border-dashed rounded text-center opacity-30 text-xs flex items-center justify-center h-[66px]">
                   空位
                 </div>
               ))}
            </div>
            
            {isHost && (
               <div className="p-4 bg-white/5 rounded border border-white/10 mb-4">
                 <h4 className="text-xs text-zinc-400 mb-2">房主设置</h4>
                 <div className="flex gap-4 text-xs items-center flex-wrap">
                    <button 
                      onClick={() => {
                        if (!room.settings.isTeamMode && room.players.length < 4) {
                           setStartGameError('人数不足 4 人，无法开启组队赛');
                           setTimeout(() => setStartGameError(null), 3000);
                           return;
                        }
                        socketService.updateSettings({ isTeamMode: !room.settings.isTeamMode });
                      }}
                      className={`px-3 py-1.5 rounded font-bold transition-all ${room.settings.isTeamMode ? 'bg-accent-yellow text-black' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                      组队模式: {room.settings.isTeamMode ? '已开启' : '关闭'}
                    </button>
                    
                    <div className="flex items-center gap-2 bg-black/40 px-2 py-1.5 rounded">
                      <span className="text-zinc-400">房间加密:</span>
                      <input 
                        type="checkbox" 
                        checked={room.settings.passwordEnabled} 
                        onChange={e => socketService.updateSettings({ passwordEnabled: e.target.checked })}
                        className="accent-accent-magenta"
                      />
                      {room.settings.passwordEnabled && (
                        <input 
                          type="text" 
                          value={room.settings.password || ''} 
                          onChange={e => socketService.updateSettings({ password: e.target.value })}
                          placeholder="设置新密码"
                          className="bg-black/50 border border-white/10 rounded px-2 py-0.5 text-accent-magenta w-20 outline-none focus:border-accent-magenta"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 bg-black/40 px-2 py-1.5 rounded">
                      <span className="text-zinc-400">AI 难度:</span>
                      <button onClick={() => {
                        const newDiff = Math.max(1, (room.settings.aiDifficulty || 2) - 1);
                        socketService.updateSettings({ aiDifficulty: newDiff });
                        room.players.filter(p => p.isAI).forEach(ai => socketService.updatePlayerByHost(ai.id, generateAIConfig(newDiff)));
                      }} className="px-1 hover:text-white">-</button>
                      <span className="text-accent-cyan font-bold w-24 text-center">{['入门级(L1)', '业余级(L2)', '专业级(L3)', '大师级(L4)', '精英级(L5)'][(room.settings.aiDifficulty || 2) - 1] || '业余级(L2)'}</span>
                      <button onClick={() => {
                        const newDiff = Math.min(5, (room.settings.aiDifficulty || 2) + 1);
                        socketService.updateSettings({ aiDifficulty: newDiff });
                        room.players.filter(p => p.isAI).forEach(ai => socketService.updatePlayerByHost(ai.id, generateAIConfig(newDiff)));
                      }} className="px-1 hover:text-white">+</button>
                    </div>
                    {room.settings.isTeamMode && (
                      <span className="text-zinc-500 w-full mt-1">请在上方车手列表中分配红队和蓝队。双方人数必须一致。</span>
                    )}
                 </div>
               </div>
            )}

            {startGameError && (
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 p-4 border border-red-500/50 rounded shadow-[0_0_20px_rgba(239,68,68,0.3)] z-[200] max-w-sm w-full">
                <div className="text-red-500 text-center text-sm font-bold mb-4">{startGameError}</div>
                <button onClick={() => setStartGameError(null)} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition-colors">确定</button>
              </div>
            )}

            <div className="text-center text-zinc-500 py-4 font-bold text-sm bg-black/40 rounded border border-white/5">
              {isHost ? (allOthersReady ? '所有玩家已就绪，您可以开始比赛了' : '等待其他玩家准备...') : (allOthersReady && myPlayer?.isReady ? '等待房主开始比赛...' : '等待其他玩家准备...')}
            </div>
         </div>
      </div>
    </div>
  );
};
