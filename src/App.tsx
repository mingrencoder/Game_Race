import React, { useState, useEffect } from 'react';
import { OnlineMenu, OnlineLobby } from './components/OnlineLobby';
import PlayerInfoUI from './components/PlayerInfoUI';
import { socketService } from './services/socketService';
import { GameSettings, CarState, AIDifficulty, GameMode, PlayerData, LapRecord, AIStyle, TeamSetup } from './types';
import { TRACKS, VEHICLES_DB, ITEMS_DB, LIVERIES_DB, AI_NAMES, SYS_CONFIG, GAME_CONSTANTS, AI_TIER_COLORS } from './constants';
import GameCanvas from './components/GameCanvas';
import { OnlineRoomsPreview } from './components/OnlineRoomsPreview';
import { InstructionsModal } from './components/InstructionsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { LeaderboardModal } from './components/LeaderboardModal';

/** 随机抽取一个预设的 AI 名称 */
const getRandomAiName = () => AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];

/** 
 * 根据设定生成组队模式中的 AI 名单列表
 * @param teamSize 每队人数，默认3
 * @param difficulty AI 难度级别，决定了电脑使用的赛车与属性
 */
const generateTeamRoster = (teamSize: 2 | 3 = 3, difficulty: AIDifficulty = 2): TeamSetup[] => {
  const styles: AIStyle[] = ['OPTIMAL', 'AGGRESSIVE', 'CAUTIOUS', 'DRIFTER'];
  const roster: TeamSetup[] = [];
  
  // Create AI that fits the difficulty level roughly
  const createRandomAI = (id: string, name: string, team: 'RED' | 'BLUE'): TeamSetup => {
    let availableVehicles = VEHICLES_DB;
    if (difficulty === 5) {
      availableVehicles = VEHICLES_DB.filter(v => v.price >= GAME_CONSTANTS.AI_VEHICLE_PRICE.ELITE_MIN || v.id === 'car_boss' || v.id === 'car_legend');
    } else {
      if (difficulty === 1) availableVehicles = VEHICLES_DB.filter(v => v.price <= GAME_CONSTANTS.AI_VEHICLE_PRICE.EASY_MAX);
      else if (difficulty === 2) availableVehicles = VEHICLES_DB.filter(v => v.price >= GAME_CONSTANTS.AI_VEHICLE_PRICE.MED_MIN && v.price <= GAME_CONSTANTS.AI_VEHICLE_PRICE.MED_MAX);
      else if (difficulty === 3) availableVehicles = VEHICLES_DB.filter(v => v.price >= GAME_CONSTANTS.AI_VEHICLE_PRICE.HARD_MIN && v.price <= GAME_CONSTANTS.AI_VEHICLE_PRICE.HARD_MAX);
      else if (difficulty === 4) availableVehicles = VEHICLES_DB.filter(v => v.price >= GAME_CONSTANTS.AI_VEHICLE_PRICE.EXPERT_MIN);
    }
    
    if (availableVehicles.length === 0) availableVehicles = VEHICLES_DB;

    const v = availableVehicles[Math.floor(Math.random() * availableVehicles.length)];
    
    const probUpgrade = difficulty === 5 ? 1.0 : (difficulty === 4 ? 0.9 : difficulty * 0.25); 
    const isTopTierUpgrade = difficulty >= 4;

    const hasEngine = Math.random() < probUpgrade;
    const hasTires = Math.random() < probUpgrade;
    
    const hasLivery = Math.random() > 0.5;
    const engines = ITEMS_DB.filter(i => i.type === 'engine');
    const tires = ITEMS_DB.filter(i => i.type === 'tires');

    const getEngine = () => {
      if (!hasEngine) return null;
      if (isTopTierUpgrade) return engines[engines.length - 1].id;
      return engines[Math.floor(Math.random() * (engines.length - 1))].id;
    }

    const getTires = () => {
      if (!hasTires) return null;
      if (isTopTierUpgrade) return tires[tires.length - 1].id;
      return tires[Math.floor(Math.random() * (tires.length - 1))].id;
    }
    
    const style = styles[Math.floor(Math.random() * styles.length)];
    
    return {
      id,
      name,
      vehicleId: v.id,
      engineId: getEngine(),
      tiresId: getTires(),
      liveryId: hasLivery ? LIVERIES_DB[Math.floor(Math.random() * LIVERIES_DB.length)].id : null,
      style,
      team,
    };
  };

  for (let i = 0; i < teamSize - 1; i++) {
    roster.push(createRandomAI(`red_ai_${i+1}`, getRandomAiName(), 'RED'));
  }
  
  for (let i = 0; i < teamSize; i++) {
    roster.push(createRandomAI(`blue_ai_${i+1}`, getRandomAiName(), 'BLUE'));
  }

  return roster;
};

/** 
 * 根据难度批量随机生成单机比赛中所需的无尽 AI 车手种子数据 
 * 包含了车辆随机、改装随机、皮肤随机等
 */
const generateAiRosterSeeds = (count: number, difficulty: AIDifficulty) => {
  const seeds = [];
  const styles: AIStyle[] = ['OPTIMAL', 'AGGRESSIVE', 'CAUTIOUS', 'DRIFTER'];
  
  for (let i = 0; i < count; i++) {
    let availableVehicles = VEHICLES_DB;
    if (difficulty === 5) {
      availableVehicles = VEHICLES_DB.filter(v => v.price >= GAME_CONSTANTS.AI_VEHICLE_PRICE.ELITE_MIN || v.id === 'car_boss' || v.id === 'car_legend');
    } else {
      if (difficulty === 1) availableVehicles = VEHICLES_DB.filter(v => v.price <= GAME_CONSTANTS.AI_VEHICLE_PRICE.EASY_MAX);
      else if (difficulty === 2) availableVehicles = VEHICLES_DB.filter(v => v.price >= GAME_CONSTANTS.AI_VEHICLE_PRICE.MED_MIN && v.price <= GAME_CONSTANTS.AI_VEHICLE_PRICE.MED_MAX);
      else if (difficulty === 3) availableVehicles = VEHICLES_DB.filter(v => v.price >= GAME_CONSTANTS.AI_VEHICLE_PRICE.HARD_MIN && v.price <= GAME_CONSTANTS.AI_VEHICLE_PRICE.HARD_MAX);
      else if (difficulty === 4) availableVehicles = VEHICLES_DB.filter(v => v.price >= GAME_CONSTANTS.AI_VEHICLE_PRICE.EXPERT_MIN);
    }
    
    if (availableVehicles.length === 0) availableVehicles = VEHICLES_DB;
    
    const randomBaseVehicle = availableVehicles[Math.floor(Math.random() * availableVehicles.length)];
    
    const probUpgrade = difficulty === 5 ? 1.0 : (difficulty === 4 ? 0.9 : difficulty * 0.25); 
    const isTopTierUpgrade = difficulty >= 4;

    const hasEngine = Math.random() < probUpgrade;
    const hasTires = Math.random() < probUpgrade;

    const engines = ITEMS_DB.filter(item => item.type === 'engine');
    const tiresOptions = ITEMS_DB.filter(item => item.type === 'tires');

    const getEngine = () => {
      if (!hasEngine) return null;
      if (isTopTierUpgrade) return engines[engines.length - 1];
      return engines[Math.floor(Math.random() * (engines.length - 1))];
    }

    const getTires = () => {
      if (!hasTires) return null;
      if (isTopTierUpgrade) return tiresOptions[tiresOptions.length - 1];
      return tiresOptions[Math.floor(Math.random() * (tiresOptions.length - 1))];
    }

    const randomEngine = getEngine();
    const randomTire = getTires();
    
    const hasLivery = Math.random() > 0.6;
    
    let randomLivery: any = undefined;
    let pColor: string;
    
    if (difficulty === 5) {
      randomLivery = { isGradient: true, colors: [`hsl(${Math.random()*360}, 100%, 50%)`, `hsl(${Math.random()*360}, 100%, 50%)`, `hsl(${Math.random()*360}, 100%, 50%)`] };
      pColor = AI_TIER_COLORS.ELITE[Math.floor(Math.random() * AI_TIER_COLORS.ELITE.length)];
    } else {
      randomLivery = hasLivery ? LIVERIES_DB[Math.floor(Math.random() * LIVERIES_DB.length)] : undefined;
      let colorPool = AI_TIER_COLORS.BASIC;
      if (difficulty === 2) colorPool = AI_TIER_COLORS.INTERMEDIATE;
      else if (difficulty === 3) colorPool = AI_TIER_COLORS.ADVANCED;
      else if (difficulty >= 4) colorPool = AI_TIER_COLORS.ELITE;
      
      pColor = randomLivery ? '#ffffff' : colorPool[Math.floor(Math.random() * colorPool.length)];
    }

    const aiStyle = styles[Math.floor(Math.random() * styles.length)];
    const speedVar = (Math.random() - 0.5) * 0.4;
    const gripVar = (Math.random() - 0.5) * 0.02;
    const name = getRandomAiName();
    seeds.push({ name, randomBaseVehicle, randomEngine, randomTire, randomLivery, pColor, aiStyle, speedVar, gripVar });
  }
  return seeds;
};

import AuthUI from './components/AuthUI';
import ShopUI from './components/ShopUI';
import GarageUI from './components/GarageUI';
import EnhancementUI from './components/EnhancementUI';
import GMConsoleUI from './components/GMConsoleUI';
import { TrackSelector } from './components/TrackSelector';
import { Trophy, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioService } from './services/audioService';

/** 新号注册时的初始化玩家存档数据结构模板 */
const initialPlayerData: PlayerData = {
  profile: {
    uid: '',
    nickname: '',
    role: 'player',
    status: 'active',
    banReason: '',
    registerTime: Date.now(),
    activeCarId: 'car_basic'
  },
  wallet: { coins: 0 },
  garage: [
    {
      carId: 'car_basic',
      level: 0,
      durability: SYS_CONFIG.MAX_DURABILITY,
      isPermanent: true,
      expireAt: null,
      equippedParts: { engine: null, tires: null, launch: null, drift: null, acceleration: null },
      equippedPaint: null
    }
  ],
  inventory: {
    materials: { core_primary: 0, core_advanced: 0, core_legendary: 0 },
    protectors: { card_silver: 0, card_gold: 0 },
    specialItems: { rename_card: 0 },
    parts: {},
    paints: []
  }
};



/**
 * 游戏主应用程序入囗与状态机控制器
 * 负责调度主要的 UI 界面流转（菜单、赛车、在线大厅等）、玩家数据上下文以及部分全局音频系统的集成
 */
export default function App() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardTrackId, setLeaderboardTrackId] = useState<string>('oval');
  const [leaderboardLapCount, setLeaderboardLapCount] = useState<number>(2);
  const [leaderboardType, setLeaderboardType] = useState<'LOCAL' | 'ONLINE'>('LOCAL');
  const [showPlayerInfo, setShowPlayerInfo] = useState(false);
  const [showGMConsole, setShowGMConsole] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{message: string, onConfirm: () => void, confirmText?: string} | null>(null);
  
  const [records, setRecords] = useState<Record<string, LapRecord[]>>(() => {
    const saved = localStorage.getItem('neon_lap_records');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old format (keyed just by trackId) to new format (trackId_laps)
      const migrated: Record<string, LapRecord[]> = {};
      Object.entries(parsed).forEach(([key, val]) => {
        if (!key.includes('_')) {
          migrated[`${key}_2`] = val as LapRecord[]; // default to 2 laps for old records
        } else {
          migrated[key] = val as LapRecord[];
        }
      });
      return migrated;
    }
    return {};
  });

  const [onlineRecords, setOnlineRecords] = useState<LapRecord[]>([]);
  const [isFetchingOnline, setIsFetchingOnline] = useState(false);

  useEffect(() => {
    if (showLeaderboard && leaderboardType === 'ONLINE') {
      setIsFetchingOnline(true);
      fetch(`/api/leaderboard/${leaderboardTrackId}/${leaderboardLapCount}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('neon_token')}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) setOnlineRecords(data.records || []);
        else setOnlineRecords([]);
      })
      .catch(() => setOnlineRecords([]))
      .finally(() => setIsFetchingOnline(false));
    }
  }, [showLeaderboard, leaderboardType, leaderboardTrackId, leaderboardLapCount]);

  const [settings, setSettings] = useState<GameSettings>({
    mode: 'SINGLE',
    aiCount: 1,
    aiDifficulty: AIDifficulty.MEDIUM,
    trackId: 'oval',
    teamRoster: generateTeamRoster(),
    aiRosterSeeds: generateAiRosterSeeds(1, AIDifficulty.MEDIUM),
    laps: 2,
    teamSize: 3,
  });
  const [results, setResults] = useState<CarState[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [teamScore, setTeamScore] = useState<{ RED: number; BLUE: number } | null>(null);
  const [newRecordInfo, setNewRecordInfo] = useState<{ playerName: string, diff: number, oldTime: number, newTime: number } | null>(null);
  const [currentOnlineTopRecord, setCurrentOnlineTopRecord] = useState<LapRecord | null>(null);
  const [flawlessVictoryMessage, setFlawlessVictoryMessage] = useState<string | null>(null);
  const [isFlawlessResult, setIsFlawlessResult] = useState<boolean>(false);
  const [matchEarnedCoins, setMatchEarnedCoins] = useState<number>(0);
  const [cupState, setCupState] = useState<{ isActive: boolean; tracks: string[]; currentRaceIndex: number; finished: boolean; teamWins?: { RED: number; BLUE: number } } | null>(null);
  const [gameState, setGameState] = useState<'LOGIN' | 'MENU' | 'PLAYING' | 'RESULT' | 'SHOP' | 'GARAGE' | 'CUP_STANDINGS' | 'ONLINE_MENU' | 'ONLINE_LOBBY' | 'ENHANCEMENT'>('LOGIN');
  
  const [playerData, setPlayerData] = useState<PlayerData>(initialPlayerData);

  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('neon_volume') || '0.5'));
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('neon_muted') === 'true');

  const handleLogout = () => {
    localStorage.removeItem('neon_token');
    localStorage.removeItem('neon_player_v4');
    setPlayerData(initialPlayerData);
    setGameState('LOGIN');
    console.log("User logged out, local state cleared");
  };

  React.useEffect(() => {
    import('./services/socketService').then(({ socketService }) => {
      const checkAndSetup = setInterval(() => {
        if (socketService.socket) {
          socketService.socket.off('returnedToLobby').on('returnedToLobby', (r: any) => {
             if (r) socketService.room = r;
             setGameState(prev => prev === 'PLAYING' ? 'ONLINE_LOBBY' : prev);
          });
          socketService.socket.off('roomDestroyed').on('roomDestroyed', () => {
             setGameState('ONLINE_MENU');
          });
          clearInterval(checkAndSetup);
        }
      }, 500);
      return () => clearInterval(checkAndSetup);
    });
  }, []);

  React.useEffect(() => {
    localStorage.setItem('neon_volume', volume.toString());
    audioService.setVolume(volume);
  }, [volume]);

  React.useEffect(() => {
    localStorage.setItem('neon_muted', isMuted.toString());
    audioService.setMute(isMuted);
  }, [isMuted]);

  React.useEffect(() => {
    localStorage.setItem('neon_lap_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    const token = localStorage.getItem('neon_token');
    if (!token) {
      setGameState('LOGIN');
      return;
    }
    fetch('/api/player/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('会话过期');
      return res.json();
    })
    .then(data => {
      if (data.success && data.data) {
        setPlayerData(data.data);
        setGameState(prev => prev === 'LOGIN' ? 'MENU' : prev); // Added to correctly transition to MENU only from LOGIN
      } else {
        throw new Error('获取档案失败');
      }
    })
    .catch(err => {
      console.error("线上强校验阻断:", err);
      localStorage.removeItem('neon_token');
      setGameState('LOGIN');
    });
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowInstructions(false);
        setShowLeaderboard(false);
        setShowPlayerInfo(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExportRecords = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `paopao_racing_records_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e) {
      console.error('Failed to export records', e);
      alert('导出记录失败。');
    }
  };

  const handleImportRecords = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (typeof imported === 'object' && imported !== null) {
            setConfirmAction({
              message: '是否合并导入的赛道记录？',
              onConfirm: () => {
                setRecords(prev => {
                  const newRecords = { ...prev };
                  Object.keys(imported).forEach(key => {
                    const existing = newRecords[key] || [];
                    const importedList = Array.isArray(imported[key]) ? imported[key] : [];
                    
                    // Merge and sort
                    const merged = [...existing, ...importedList]
                      .sort((a: any, b: any) => a.time - b.time)
                      // Deduplicate by playerName and time string to avoid exact same entries
                      .filter((v, i, a) => a.findIndex(t => (t.playerName === v.playerName && t.time === v.time)) === i)
                      .slice(0, GAME_CONSTANTS.MAX_LEADERBOARD_RECORDS);
                    newRecords[key] = merged;
                  });
                  return newRecords;
                });
                alert('记录导入成功！');
              }
            });
          } else {
             alert('无效的记录文件格式。');
          }
        } catch (err) {
          console.error(err);
          alert('解析导入的文件失败。请确保它是一个有效的 JSON 记录文件。');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleStartGame = (forceOnlineStart: boolean = false) => {
    audioService.init();
    setMatchEarnedCoins(0);

    if (settings.mode === 'ONLINE' && forceOnlineStart !== true) {
      setGameState('ONLINE_MENU');
      return;
    }

    const currentSettings = forceOnlineStart && socketService.room ? {
       ...settings,
       ...socketService.room.settings
    } : settings;

    if (forceOnlineStart && socketService.room) {
       setSettings(currentSettings);
    }

    if (settings.mode !== 'ONLINE') {
       const eqVehicle = playerData.garage.find((c: any) => c.carId === playerData.profile.activeCarId);
       if (eqVehicle?.expireAt && eqVehicle.expireAt < Date.now()) {
          setConfirmAction({
             message: '您当前装备的车辆已过租赁期，无法出战！请先前往车库更换车辆，或去赛道商店续费。',
             onConfirm: () => setConfirmAction(null)
          });
          return;
       }
    }

    if (currentSettings.isCupMode) {
      if (!cupState?.isActive) {
        // Init cup
        const cupTracksCount = currentSettings.cupNumTracks || ((currentSettings.mode === 'TEAM' || currentSettings.isTeamMode) ? 3 : 4);
        const entryFee = cupTracksCount * GAME_CONSTANTS.CUP_ENTRY_FEE_PER_TRACK;
        
        if (playerData.wallet.coins < entryFee) {
           setConfirmAction({
              message: `进入杯赛需要 ${entryFee} ⟁ 报名费，您的金币不足！`,
              onConfirm: () => setConfirmAction(null),
              confirmText: '我知道了'
           });
           return;
        }

        setConfirmAction({
           message: `进入杯赛将扣除 ${entryFee} ⟁ 作为报名费（中途退出不予退还），确定进入吗？`,
           onConfirm: () => {
              const token = localStorage.getItem('neon_token');
              if (!token) return;
              fetch('/api/economy/payEntryFee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ cupTracksCount })
              })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  // 通过拉取全量档案或更新对齐后端下发的结构
                  const token = localStorage.getItem('neon_token');
                  if (token) {
                    fetch('/api/player/profile', { headers: { 'Authorization': `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(profile => {
                      if (profile.success && profile.data) setPlayerData(profile.data);
                    });
                  }
                  
                  const availableTracks = [...TRACKS].map(t => t.id).sort(() => Math.random() - 0.5);
                  const selectedTracks = availableTracks.slice(0, cupTracksCount);
                  
                  setCupState({
                    isActive: true,
                    tracks: selectedTracks,
                    currentRaceIndex: 0,
                    finished: false,
                    teamWins: currentSettings.mode === 'TEAM' ? { RED: 0, BLUE: 0 } : undefined
                  });
                  setScores({});
                  setTeamScore(null);
                  setNewRecordInfo(null);
                  setSettings(s => ({ ...s, trackId: selectedTracks[0] }));
                  
                  setGameState('CUP_STANDINGS');
                } else {
                  setConfirmAction({
                    message: data.message || '报名失败，金币不足。',
                    onConfirm: () => setConfirmAction(null),
                    confirmText: '我知道了'
                  });
                }
              }).catch(() => {
                setConfirmAction({
                  message: '网络异常，报名失败。',
                  onConfirm: () => setConfirmAction(null),
                  confirmText: '我知道了'
                });
              });
           },
           confirmText: '支付并进入'
        });
        return;
      } else {
        // Cup is active and we want to start the actual race
        setNewRecordInfo(null);
        setSettings(s => ({ ...s, trackId: cupState.tracks[cupState.currentRaceIndex] }));
        audioService.startBGM(cupState.tracks[cupState.currentRaceIndex]);
        setGameState('PLAYING');
        return;
      }
    } else {
      setScores({});
      setTeamScore(null);
      setCupState(null);
      audioService.startBGM(currentSettings.trackId);
      setGameState('PLAYING');
    }
  };

  const points = GAME_CONSTANTS.POINTS_SYSTEM;

  const handleFinish = (finalResults: CarState[]) => {
    audioService.stopBGM();

    // Sort results according to requirements:
    // 1. Finished players/AI sorted by finishTime
    // 2. DNF players
    // 3. DNF AI
    const sortedResults = [...finalResults].sort((a, b) => {
      const aFinished = a.finished && !a.dnf;
      const bFinished = b.finished && !b.dnf;

      if (aFinished && bFinished) {
        return (a.finishTime || 0) - (b.finishTime || 0);
      }
      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;

      // Both are DNF or not finished
      // Priority: Human Player > AI
      if (!a.isAI && b.isAI) return -1;
      if (a.isAI && !b.isAI) return 1;

      // If both same type, sort by progress (lap, then waypoint)
      if (a.lap !== b.lap) return b.lap - a.lap;
      if (a.currentWaypointIndex !== b.currentWaypointIndex) return b.currentWaypointIndex - a.currentWaypointIndex;

      return 0;
    });

    setResults(sortedResults);
    
    // Save records
    const isOnlineMode = settings.mode === 'ONLINE';
    const newRecords = { ...records };
    const recordKey = `${settings.trackId}_${settings.laps}`;
    let trackRecords = newRecords[recordKey] || [];
    let bestPreviousTime = trackRecords.length > 0 ? trackRecords[0].time : Infinity;
    let brokeRecord = false;
    
    setNewRecordInfo(null);
    setCurrentOnlineTopRecord(null);
    
    if (isOnlineMode) {
        const token = localStorage.getItem('neon_token');
        if (token) {
            fetch(`/api/leaderboard/${settings.trackId}/${settings.laps}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const fetchedTop = (data.records && data.records.length > 0) ? data.records[0] : null;
                    const bestHuman = sortedResults.find(c => !c.dnf && c.finishTime && !c.isAI);
                    
                    if (bestHuman && bestHuman.finishTime && (!fetchedTop || bestHuman.finishTime < fetchedTop.time)) {
                        // The current race's best time is better than the database's record (or db is empty)
                        setCurrentOnlineTopRecord({
                            playerName: bestHuman.name,
                            time: bestHuman.finishTime,
                            vehicle: VEHICLES_DB.find(v => v.type === bestHuman.vehicleType)?.name || bestHuman.vehicleType || 'Unknown'
                        });
                        setNewRecordInfo(prev => prev || {
                            playerName: bestHuman.name,
                            oldTime: fetchedTop ? fetchedTop.time : Infinity,
                            newTime: bestHuman.finishTime!,
                            diff: fetchedTop ? fetchedTop.time - bestHuman.finishTime! : 0
                        });
                    } else if (fetchedTop) {
                        setCurrentOnlineTopRecord(fetchedTop);
                    }
                }
            })
            .catch(() => {});
        }
    }
    
    sortedResults.forEach((car) => {
      if (!car.dnf && car.finishTime && !car.isAI) {
        // Only save human player records for leaderboard
        const playerName = isOnlineMode ? car.name : (car.id === 'p1' ? '玩家 1' : '玩家 2');
        const isLocalPlayer = isOnlineMode ? car.id === socketService.playerId : (car.id === 'p1');
        
        // 核心要求：在在线模式下跑的记录，只记录在在线记录；且通过在线服务器判断破纪录
        if (isOnlineMode) {
          const token = localStorage.getItem('neon_token');
          if (token && isLocalPlayer) {
            fetch('/api/leaderboard/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ 
                trackId: settings.trackId, 
                laps: settings.laps, 
                time: car.finishTime, 
                vehicle: VEHICLES_DB.find(v => v.type === car.vehicleType)?.name || car.vehicleType || 'Unknown',
                isTeam: ((settings.mode === 'TEAM' || settings.isTeamMode) || settings.isTeamMode)
              })
            }).then(res => res.json())
              .then(data => {
                  if (data.success) {
                      if (data.topRecord) {
                          setCurrentOnlineTopRecord(prev => {
                              if (!prev || data.topRecord.time < prev.time) return data.topRecord;
                              return prev;
                          });
                      }
                      
                      if (data.isTopRecord) {
                         setNewRecordInfo({
                            playerName,
                            oldTime: data.previousTopTime || Infinity,
                            newTime: car.finishTime!,
                            diff: data.previousTopTime ? data.previousTopTime - car.finishTime! : 0
                         });
                      }
                  }
              })
              .catch(() => {});
          }
        } else {
            // 在单机模式下跑的记录，只记录在本地记录，比较纯本地记录
            if (car.finishTime < bestPreviousTime) {
                brokeRecord = true;
                setNewRecordInfo({
                    playerName,
                    oldTime: bestPreviousTime,
                    newTime: car.finishTime,
                    diff: bestPreviousTime === Infinity ? 0 : bestPreviousTime - car.finishTime
                });
                bestPreviousTime = car.finishTime;
            }

            trackRecords.push({
                playerName,
                time: car.finishTime,
                vehicle: VEHICLES_DB.find(v => v.type === car.vehicleType)?.name || car.vehicleType || 'Unknown',
                isTeam: ((settings.mode === 'TEAM' || settings.isTeamMode) || settings.isTeamMode),
                timestamp: Date.now()
            });
        }
      }
    });

    if (!isOnlineMode) {
        // Sort and keep top 10
        trackRecords.sort((a, b) => a.time - b.time);
        newRecords[recordKey] = trackRecords.slice(0, GAME_CONSTANTS.MAX_LEADERBOARD_RECORDS);
        setRecords(newRecords);
    }
    
    // Calculate points/coins
    const newScores = { ...scores };
    
    let currentRedScore = 0;
    let currentBlueScore = 0;
    const playerCount = sortedResults.length;
    
    const racePoints = GAME_CONSTANTS.TEAM_RACE_POINTS[playerCount] || [10, 8, 6, 5, 4, 3, 2, 1];

    let totalRedRaceScore = 0;
    let totalBlueRaceScore = 0;

    sortedResults.forEach((car, index) => {
      const earned = car.dnf ? 0 : (racePoints[index] || 0);
      newScores[car.id] = (newScores[car.id] || 0) + earned;
      
      if ((settings.mode === 'TEAM' || settings.isTeamMode)) {
        if (car.team === 'RED') {
           totalRedRaceScore += earned;
        }
        if (car.team === 'BLUE') {
           totalBlueRaceScore += earned;
        }
      }
    });
    
    currentRedScore = totalRedRaceScore;
    currentBlueScore = totalBlueRaceScore;
    
    let matchWinnerTeam: 'RED' | 'BLUE' | null = null;
    if (currentRedScore > currentBlueScore) {
       matchWinnerTeam = 'RED';
    } else if (currentBlueScore > currentRedScore) {
       matchWinnerTeam = 'BLUE';
    } else if (currentRedScore === currentBlueScore && sortedResults.length > 0) {
       matchWinnerTeam = sortedResults[0].team as 'RED' | 'BLUE';
    }

    let isFlawlessWin = false;
    let mvpId = '';
    let maxTeamScore = -1;

    if (matchWinnerTeam && (settings.mode === 'TEAM' || settings.isTeamMode)) {
      const winnerTeamResults = sortedResults.filter(r => r.team === matchWinnerTeam);
      const totalWinnerMembers = winnerTeamResults.length;
      
      const allFinished = winnerTeamResults.every(r => !r.dnf);
      const currentTopSweep = sortedResults.slice(0, totalWinnerMembers).every(r => r.team === matchWinnerTeam);

      if (allFinished && currentTopSweep) {
        isFlawlessWin = true;
      }

      winnerTeamResults.forEach((car) => {
        if (newScores[car.id] > maxTeamScore) {
          maxTeamScore = newScores[car.id];
          mvpId = car.id;
        }
      });
    }

    setIsFlawlessResult(isFlawlessWin);

    sortedResults.forEach((car, index) => {
      const isLocalPlayer = settings.mode === 'ONLINE' ? car.id === socketService.playerId : car.id === 'p1';
      if (isLocalPlayer) {
        const localPlayerTeam = settings.mode === 'ONLINE' ? sortedResults.find(r => r.id === socketService.playerId)?.team : 'RED';
        const isTeamWin = matchWinnerTeam === localPlayerTeam;
        const isMVP = car.id === mvpId && isTeamWin;
        
        const token = localStorage.getItem('neon_token');
        if (token) {
          // 严格映射后端 EconomyController 要求的中文难度字符串
          const diffStr = ['入门', '进阶', '专家', '专业', '精英'][settings.aiDifficulty - 1] || '进阶';
          
          // 精准判断是否为杯赛的最后一局完赛，以触发后端固定的完赛大奖逻辑
          const isCurrentRaceLast = settings.isCupMode && cupState ? (cupState.currentRaceIndex + 1 >= cupState.tracks.length) : false;
          
          let reqMode = settings.isCupMode ? (isCurrentRaceLast ? 'cup_single' : 'single') : 'single';
          if (settings.mode === 'TEAM' || settings.isTeamMode) {
            reqMode = settings.isCupMode ? (isCurrentRaceLast ? 'cup_team' : 'team') : 'team';
          }

          fetch('/api/economy/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              mode: reqMode,
              carId: playerData.profile.activeCarId,
              players: playerCount,
              difficulty: diffStr,
              rank: car.dnf ? 99 : index + 1, // 转换为基于 1 的真实有效名次
              isTeamWin,
              isFlawless: isFlawlessWin,
              isMVP,
              matches: settings.cupNumTracks || ((settings.mode === 'TEAM' || settings.isTeamMode) ? 3 : 4)
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setMatchEarnedCoins(data.earnedCoins || 0);
              // 遵循 SSOT 原则：拉取底层档案刷新大盘，确保钱包与耐久度双向闭环同步
              fetch('/api/player/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              .then(r => r.json())
              .then(profile => {
                if (profile.success && profile.data) {
                  setPlayerData(profile.data);
                }
              });
            }
          })
          .catch(err => console.error('比赛收益落盘异常:', err));
        }
      }
    });

    setFlawlessVictoryMessage(null);
    if ((settings.mode === 'TEAM' || settings.isTeamMode)) {
      setTeamScore({ RED: currentRedScore, BLUE: currentBlueScore });
      if (isFlawlessWin && matchWinnerTeam) {
        const winnerTeamName = matchWinnerTeam === 'RED' ? '红队' : '蓝队';
        setFlawlessVictoryMessage(`🔥 完胜！${winnerTeamName}全员完赛并包揽前 ${sortedResults.filter(r => r.team === matchWinnerTeam).length} 名！🔥 额外奖励 +10！`);
      }
    } else {
      setTeamScore(null);
    }

    setScores(newScores);

    if (settings.isCupMode && cupState) {
      const nextIndex = cupState.currentRaceIndex + 1;
      let isFinished = nextIndex >= cupState.tracks.length;
      let newTeamWins = cupState.teamWins;
      
      if ((settings.mode === 'TEAM' || settings.isTeamMode) && newTeamWins) {
        if (matchWinnerTeam === 'RED') {
          newTeamWins = { ...newTeamWins, RED: newTeamWins.RED + 1 };
        } else if (matchWinnerTeam === 'BLUE') {
          newTeamWins = { ...newTeamWins, BLUE: newTeamWins.BLUE + 1 };
        }
        
        const requiredWins = Math.ceil(cupState.tracks.length / 2);
        if (newTeamWins.RED >= requiredWins || newTeamWins.BLUE >= requiredWins) {
          isFinished = true;
        }
      }

      if (isFinished && settings.mode !== 'ONLINE') {
        let bonus = 0;
        if (settings.mode === 'TEAM' || settings.isTeamMode) {
           const requiredWins = Math.ceil(cupState.tracks.length / 2);
           const p1Team = 'RED'; // Currently p1 is always RED team
           const redWon = (newTeamWins?.RED || 0) >= requiredWins;
           
           if (redWon && p1Team === 'RED') {
              bonus += cupState.tracks.length * GAME_CONSTANTS.BONUS.CUP_WINNER_MULTIPLIER;
           }

           if (redWon) {
              const sortedOverall = Object.entries(newScores).sort((a, b) => (b[1] as number) - (a[1] as number));
              // MVP is the member of the winning team with the most race points
              const winningTeamId = (newTeamWins?.RED || 0) > (newTeamWins?.BLUE || 0) ? 'RED' : 'BLUE';
              
              let mvpId = '';
              let maxScore = -1;
              sortedOverall.forEach(([id, score]) => {
                 // In our simplified offline logic, RED team is p1, p3, p5. BLUE is p2, p4, p6.
                 const isRed = parseInt(id.replace('p', '')) % 2 !== 0;
                 const team = isRed ? 'RED' : 'BLUE';
                 if (team === winningTeamId && (score as number) > maxScore) {
                    maxScore = score as number;
                    mvpId = id;
                 }
              });
              
              if (mvpId === 'p1') {
                 const diffMult = GAME_CONSTANTS.DIFFICULTY_MULTIPLIER[settings.aiDifficulty] || 1.0;
                 bonus += Math.floor(cupState.tracks.length * GAME_CONSTANTS.BONUS.CUP_FINISH_MULTIPLIER * diffMult);
              }
           }
        } else {
           const sortedOverall = Object.entries(newScores).sort((a, b) => (b[1] as number) - (a[1] as number));
           const p1Index = sortedOverall.findIndex(s => s[0] === 'p1');
           
           if (p1Index === 0) bonus = cupState.tracks.length * GAME_CONSTANTS.BONUS.CUP_P1_FIRST_PLACE;
           else if (p1Index === 1 || p1Index === 2) bonus = cupState.tracks.length * GAME_CONSTANTS.BONUS.CUP_P1_PODIUM;
        }

        // Removed bonus application here, as it is applied when user clicks the claim button in CUP_STANDINGS
      }

      setCupState({
        ...cupState,
        currentRaceIndex: nextIndex,
        finished: isFinished,
        teamWins: newTeamWins
      });
    }

    setGameState('RESULT');
  };

  const handleExit = (isManual: boolean = false) => {
    setGameState(current => {
      // 如果不是玩家手动点击退出按钮触发的操作（即画板自动卸载触发的 onExit），且当前正处于 RESULT 或 CUP_STANDINGS 结算状态，则强制拦截跳转！
      if (!isManual && (current === 'RESULT' || current === 'CUP_STANDINGS')) {
        return current; 
      }
      
      audioService.stopBGM();
      if (isManual) {
        setCupState(null);
        setScores({});
        setTeamScore(null);
        setSettings(s => ({ ...s, isTeamMode: false }));
      }
      
      if (settings.mode === 'ONLINE') {
        import('./services/socketService').then(({ socketService }) => {
           if (socketService.playerId === socketService.room?.hostId) {
              socketService.socket?.emit('returnToLobby');
           }
        });
        return 'ONLINE_LOBBY';
      } else {
        return 'MENU';
      }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-neon-text font-sans selection:bg-accent-cyan/30 flex flex-col relative">
      
      {/* Global Volume Control */}
      {gameState !== 'SHOP' && gameState !== 'GARAGE' && gameState !== 'ENHANCEMENT' && (
        <div className="fixed top-4 right-4 z-[999] flex items-center gap-2 bg-black/50 p-1.5 sm:p-2 rounded-lg border border-white/10 backdrop-blur-md">
          <button 
            onClick={() => { setIsMuted(!isMuted); audioService.init(); }}
            className="text-zinc-400 hover:text-white transition-colors flex items-center justify-center w-6 h-6 sm:w-auto sm:h-auto"
          >
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => { 
              setVolume(parseFloat(e.target.value)); 
              if (isMuted) setIsMuted(false); 
              audioService.init(); 
            }}
            className="w-20 md:w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent-cyan disabled:opacity-50"
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {gameState === 'MENU' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-[100dvh] overflow-hidden"
          >
            {/* Header */}
            <header className="px-4 md:px-[60px] pt-[20px] pb-[10px] flex justify-between items-end border-bottom border-neon-border">
              <div>
                <h1 className="m-0 text-[32px] md:text-[48px] uppercase tracking-[4px] neon-text-cyan font-black italic leading-none">
                  跑跑赛车
                </h1>
                <span className="text-accent-magenta uppercase tracking-[2px] text-[10px] md:text-xs font-bold">PAOPAO RACING</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 pr-32 md:pr-48">
                {/* 动态玩家昵称与徽章展示 */}
                <div className="hidden md:flex items-center gap-2 bg-black/40 border border-[#00f2ff]/20 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-[#00f2ff] animate-pulse" />
                  <span className="font-mono text-[10px] md:text-xs text-[#00f2ff] font-bold">
                    {playerData.profile.nickname}
                  </span>
                  <div className="bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055]/30 text-[8px] px-1.5 py-0.5 rounded font-black italic">
                    Lv.1
                  </div>
                </div>

                <button
                  onClick={() => setShowPlayerInfo(true)}
                  className="text-accent-cyan hover:text-white transition-colors text-xs sm:text-sm underline underline-offset-4 font-bold cursor-pointer"
                >
                  我的信息
                </button>

                <button
                  onClick={() => {
                    setLeaderboardTrackId(settings.trackId);
                    setLeaderboardLapCount(settings.laps);
                    setShowLeaderboard(true);
                  }}
                  className="text-accent-yellow hover:text-white transition-colors text-xs sm:text-sm underline underline-offset-4 font-bold cursor-pointer"
                >
                  排行榜
                </button>
                <button
                  onClick={() => setShowInstructions(true)}
                  className="text-zinc-400 hover:text-white transition-colors text-xs sm:text-sm underline underline-offset-4 font-bold cursor-pointer"
                >
                  玩法说明
                </button>
                <button
                  onClick={handleLogout}
                  className="text-red-400 hover:text-red-300 transition-colors text-xs sm:text-sm underline underline-offset-4 font-bold cursor-pointer"
                >
                  退出登录
                </button>
                <div className="font-mono opacity-60 text-[10px] md:text-[14px] hidden sm:block">系统版本: 3.0.0</div>
              </div>
            </header>

            {/* Main Layout */}
            <main className="flex flex-col lg:grid lg:grid-cols-[320px_1fr] gap-4 md:gap-[30px] px-4 md:px-[60px] py-[20px] flex-1 overflow-x-hidden overflow-y-auto lg:overflow-hidden">
              {/* Sidebar */}
              <div className="flex flex-col gap-[15px] sm:gap-[25px] shrink-0 overflow-y-auto lg:min-h-0 pr-1 pb-4">
                <div className="neon-panel p-[20px]">
                  <span className="text-[12px] uppercase tracking-[2px] text-accent-magenta mb-[15px] block font-bold">模式选择</span>
                  <div className="flex gap-[10px]">
                    <button 
                      onClick={() => setSettings(s => ({ ...s, mode: 'SINGLE', aiRosterSeeds: generateAiRosterSeeds(s.aiCount, s.aiDifficulty) }))}
                      className={`flex-1 p-[10px] text-center cursor-pointer rounded-[4px] text-[14px] transition-all ${
                        settings.mode === 'SINGLE' 
                        ? 'bg-accent-cyan text-black font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)] border-accent-cyan' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      单人模式
                    </button>
                    <button 
                      onClick={() => setSettings(s => {
                        const nextIsTeam = true;
                        let nextCupNum = s.cupNumTracks || 3;
                        if (nextCupNum % 2 === 0) nextCupNum += 1;
                        return { ...s, mode: 'TEAM', cupNumTracks: nextCupNum };
                      })}
                      className={`flex-1 p-[10px] text-center cursor-pointer rounded-[4px] text-[14px] transition-all ${
                        (settings.mode === 'TEAM' || settings.isTeamMode) 
                        ? 'bg-accent-cyan text-black font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)] border-accent-cyan' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      组队对抗
                    </button>
                    <button 
                      onClick={() => setSettings(s => ({ ...s, mode: 'ONLINE' }))}
                      className={`flex-1 p-[10px] text-center cursor-pointer rounded-[4px] text-[14px] transition-all ${
                        settings.mode === 'ONLINE' 
                        ? 'bg-accent-cyan text-black font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)] border-accent-cyan' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      在线对战
                    </button>
                  </div>
                </div>

                <div className="neon-panel p-[20px]">
                  {settings.mode === 'ONLINE' ? (
                    <OnlineRoomsPreview />
                  ) : settings.mode !== 'TEAM' ? (
                    <>
                      <span className="text-[12px] uppercase tracking-[2px] text-accent-magenta mb-[15px] block font-bold">AI 对手设置</span>
                      
                      <div className="flex justify-between mb-[5px] text-[13px]">
                        <span>AI 数量</span>
                        <span className="text-accent-cyan">{settings.aiCount}位</span>
                      </div>
                      <div className="flex gap-[5px] mb-[20px] flex-wrap">
                        {Array.from({length: settings.mode === 'SINGLE' ? 6 : 5}).map((_, count) => (
                          <button 
                            key={count}
                            onClick={() => setSettings(s => ({ ...s, aiCount: count, aiRosterSeeds: generateAiRosterSeeds(count, s.aiDifficulty) }))}
                            className={`flex-1 min-w-[30px] p-[5px] text-center cursor-pointer rounded-[4px] text-[14px] transition-all ${
                              settings.aiCount === count 
                              ? 'bg-accent-cyan text-black font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)] border-accent-cyan' 
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex justify-between mb-[5px] text-[13px]">
                        <span>比赛圈数</span>
                        <span className="text-accent-cyan">{settings.laps}圈</span>
                      </div>
                      <div className="flex gap-[5px] mb-[20px] flex-wrap">
                        {Array.from({length: 5}).map((_, count) => (
                          <button 
                            key={count + 1}
                            onClick={() => setSettings(s => ({ ...s, laps: count + 1 }))}
                            className={`flex-1 min-w-[30px] p-[5px] text-center cursor-pointer rounded-[4px] text-[14px] transition-all ${
                              settings.laps === count + 1
                              ? 'bg-accent-cyan text-black font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)] border-accent-cyan' 
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {count + 1}
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-between mb-[5px] text-[13px] items-center">
                        <div className="flex flex-col">
                          <span>AI 难度</span>
                          <span className="text-accent-magenta text-[10px]">
                            {settings.aiDifficulty === 1 && '入门级'}
                            {settings.aiDifficulty === 2 && '进阶级'}
                            {settings.aiDifficulty === 3 && '专家级'}
                            {settings.aiDifficulty === 4 && '专业级'}
                            {settings.aiDifficulty === 5 && '精英赛'} (LV {settings.aiDifficulty})
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setSettings(s => ({ ...s, aiRosterSeeds: generateAiRosterSeeds(s.aiCount, s.aiDifficulty) }))}
                            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors text-[11px]"
                          >
                            随机车手
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex gap-[5px] mt-[10px]">
                        {[1, 2, 3, 4, 5].map(level => (
                          <button
                            key={level}
                            onClick={() => setSettings(s => ({ ...s, aiDifficulty: level as AIDifficulty, aiRosterSeeds: generateAiRosterSeeds(s.aiCount, level as AIDifficulty) }))}
                            className={`h-[6px] flex-1 rounded-[2px] transition-all ${
                              settings.aiDifficulty >= level 
                                ? (level === 5 ? 'bg-accent-yellow shadow-[0_0_8px_rgba(255,255,0,0.6)]' : 'bg-accent-magenta shadow-[0_0_8px_rgba(255,0,234,0.6)]')
                                : 'bg-white/10 hover:bg-white/20'
                            }`}
                          />
                        ))}
                      </div>

                      {settings.aiCount > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-left">
                          <div className="text-zinc-500 mb-2 font-bold">参赛名单预览:</div>
                          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                            {settings.aiRosterSeeds.map((seed: any, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white/5 p-1.5 rounded">
                                <span className="font-bold flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: seed.pColor }}></span>
                                  {seed.name || `AI ${idx+1}`}
                                </span>
                                <span className="opacity-70 text-[10px] text-right">
                                  {seed.randomBaseVehicle?.name}
                                  {seed.randomEngine ? ` + ${seed.randomEngine.name.split(' ')[0]}` : ''}
                                  {seed.randomTire ? ` + 胎` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-[15px]">
                         <span className="text-[12px] uppercase tracking-[2px] text-accent-magenta font-bold">队伍配置</span>
                         <div className="flex gap-[5px] text-[12px]">
                           <button 
                             onClick={() => setSettings(s => ({ ...s, teamSize: 2, teamRoster: generateTeamRoster(2, s.aiDifficulty) }))}
                             className={`px-2 py-1 rounded transition-colors ${settings.teamSize === 2 ? 'bg-accent-cyan text-black font-bold' : 'bg-white/10 hover:bg-white/20'}`}
                           >
                             2v2
                           </button>
                           <button 
                             onClick={() => setSettings(s => ({ ...s, teamSize: 3, teamRoster: generateTeamRoster(3, s.aiDifficulty) }))}
                             className={`px-2 py-1 rounded transition-colors ${settings.teamSize === 3 ? 'bg-accent-cyan text-black font-bold' : 'bg-white/10 hover:bg-white/20'}`}
                           >
                             3v3
                           </button>
                           <button 
                             onClick={() => setSettings(s => ({ ...s, teamRoster: generateTeamRoster(s.teamSize, s.aiDifficulty) }))}
                             className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded ml-2"
                           >
                             随机阵容
                           </button>
                         </div>
                      </div>
                      
                      <div className="flex justify-between mb-[5px] text-[13px]">
                        <span>比赛圈数</span>
                        <span className="text-accent-cyan">{settings.laps}圈</span>
                      </div>
                      <div className="flex gap-[5px] mb-[20px] flex-wrap">
                        {Array.from({length: 5}).map((_, count) => (
                          <button 
                            key={count + 1}
                            onClick={() => setSettings(s => ({ ...s, laps: count + 1 }))}
                            className={`flex-1 min-w-[30px] p-[5px] text-center cursor-pointer rounded-[4px] text-[14px] transition-all ${
                              settings.laps === count + 1
                              ? 'bg-accent-cyan text-black font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)] border-accent-cyan' 
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {count + 1}
                          </button>
                        ))}
                      </div>

                        <div className="flex justify-between mb-[5px] text-[13px] items-center">
                          <div className="flex flex-col">
                            <span>AI 难度 (影响队友及对手)</span>
                            <span className="text-accent-magenta text-[10px]">
                              {settings.aiDifficulty === 1 && '入门级'}
                              {settings.aiDifficulty === 2 && '进阶级'}
                              {settings.aiDifficulty === 3 && '专家级'}
                              {settings.aiDifficulty === 4 && '专业级'}
                              {settings.aiDifficulty === 5 && '精英赛'} (LV {settings.aiDifficulty})
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-[5px] mt-[10px] mb-[20px]">
                          {[1, 2, 3, 4, 5].map(level => (
                            <button
                              key={level}
                              onClick={() => setSettings(s => ({ ...s, aiDifficulty: level as AIDifficulty, teamRoster: generateTeamRoster(s.teamSize, level as AIDifficulty) }))}
                              className={`h-[6px] flex-1 rounded-[2px] transition-all ${
                                settings.aiDifficulty >= level 
                                  ? (level === 5 ? 'bg-accent-yellow shadow-[0_0_8px_rgba(255,255,0,0.6)]' : 'bg-accent-magenta shadow-[0_0_8px_rgba(255,0,234,0.6)]')
                                  : 'bg-white/10 hover:bg-white/20'
                              }`}
                            />
                          ))}
                        </div>

                      <div className="mt-4 pt-4 border-t border-white/10 space-y-4 text-xs font-mono">
                        <div>
                           <div className="text-[#ff0055] font-bold mb-2 border-b border-[#ff0055]/30 pb-1 text-xs">红队 (玩家阵营)</div>
                           <div className="text-[11px] text-white/80 space-y-1">
                              <div className="flex justify-between items-center bg-white/5 p-1 rounded">
                                <span>- 玩家 1 (你)</span>
                              </div>
                                {settings.teamRoster?.filter(r => r.team === 'RED').map((r, idx) => {
                                 const v = VEHICLES_DB.find(v => v.id === r.vehicleId);
                                 const e = ITEMS_DB.find(i => i.id === r.engineId);
                                 const t = ITEMS_DB.find(i => i.id === r.tiresId);
                                 return (
                                   <div key={r.id} className="flex justify-between items-center bg-white/5 p-1 rounded">
                                     <span>- {r.name}</span>
                                     <span className="opacity-70 text-[10px] text-right">
                                      {v?.name} 
                                      {e ? ` + ${e.name.split(' ')[0]}` : ''}
                                      {t ? ` + 胎` : ''}
                                     </span>
                                   </div>
                                 );
                               })}
                           </div>
                        </div>
                        <div>
                           <div className="text-accent-cyan font-bold mb-2 border-b border-accent-cyan/30 pb-1 text-xs">蓝队 (对手阵营)</div>
                           <div className="text-[11px] text-white/80 space-y-1">
                               {settings.teamRoster?.filter(r => r.team === 'BLUE').map((r, idx) => {
                                 const v = VEHICLES_DB.find(v => v.id === r.vehicleId);
                                 const e = ITEMS_DB.find(i => i.id === r.engineId);
                                 const t = ITEMS_DB.find(i => i.id === r.tiresId);
                                 return (
                                   <div key={r.id} className="flex justify-between items-center bg-white/5 p-1 rounded">
                                     <span>- {r.name}</span>
                                     <span className="opacity-70 text-[10px] text-right">
                                      {v?.name} 
                                      {e ? ` + ${e.name.split(' ')[0]}` : ''}
                                      {t ? ` + 胎` : ''}
                                     </span>
                                   </div>
                                 );
                               })}
                           </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="neon-panel p-[20px]">
                  <span className="text-[12px] uppercase tracking-[2px] text-accent-magenta mb-[15px] block font-bold">操作提示</span>
                  <div className="text-[13px] leading-[1.8] text-zinc-400">
                    <strong className="text-accent-cyan">玩家 1:</strong><br />
                    ↑ : 加速 | ↓ : 刹车<br />
                    ← / → : 转向<br />
                    Shift : 漂移
                    {settings.mode === 'DOUBLE' && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <strong className="text-accent-magenta">玩家 2:</strong><br />
                        W : 加速 | S : 刹车<br />
                        A / D : 转向<br />
                        Space : 漂移
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              {settings.mode !== 'ONLINE' && (
                <div className="flex flex-col overflow-visible lg:overflow-hidden shrink-0 min-h-[300px] lg:min-h-0 border-t border-white/10 lg:border-t-0 pt-4 lg:pt-0">
                <div className="flex justify-between items-center mb-[15px] shrink-0 flex-wrap gap-2">
                  <span className="text-[12px] uppercase tracking-[2px] text-accent-magenta font-bold">
                    {settings.isCupMode ? '杯赛配置' : '选择赛道 (预计 1-2 分钟)'}
                  </span>
                  
                  <button 
                    onClick={() => setSettings(s => ({ ...s, isCupMode: !s.isCupMode, trackId: TRACKS[0].id }))}
                    className={`px-3 py-1.5 rounded transition-colors text-[12px] font-bold ${settings.isCupMode ? 'bg-accent-yellow text-black shadow-[0_0_10px_rgba(244,255,64,0.5)]' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    {settings.isCupMode ? '杯赛模式：已开启' : '杯赛模式：已关闭'}
                  </button>
                </div>

                {settings.isCupMode ? (
                  <div className="bg-black/40 border border-accent-yellow/30 p-6 rounded-lg text-center h-full flex flex-col justify-center">
                    <Trophy className="w-16 h-16 text-accent-yellow mx-auto mb-4" />
                    <h3 className="text-xl font-black text-accent-yellow mb-2">杯赛模式</h3>
                    <p className="text-sm text-zinc-400 mb-6">随机抽取多张赛道进行连续较量，最终决出胜负！可以获得更多奖励！</p>
                    
                    <div className="mb-4">
                      <div className="text-zinc-500 text-sm mb-2">选择比赛场数 (场)</div>
                      <div className="flex gap-2 justify-center items-center">
                        <button 
                          onClick={() => {
                             let next = Math.max((settings.mode === 'TEAM' || settings.isTeamMode) ? 3 : 2, (settings.cupNumTracks || ((settings.mode === 'TEAM' || settings.isTeamMode) ? 3 : 4)) - 1);
                             if ((settings.mode === 'TEAM' || settings.isTeamMode) && next % 2 === 0) next = Math.max(3, next - 1);
                             setSettings(s => ({ ...s, cupNumTracks: next }));
                          }}
                          className="w-10 h-10 bg-white/5 border border-white/10 text-white rounded hover:bg-white/10 font-black text-xl flex items-center justify-center transition-colors"
                        >
                          -
                        </button>
                        <input 
                           type="number"
                           min={(settings.mode === 'TEAM' || settings.isTeamMode) ? 3 : 2}
                           step={(settings.mode === 'TEAM' || settings.isTeamMode) ? 2 : 1}
                           max={TRACKS.length}
                           value={settings.cupNumTracks || ((settings.mode === 'TEAM' || settings.isTeamMode) ? 3 : 4)}
                           onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                 let next = Math.max((settings.mode === 'TEAM' || settings.isTeamMode) ? 3 : 2, Math.min(TRACKS.length, val));
                                 if ((settings.mode === 'TEAM' || settings.isTeamMode) && next % 2 === 0) next += 1;
                                 setSettings(s => ({ ...s, cupNumTracks: Math.min(TRACKS.length, next) }));
                              }
                           }}
                           className="bg-black/60 border border-accent-yellow/50 text-accent-yellow font-mono text-2xl font-black text-center rounded px-2 w-20 h-12 outline-none focus:border-accent-yellow focus:shadow-[0_0_10px_rgba(244,255,64,0.3)] transition-all"
                        />
                        <button 
                          onClick={() => {
                             let next = Math.min(TRACKS.length, (settings.cupNumTracks || ((settings.mode === 'TEAM' || settings.isTeamMode) ? 3 : 4)) + 1);
                             if ((settings.mode === 'TEAM' || settings.isTeamMode) && next % 2 === 0) next = Math.min(TRACKS.length, next + 1);
                             // Need to handle if TRACKS.length is even and we hit it.
                             if ((settings.mode === 'TEAM' || settings.isTeamMode) && next % 2 === 0) next -= 1; 
                             setSettings(s => ({ ...s, cupNumTracks: next }));
                          }}
                          className="w-10 h-10 bg-white/5 border border-white/10 text-white rounded hover:bg-white/10 font-black text-xl flex items-center justify-center transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col h-[600px] overflow-hidden">
                    <TrackSelector 
                      selectedTrackId={settings.trackId || TRACKS[0].id}
                      onSelect={(id) => setSettings(s => ({ ...s, trackId: id }))}
                      onViewLeaderboard={(id) => {
                        setLeaderboardTrackId(id);
                        setLeaderboardLapCount(settings.laps || TRACKS.find(t=>t.id===id)?.laps || 3);
                        setShowLeaderboard(true);
                      }}
                    />
                  </div>
                )}
              </div>
              )}
            </main>

            {/* Footer */}
            <footer className="h-auto py-4 md:h-[80px] bg-gradient-to-t from-accent-cyan/10 to-transparent flex flex-col md:flex-row items-center justify-between px-4 md:px-[60px] gap-4 relative shrink-0">
              <div className="text-[12px] text-zinc-500 max-w-full md:max-w-[400px] leading-[1.5] border-l-2 border-accent-magenta pl-[15px]">
                <strong>驾驶警告：</strong>由于赛道抓地力限制，转弯速度过快将导致赛车撞击赛道边缘。物理碰撞会产生剧烈摩擦并大幅降低车速。
              </div>
              <div className="flex w-full md:w-auto gap-4 flex-wrap md:flex-nowrap">
                <button 
                  onClick={() => setGameState('GARAGE')}
                  className="flex-1 md:flex-none border border-accent-cyan/50 text-accent-cyan px-4 md:px-[20px] py-[12px] text-[14px] font-bold uppercase rounded-[4px] cursor-pointer transition-all hover:bg-accent-cyan hover:text-black"
                >
                  我的车库
                </button>
                <button 
                  onClick={() => setGameState('ENHANCEMENT')}
                  className="flex-1 md:flex-none border border-[#f4ff40]/50 text-[#f4ff40] px-4 md:px-[20px] py-[12px] text-[14px] font-bold uppercase rounded-[4px] cursor-pointer transition-all hover:bg-[#f4ff40] hover:text-black"
                >
                  强化工坊
                </button>
                <button 
                  onClick={() => setGameState('SHOP')}
                  className="flex-1 md:flex-none bg-accent-magenta/20 text-accent-magenta border border-accent-magenta px-4 md:px-[20px] py-[12px] text-[14px] font-bold uppercase rounded-[4px] cursor-pointer transition-all hover:bg-accent-magenta/40"
                >
                  商店 ({playerData.wallet.coins} ⟁)
                </button>
                {playerData.profile.role === 'admin' && (
                  <button 
                    onClick={() => setShowGMConsole(true)}
                    className="flex-1 md:flex-none bg-red-500/20 text-red-500 border border-red-500 px-4 md:px-[20px] py-[12px] text-[14px] font-bold uppercase rounded-[4px] cursor-pointer transition-all hover:bg-red-500 hover:text-black shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  >
                    GM 控制台
                  </button>
                )}
                <button 
                  onClick={() => handleStartGame(false)}
                  className="w-full md:w-auto bg-accent-yellow text-black px-4 md:px-[40px] py-[12px] text-[16px] md:text-[20px] font-black uppercase rounded-[4px] cursor-pointer shadow-[0_0_30px_rgba(244,255,64,0.5)] transition-all transform hover:scale-105 active:scale-95"
                >
                  {settings.mode === 'ONLINE' ? '加入/创建房间' : '进入比赛'}
                </button>
              </div>
            </footer>
          </motion.div>
        )}

        {gameState === 'LOGIN' && <AuthUI setGarage={setPlayerData} onLoginSuccess={() => setGameState('MENU')} />}
        {gameState === 'SHOP' && <ShopUI garage={playerData} setGarage={setPlayerData} onClose={() => setGameState('MENU')} />}
        {gameState === 'GARAGE' && <GarageUI garage={playerData} setGarage={setPlayerData} onClose={() => setGameState('MENU')} />}
        {gameState === 'ENHANCEMENT' && <EnhancementUI garage={playerData} setGarage={setPlayerData} onClose={() => setGameState('MENU')} />}

        {gameState === 'ONLINE_MENU' && <OnlineMenu initialName={playerData.profile.nickname} onBack={() => setGameState('MENU')} onStartLobby={() => setGameState('ONLINE_LOBBY')} />}
        {gameState === 'ONLINE_LOBBY' && <OnlineLobby 
          activeCarId={playerData.profile.activeCarId} 
          coins={playerData.wallet.coins} 
          garage={playerData.garage} 
          onUpdateActiveCar={(carId, color, liveryId) => {
            const token = localStorage.getItem('neon_token');
            if (token) {
              fetch('/api/player/setActiveCar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ carId })
              }).catch(() => {});
              
              // 补充调用保存涂装/颜色配置接口
              fetch('/api/shop/equipLivery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ carId, liveryId: liveryId || color })
              }).catch(() => {});
            }
            setPlayerData(p => {
              const newGarage = [...p.garage];
              const targetIdx = newGarage.findIndex(v => v.carId === carId);
              if (targetIdx !== -1) {
                newGarage[targetIdx] = { ...newGarage[targetIdx], equippedPaint: liveryId || color };
              }
              return { ...p, profile: { ...p.profile, activeCarId: carId }, garage: newGarage };
            });
          }}
          onBack={() => {
          import('./services/socketService').then(({ socketService }) => {
            socketService.socket?.emit('leaveRoom');
          });
          setGameState('MENU');
        }} onStartGame={() => handleStartGame(true)} onViewLeaderboard={(id) => {
             setLeaderboardTrackId(id);
             setLeaderboardLapCount(settings.laps || TRACKS.find(t=>t.id===id)?.laps || 3);
             setLeaderboardType('ONLINE');
             setShowLeaderboard(true);
        }} />}

        {gameState === 'PLAYING' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-[100dvh]"
          >
            <GameCanvas 
              settings={settings} 
              garage={playerData}
              cupState={cupState}
              scores={scores}
              onFinish={handleFinish} 
              onExit={() => handleExit(false)} 
            />
          </motion.div>
        )}

        {gameState === 'CUP_STANDINGS' && cupState && (
          <motion.div
            key="cup-standings"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[100dvh]"
          >
            <div className="neon-panel w-full max-w-3xl p-8 text-center relative max-h-[90vh] flex flex-col">
              <Trophy className="w-16 h-16 text-accent-yellow mx-auto mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(244,255,64,0.5)] shrink-0" />
              <h2 className="text-4xl md:text-5xl font-black italic neon-text-cyan mb-2 shrink-0">杯赛积分榜</h2>
              <p className="text-zinc-500 mb-6 uppercase tracking-widest shrink-0">
                {cupState.finished ? '杯赛结束！最终排名' : `进度: ${cupState.currentRaceIndex} / ${cupState.tracks.length}`}
              </p>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 mb-6">
                {(settings.mode === 'TEAM' || settings.isTeamMode) ? (() => {
                  const redScore = cupState.teamWins?.RED || 0;
                  const blueScore = cupState.teamWins?.BLUE || 0;
                  
                  return (
                    <div className="flex gap-8 justify-center items-center py-8">
                       <div className={`p-6 rounded-lg ${redScore >= blueScore ? 'bg-red-500/20 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-110' : 'bg-black/40 border border-white/10'} transition-all flex flex-col items-center`}>
                          <div className="text-red-400 font-black text-2xl mb-2">红队胜局</div>
                          <div className="text-white font-mono text-5xl font-black">{redScore}</div>
                       </div>
                       <div className="text-4xl text-white/30 font-black italic">VS</div>
                       <div className={`p-6 rounded-lg ${blueScore > redScore ? 'bg-blue-500/20 border-2 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)] scale-110' : 'bg-black/40 border border-white/10'} transition-all flex flex-col items-center`}>
                          <div className="text-blue-400 font-black text-2xl mb-2">蓝队胜局</div>
                          <div className="text-white font-mono text-5xl font-black">{blueScore}</div>
                       </div>
                    </div>
                  );
                })() : (() => {
                   // Calculate ranking
                   const entries = Object.keys(scores).map(id => {
                     let name = id;
                     if (id === 'p1') name = '玩家 1';
                     else if (id === 'p2') name = '玩家 2';
                     else {
                        const ai = settings.teamRoster?.find(r => r.id === id);
                        if (ai) name = ai.name;
                        else if (id.startsWith('ai')) {
                           const idx = parseInt(id.replace('ai', ''));
                           const seed = settings.aiRosterSeeds[idx] as any;
                           if (seed && seed.name) name = seed.name;
                        }
                     }
                     return { id, name, score: scores[id] };
                   }).sort((a, b) => b.score - a.score);
                   
                   // If no scores yet, show starting roster
                   if (entries.length === 0) {
                      return (
                         <div className="text-zinc-500 italic py-8">即将开始第一场比赛，尚未产生积分...</div>
                      );
                   }

                   return entries.map((entry, idx) => (
                     <div key={entry.id} className={`flex justify-between items-center p-4 rounded-lg border ${idx === 0 ? 'bg-accent-yellow/10 border-accent-yellow/50 shadow-[0_0_15px_rgba(244,255,64,0.3)]' : 'bg-black/40 border-white/10'}`}>
                        <div className="flex items-center gap-4">
                           <div className={`font-black italic text-xl w-8 ${idx === 0 ? 'text-accent-yellow' : 'text-zinc-500'}`}>#{idx + 1}</div>
                           <div className={`font-bold ${entry.id === 'p1' || entry.id === 'p2' ? 'text-accent-cyan' : 'text-white/80'}`}>{entry.name}</div>
                        </div>
                        <div className="font-mono text-xl text-accent-yellow">{entry.score} 分</div>
                     </div>
                   ));
                })()}
              </div>

              {cupState.finished && (() => {
                 let isWin = false;
                 let reward = 0;
                 let isPodium = false;
                 let isTeamMVP = false;
                 
                 const diffMult = GAME_CONSTANTS.DIFFICULTY_MULTIPLIER[settings.aiDifficulty] || 1.0;
                 const tracks = settings.cupNumTracks || ((settings.mode === 'TEAM' || settings.isTeamMode) ? 3 : 4);

                 if ((settings.mode === 'TEAM' || settings.isTeamMode)) {
                    isWin = (cupState.teamWins?.RED || 0) > (cupState.teamWins?.BLUE || 0);
                    if (isWin) {
                       reward += tracks * GAME_CONSTANTS.BONUS.CUP_FINISH_MULTIPLIER;
                       const entries = Object.keys(scores).map(id => ({ id, score: scores[id] })).sort((a,b) => b.score - a.score);
                       const redEntries = entries.filter(e => e.id.includes('p') || e.id.includes('ONLINE')); // wait we don't store team per id in scores easily, but local player is team RED.
                       // Assume p1 is always RED and potential team MVP
                       const isLocal = (id: string) => settings.mode === 'ONLINE' ? id === socketService.playerId : (id === 'p1');
                       if (entries.length > 0 && isLocal(entries[0].id)) {
                          isTeamMVP = true;
                          reward += tracks * 10;
                       }
                    }
                 } else {
                    const entries = Object.keys(scores).map(id => ({ id, score: scores[id] })).sort((a,b) => b.score - a.score);
                    const isLocal = (id: string) => settings.mode === 'ONLINE' ? id === socketService.playerId : (id === 'p1');
                    const rank = entries.findIndex(e => isLocal(e.id));
                    if (rank === 0) {
                        isWin = true;
                        reward = tracks * 20; // Used to be * 20 here! Wait, this is `reward = tracks * 20`. Let's just do an inline fix
                    } else if (rank === 1 || rank === 2) {
                        isPodium = true;
                        reward = tracks * GAME_CONSTANTS.BONUS.CUP_FINISH_MULTIPLIER; // Wait, actually `tracks * 10`. I'll leave this edit chunk for now to see what was exactly here
                    }
                 }

                 return (
                   <div className={`border p-4 rounded-lg mb-6 animate-pulse ${isWin ? 'bg-accent-yellow/10 border-accent-yellow/50 shadow-[0_0_20px_rgba(244,255,64,0.3)]' : 'bg-white/5 border-white/20'}`}>
                      <p className={`font-black text-xl mb-2 ${isWin ? 'text-accent-yellow' : 'text-zinc-400'}`}>
                         {isWin ? '🏆 恭喜获得杯赛冠军！ 🏆' : isPodium ? '🥈 恭喜登上领奖台！' : '😔 遗憾错失前列 😔'}
                      </p>
                      <p className={`font-bold text-lg ${isWin || isPodium ? 'text-accent-yellow' : 'text-zinc-500'}`}>
                         获得杯赛结算金币 {Math.floor(reward)} ⟁ {isTeamMVP && '(含MVP奖励)'}
                      </p>
                   </div>
                 );
              })()}

              <div className="flex gap-4 shrink-0">
                {cupState.finished ? (
                   <button 
                     onClick={() => {
                       const token = localStorage.getItem('neon_token');
                       if (token) {
                         fetch('/api/economy/settleCup', {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                         })
                         .then(res => res.json())
                         .then(data => {
                           if (data.success && data.coins !== undefined) {
                             setPlayerData(p => ({ ...p, wallet: { ...p.wallet, coins: data.coins } }));
                           }
                         })
                         .catch(() => {});
                       }
                       
                       setCupState(null);
                       setScores({});
                       setTeamScore(null);
                       setGameState('MENU');
                     }}
                     className="flex-1 px-8 py-4 bg-accent-yellow text-black font-black uppercase rounded-lg shadow-[0_0_30px_rgba(244,255,64,0.5)] transform hover:scale-105 transition-all text-xl"
                   >
                     领取奖励并返回首页
                   </button>
                ) : (
                   <>
                     <button 
                       onClick={() => {
                         setCupState(null);
                         setScores({});
                         setGameState('MENU');
                       }}
                       className="flex-1 px-8 py-4 bg-white/5 text-white font-bold uppercase rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                     >
                       放弃并返回
                     </button>
                     <button 
                       onClick={() => handleStartGame(false)}
                       className="flex-1 px-8 py-4 bg-accent-cyan text-black font-black uppercase rounded-lg shadow-[0_0_30px_rgba(0,242,255,0.4)] transform hover:scale-105 transition-all text-left flex flex-col justify-center"
                     >
                       <span className="text-xs opacity-70 mb-1">下一场: {TRACKS.find(t => t.id === cupState.tracks[cupState.currentRaceIndex])?.name}</span>
                       <span className="text-lg">进入比赛</span>
                     </button>
                   </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'RESULT' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[100dvh]"
          >
            <div className="neon-panel w-full max-w-2xl p-8 text-center relative">
              <Trophy className="w-16 h-16 text-accent-yellow mx-auto mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(244,255,64,0.5)]" />
              <h2 className="text-5xl font-black italic neon-text-cyan mb-2">比赛结果</h2>
              <p className="text-zinc-500 mb-8 uppercase tracking-widest">{TRACKS.find(t => t.id === settings.trackId)?.name} 的最终排名</p>
              
              {flawlessVictoryMessage && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mb-6 p-4 rounded-xl bg-accent-magenta/10 border-2 border-accent-magenta shadow-[0_0_30px_rgba(255,0,234,0.3)] relative overflow-hidden"
                >
                  <p className="text-xl md:text-2xl font-black text-accent-magenta uppercase italic tracking-wider">
                    {flawlessVictoryMessage}
                  </p>
                </motion.div>
              )}

              {newRecordInfo && (
                <motion.div 
                  initial={{ scale: 0.5, y: -50, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.6, duration: 1 }}
                  className="mb-8 p-6 rounded-xl bg-black/80 border-4 border-accent-yellow shadow-[0_0_50px_rgba(244,255,64,0.6)] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-accent-yellow/20 animate-pulse pointer-events-none" />
                  <div className="relative z-10">
                    <p className="text-2xl md:text-4xl font-black text-accent-yellow uppercase italic tracking-tighter drop-shadow-[0_0_10px_rgba(244,255,64,1)] mb-2">
                       🎉 新赛道记录！ 🎉
                    </p>
                    <div className="flex items-center justify-center gap-6 mt-4">
                       <div className="text-zinc-400">
                          <div className="text-[10px] uppercase font-bold tracking-widest mb-1">旧记录</div>
                          <div className="text-xl font-mono">{newRecordInfo.oldTime === Infinity ? '--' : (newRecordInfo.oldTime / 1000).toFixed(2)}s</div>
                       </div>
                       <div className="text-accent-yellow scale-150 font-black">➔</div>
                       <div className="text-white">
                          <div className="text-[10px] uppercase font-bold tracking-widest mb-1 text-accent-cyan">新纪录</div>
                          <div className="text-3xl font-mono font-black">{(newRecordInfo.newTime / 1000).toFixed(2)}s</div>
                       </div>
                    </div>
                    {newRecordInfo.diff > 0 && (
                      <div className="mt-4 text-accent-yellow font-black text-lg animate-pulse">
                         提升了 {(newRecordInfo.diff / 1000).toFixed(2)} 秒！
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {(settings.mode === 'TEAM' || settings.isTeamMode) && teamScore && (() => {
                  const isRedWin = teamScore.RED > teamScore.BLUE || (teamScore.RED === teamScore.BLUE && results.length > 0 && results[0].team === 'RED');
                  const isBlueWin = teamScore.BLUE > teamScore.RED || (teamScore.RED === teamScore.BLUE && results.length > 0 && results[0].team === 'BLUE');
                  const isTieBreak = teamScore.RED === teamScore.BLUE;
                  return (
                <div className="flex justify-center items-start gap-8 mb-8 text-2xl font-black">
                  <div className={`flex flex-col items-center min-w-[120px] ${isRedWin ? 'text-yellow-400 scale-110' : 'text-red-400'} transition-transform`}>
                    <span className="text-sm">红队</span>
                    {teamScore.RED} 分
                    
                    <div className="flex flex-col gap-1 mt-3 text-xs font-normal opacity-80 w-full border-t border-current pt-2">
                       {results.filter(c => c.team === 'RED').map(c => {
                          const racePoints = GAME_CONSTANTS.TEAM_RACE_POINTS[results.length] || GAME_CONSTANTS.DEFAULT_TEAM_POINTS;
                          const earned = c.dnf ? 0 : (racePoints[results.findIndex(r => r.id === c.id)] || 0);
                          return (
                            <div key={c.id} className="flex justify-between w-full">
                              <span className="opacity-80 truncate max-w-[80px]">{c.name || c.id.toUpperCase()}</span>
                              <span className="font-mono">贡献 {earned} 分</span>
                            </div>
                          )
                       })}
                    </div>

                    {isRedWin && <span className="text-xs text-yellow-400 mt-2 bg-yellow-400/10 px-2 py-1 rounded">{isTieBreak ? '险胜(冠军决胜)' : '获胜'}</span>}
                  </div>
                  
                  <div className="text-white/30 text-4xl mt-4">对决</div>
                  
                  <div className={`flex flex-col items-center min-w-[120px] ${isBlueWin ? 'text-yellow-400 scale-110' : 'text-blue-400'} transition-transform`}>
                    <span className="text-sm">蓝队</span>
                    {teamScore.BLUE} 分

                    <div className="flex flex-col gap-1 mt-3 text-xs font-normal opacity-80 w-full border-t border-current pt-2">
                       {results.filter(c => c.team === 'BLUE').map(c => {
                          const racePoints = GAME_CONSTANTS.TEAM_RACE_POINTS[results.length] || GAME_CONSTANTS.DEFAULT_TEAM_POINTS;
                          const earned = c.dnf ? 0 : (racePoints[results.findIndex(r => r.id === c.id)] || 0);
                          return (
                            <div key={c.id} className="flex justify-between w-full">
                              <span className="opacity-80 truncate max-w-[80px]">{c.name || c.id.toUpperCase()}</span>
                              <span className="font-mono">贡献 {earned} 分</span>
                            </div>
                          )
                       })}
                    </div>

                    {isBlueWin && <span className="text-xs text-yellow-400 mt-2 bg-yellow-400/10 px-2 py-1 rounded">{isTieBreak ? '险胜(冠军决胜)' : '获胜'}</span>}
                  </div>
                </div>
              );
              })()}

              <div className="space-y-4 mb-8">
                {results.map((car, index) => {
                  const racePoints = GAME_CONSTANTS.TEAM_RACE_POINTS[results.length] || GAME_CONSTANTS.DEFAULT_TEAM_POINTS;
                  // the real earned points for the player
                  const earnedPts = car.dnf ? 0 : (racePoints[index] || 0);

                  const isLocalPlayer = settings.mode === 'ONLINE' ? car.id === socketService.playerId : car.id === 'p1';
                  
                  // For UI Display of purely single-match calculations:
                  const isTeamWin = teamScore && ((teamScore.RED > teamScore.BLUE && car.team === 'RED') || (teamScore.BLUE > teamScore.RED && car.team === 'BLUE'));
                  
                  let mvpId = '';
                  let maxPts = -1;
                  if (isTeamWin) {
                     results.filter(c => c.team === car.team).forEach(c => {
                        const pts = c.dnf ? 0 : (racePoints[results.findIndex(r => r.id === c.id)] || 0);
                        if (pts > maxPts) { maxPts = pts; mvpId = c.id; }
                     });
                  }
                  
                  return (
                    <div 
                      key={car.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 ${
                        isLocalPlayer 
                          ? 'bg-accent-yellow/15 border-accent-yellow shadow-[0_0_15px_rgba(244,255,64,0.3)] scale-[1.02]' 
                          : (index === 0 ? 'bg-black/60 border-accent-yellow/50' : 'bg-black/40 border-white/10')
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-black italic w-8 ${index === 0 ? 'text-accent-yellow' : 'text-zinc-600'}`}>#{index + 1}</div>
                        <div className="w-6 h-6 rounded border border-white/20 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: car.color, color: car.color }} />
                        <div className="flex flex-col items-start pr-4">
                          <div className="font-bold text-lg uppercase tracking-wider leading-none">
                             {car.name || car.id.toUpperCase()} 
                             {(settings.mode === 'TEAM' || settings.isTeamMode) && (
                               <span className={`text-[10px] ml-2 px-1 rounded ${car.team === 'RED' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                 {car.team === 'RED' ? '红队' : '蓝队'}
                               </span>
                             )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {car.vehicleName && <div className="text-[10px] text-accent-magenta border border-accent-magenta/30 bg-accent-magenta/10 px-1 rounded">{car.vehicleName}</div>}
                            {car.aiStyle && <div className="text-[10px] text-zinc-500 uppercase">{car.aiStyle}</div>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="font-mono text-xl text-accent-cyan">
                          {car.dnf ? <span className="text-red-500 text-sm">DNF</span> : `${(car.finishTime! / 1000).toFixed(2)}s`}
                        </div>
                        {isLocalPlayer && !car.dnf && (
                          <div className="font-mono text-sm text-accent-yellow bg-accent-yellow/10 px-3 py-1 rounded-full border border-accent-yellow/30 flex items-center gap-1">
                             奖励 💰 +{matchEarnedCoins}
                          </div>
                        )}
                        <div className="font-mono text-sm text-accent-magenta bg-accent-magenta/10 px-3 py-1 rounded-full border border-accent-magenta/30">
                          {(settings.mode === 'TEAM' || settings.isTeamMode) ? `贡献 ${earnedPts}` : (car.dnf ? 0 : scores[car.id])} 分
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {settings.mode === 'ONLINE' ? (
                currentOnlineTopRecord && (
                  <div className="mb-8 p-4 rounded-lg bg-black/40 border border-white/10 text-left flex justify-between items-center">
                    <div>
                      <div className="text-accent-cyan text-xs font-bold uppercase mb-1">在线本图最佳记录 ({settings.laps}圈)</div>
                      <div className="text-white font-bold">{currentOnlineTopRecord.playerName}</div>
                      <div className="text-xs text-zinc-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                        {currentOnlineTopRecord.vehicle}
                      </div>
                    </div>
                    <div className="text-2xl font-mono text-accent-yellow font-black">
                      {(currentOnlineTopRecord.time / 1000).toFixed(2)}s
                    </div>
                  </div>
                )
              ) : (
                records[`${settings.trackId}_${settings.laps}`]?.[0] && (
                  <div className="mb-8 p-4 rounded-lg bg-black/40 border border-white/10 text-left flex justify-between items-center">
                    <div>
                      <div className="text-accent-cyan text-xs font-bold uppercase mb-1">本机最佳记录 ({settings.laps}圈)</div>
                      <div className="text-white font-bold">{records[`${settings.trackId}_${settings.laps}`][0].playerName}</div>
                      <div className="text-xs text-zinc-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                        {records[`${settings.trackId}_${settings.laps}`][0].vehicle}
                      </div>
                    </div>
                    <div className="text-2xl font-mono text-accent-yellow font-black">
                      {(records[`${settings.trackId}_${settings.laps}`][0].time / 1000).toFixed(2)}s
                    </div>
                  </div>
                )
              )}

              <div className="flex gap-4">
                {settings.isCupMode && cupState ? (
                   <button 
                     onClick={() => setGameState('CUP_STANDINGS')}
                     className="w-full h-14 bg-accent-yellow text-black font-black uppercase rounded-lg shadow-[0_0_20px_rgba(244,255,64,0.4)] hover:scale-[1.02] transition-all text-xl"
                   >
                     {cupState.finished ? '查看最终杯赛结果' : '继续进行杯赛'}
                   </button>
                ) : (
                   <>
                     <button 
                       onClick={() => handleExit(true)}
                       className="flex-1 h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition-all"
                     >
                       {settings.mode === 'ONLINE' ? '返回房间' : '返回主菜单'}
                     </button>
                     {settings.mode !== 'ONLINE' && (
                       <button 
                         onClick={() => handleStartGame(false)}
                         className="flex-1 h-12 bg-accent-cyan text-black font-black uppercase rounded-lg shadow-[0_0_20px_rgba(0,242,255,0.4)] hover:scale-[1.02] transition-all"
                       >
                         重新比赛
                       </button>
                     )}
                   </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <InstructionsModal show={showInstructions} onClose={() => setShowInstructions(false)} />

      <ConfirmModal confirmAction={confirmAction} onCancel={() => setConfirmAction(null)} />

      <LeaderboardModal
        show={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        leaderboardType={leaderboardType}
        setLeaderboardType={setLeaderboardType}
        leaderboardTrackId={leaderboardTrackId}
        setLeaderboardTrackId={setLeaderboardTrackId}
        leaderboardLapCount={leaderboardLapCount}
        setLeaderboardLapCount={setLeaderboardLapCount}
        records={records}
        setRecords={setRecords}
        onlineRecords={onlineRecords}
        isFetchingOnline={isFetchingOnline}
        onExport={handleExportRecords}
        onImport={handleImportRecords}
        setConfirmAction={setConfirmAction}
      />

      {/* Player Info Modal */}
      <AnimatePresence>
        {showPlayerInfo && (
          <PlayerInfoUI 
            playerData={playerData} 
            setPlayerData={setPlayerData} 
            onClose={() => setShowPlayerInfo(false)} 
          />
        )}
      </AnimatePresence>

      {/* GM Console Modal */}
      <AnimatePresence>
        {showGMConsole && (
          <GMConsoleUI 
            playerData={playerData} 
            setPlayerData={setPlayerData} 
            onClose={() => {
              setShowGMConsole(false);
              const token = localStorage.getItem('neon_token');
              if (token) {
                fetch('/api/player/profile', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(r => r.json())
                .then(profile => {
                  if (profile.success && profile.data) setPlayerData(profile.data);
                });
              }
            }}
            onClearLeaderboard={(trackId: string, laps: number) => {
               setRecords(prev => {
                  const copy = { ...prev };
                  delete copy[`${trackId}_${laps}`];
                  delete copy[`${trackId}_${laps}_online`];
                  return copy;
               });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
