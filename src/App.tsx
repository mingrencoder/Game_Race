import React, { useState } from 'react';
import { OnlineMenu, OnlineLobby } from './components/OnlineLobby';
import PlayerInfoUI from './components/PlayerInfoUI';
import { socketService } from './services/socketService';
import { GameSettings, CarState, AIDifficulty, GameMode, PlayerData, LapRecord, AIStyle, TeamSetup } from './types';
import { TRACKS, VEHICLES_DB, ITEMS_DB, LIVERIES_DB, AI_NAMES } from './constants';
import GameCanvas from './components/GameCanvas';

const getRandomAiName = () => AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];

const generateTeamRoster = (teamSize: 2 | 3 = 3, difficulty: AIDifficulty = 2): TeamSetup[] => {
  const styles: AIStyle[] = ['OPTIMAL', 'AGGRESSIVE', 'CAUTIOUS', 'DRIFTER'];
  const roster: TeamSetup[] = [];
  
  // Create AI that fits the difficulty level roughly
  const createRandomAI = (id: string, name: string, team: 'RED' | 'BLUE'): TeamSetup => {
    let availableVehicles = VEHICLES_DB;
    if (difficulty === 5) {
      availableVehicles = VEHICLES_DB.filter(v => v.price >= 3000 || v.id === 'car_boss' || v.id === 'car_legend');
    } else {
      if (difficulty === 1) availableVehicles = VEHICLES_DB.filter(v => v.price <= 1200);
      else if (difficulty === 2) availableVehicles = VEHICLES_DB.filter(v => v.price >= 800 && v.price <= 1500);
      else if (difficulty === 3) availableVehicles = VEHICLES_DB.filter(v => v.price >= 1500 && v.price <= 3000);
      else if (difficulty === 4) availableVehicles = VEHICLES_DB.filter(v => v.price >= 2000);
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

const generateAiRosterSeeds = (count: number, difficulty: AIDifficulty) => {
  const seeds = [];
  const styles: AIStyle[] = ['OPTIMAL', 'AGGRESSIVE', 'CAUTIOUS', 'DRIFTER'];
  
  for (let i = 0; i < count; i++) {
    let availableVehicles = VEHICLES_DB;
    if (difficulty === 5) {
      availableVehicles = VEHICLES_DB.filter(v => v.price >= 3000 || v.id === 'car_boss' || v.id === 'car_legend');
    } else {
      if (difficulty === 1) availableVehicles = VEHICLES_DB.filter(v => v.price <= 1200);
      else if (difficulty === 2) availableVehicles = VEHICLES_DB.filter(v => v.price >= 800 && v.price <= 1500);
      else if (difficulty === 3) availableVehicles = VEHICLES_DB.filter(v => v.price >= 1500 && v.price <= 3000);
      else if (difficulty === 4) availableVehicles = VEHICLES_DB.filter(v => v.price >= 2000);
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
    
    // Low difficulty (normal/basic colors)
    const basicColors = ['#aaaaaa', '#888888', '#666666', '#a0522d', '#4682b4', '#556b2f', '#8fbc8f', '#bc8f8f'];
    // Intermediate difficulty
    const intermediateColors = ['#ff4500', '#1e90ff', '#32cd32', '#ffd700', '#ff8c00', '#da70d6'];
    // Advanced difficulty
    const advancedColors = ['#ff0055', '#00ffcc', '#bf00ff', '#ff00ea', '#00f2ff', '#ffea00', '#ff0033'];
    // Elite difficulty (bright neon)
    const eliteColors = ['#ff00ff', '#00ffff', '#ffff00', '#ff00aa', '#00aa00', '#ff3300', '#ccff00', '#7fff00'];

    if (difficulty === 5) {
      randomLivery = { isGradient: true, colors: [`hsl(${Math.random()*360}, 100%, 50%)`, `hsl(${Math.random()*360}, 100%, 50%)`, `hsl(${Math.random()*360}, 100%, 50%)`] };
      pColor = eliteColors[Math.floor(Math.random() * eliteColors.length)];
    } else {
      randomLivery = hasLivery ? LIVERIES_DB[Math.floor(Math.random() * LIVERIES_DB.length)] : undefined;
      let colorPool = basicColors;
      if (difficulty === 2) colorPool = intermediateColors;
      else if (difficulty === 3) colorPool = advancedColors;
      else if (difficulty >= 4) colorPool = eliteColors;
      
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
import { TrackSelector } from './components/TrackSelector';
import { Trophy, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioService } from './services/audioService';

const initialPlayerData: PlayerData = (() => {
  const savedV4 = localStorage.getItem('neon_player_v4');
  if (savedV4) return JSON.parse(savedV4);

  const savedV3 = localStorage.getItem('neon_garage_v3');
  const savedV2 = localStorage.getItem('neon_garage_v2');
  let oldData: any = null;
  if (savedV3) oldData = JSON.parse(savedV3);
  else if (savedV2) oldData = JSON.parse(savedV2);

  const newData: PlayerData = {
    profile: {
      uid: 'local_user',
      nickname: 'Local Player',
      role: 'player',
      status: 'active',
      banReason: '',
      registerTime: Date.now(),
      activeCarId: 'car_basic'
    },
    wallet: { coins: 0 },
    garage: [],
    inventory: {
      materials: { core_primary: 0, core_advanced: 0, core_legendary: 0 },
      protectors: { card_silver: 0, card_gold: 0 },
      specialItems: { rename_card: 0 },
      parts: {},
      paints: []
    }
  };

  if (oldData) {
    newData.wallet.coins = oldData.coins || 0;
    newData.profile.activeCarId = oldData.equippedVehicle || 'car_basic';
    
    if (oldData.vehicles) {
      newData.garage = Object.keys(oldData.vehicles).map(vId => {
        const oldV = oldData.vehicles[vId];
        return {
          carId: oldV.id || vId,
          level: oldV.level || 0,
          durability: oldV.durability ?? 100,
          isPermanent: !oldV.expireTimestamp,
          expireAt: oldV.expireTimestamp || null,
          equippedParts: {
            engine: oldV.equippedParts?.engine || oldData.equippedItems?.engine || null,
            tires: oldV.equippedParts?.tires || oldData.equippedItems?.tires || null,
            launch: oldV.equippedParts?.launch || oldData.equippedItems?.launch || null,
            drift: oldV.equippedParts?.drift || oldData.equippedItems?.drift || null,
            acceleration: oldV.equippedParts?.acceleration || oldData.equippedItems?.acceleration || null
          },
          equippedPaint: newData.profile.activeCarId === (oldV.id || vId) ? (oldData.equippedLivery || null) : null
        };
      });
    }

    if (oldData.inventory) {
      newData.inventory.materials.core_primary = oldData.inventory.coreT1 || 0;
      newData.inventory.materials.core_advanced = oldData.inventory.coreT2 || 0;
      newData.inventory.materials.core_legendary = oldData.inventory.coreT3 || 0;
      newData.inventory.protectors.card_silver = oldData.inventory.silverCard || 0;
      newData.inventory.protectors.card_gold = oldData.inventory.goldenCard || 0;
    }
    
    if (oldData.ownedLiveries) newData.inventory.paints = oldData.ownedLiveries;
    if (oldData.ownedItems) {
      oldData.ownedItems.forEach((itemId: string) => {
        newData.inventory.parts[itemId] = 1;
      });
    }
  }

  if (!newData.garage.find(c => c.carId === newData.profile.activeCarId)) {
    if (newData.garage.length > 0) {
      newData.profile.activeCarId = newData.garage[0].carId;
    } else {
      newData.profile.activeCarId = 'car_basic';
      newData.garage.push({
        carId: 'car_basic',
        level: 0,
        durability: 100,
        isPermanent: true,
        expireAt: null,
        equippedParts: { engine: null, tires: null, launch: null, drift: null, acceleration: null },
        equippedPaint: null
      });
    }
  }
  return newData;
})();

const OnlineRoomsPreview = () => {
  const [rooms, setRooms] = useState<any[]>([]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    import('./services/socketService').then(({ socketService }) => {
      socketService.connect();
      const fetchRooms = () => {
        socketService.getRooms((res) => {
          if (res.success) {
            setRooms(res.rooms);
          } else if (Array.isArray(res)) {
            setRooms(res);
          }
        });
      };
      fetchRooms();
      interval = setInterval(fetchRooms, 3000); // refresh every 3s
    });
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-4 text-zinc-300">
      <div className="text-center">
        <p className="text-xl font-black text-accent-cyan tracking-wider mb-2">在线对战大厅</p>
        <p className="text-sm opacity-80">当前进行中的房间总数: <span className="font-bold text-accent-yellow">{rooms.length} / 20</span></p>
      </div>
    </div>
  );
};

const calculateCoinReward = (rank: number, playerCount: number, difficulty: number, isTeamMode: boolean, isTeamWin: boolean, isFlawless: boolean, isMVP: boolean) => {
  const baseCoins = [25, 18, 15, 12, 10, 8];
  const PLAYER_COUNT_MULT: Record<number, number> = { 2: 0.6, 3: 0.8, 4: 1.0, 5: 1.1, 6: 1.2 };
  const diffMult = { 1: 0.8, 2: 1.0, 3: 1.2, 4: 1.5, 5: 1.8 }[difficulty] || 1.0;
  
  const countMult = PLAYER_COUNT_MULT[playerCount] || 1.0;
  
  if (isTeamMode) {
    if (!isTeamWin) return 0;
    
    let totalFixed = 0;
    if (isFlawless) totalFixed += 10;
    if (isMVP) totalFixed += 10;
    
    return Math.floor(20 * countMult * diffMult) + totalFixed;
  } else {
    const base = baseCoins[rank] || 0;
    return Math.floor(base * countMult * diffMult);
  }
};

export default function App() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardTrackId, setLeaderboardTrackId] = useState<string>('oval');
  const [leaderboardLapCount, setLeaderboardLapCount] = useState<number>(2);
  const [leaderboardType, setLeaderboardType] = useState<'LOCAL' | 'ONLINE'>('LOCAL');
  const [showPlayerInfo, setShowPlayerInfo] = useState(false);
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
  const [flawlessVictoryMessage, setFlawlessVictoryMessage] = useState<string | null>(null);
  const [isFlawlessResult, setIsFlawlessResult] = useState<boolean>(false);
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
    localStorage.setItem('neon_player_v4', JSON.stringify(playerData));
  }, [playerData]);

  React.useEffect(() => {
    localStorage.setItem('neon_lap_records', JSON.stringify(records));
  }, [records]);

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
                      .slice(0, 10);
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
        const cupTracksCount = currentSettings.cupNumTracks || 4;
        const entryFee = cupTracksCount * 10;
        
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
              setPlayerData(p => ({ ...p, wallet: { ...p.wallet, coins: p.wallet.coins - entryFee } }));
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

  const points = [25, 18, 15, 12, 10, 8, 6, 4];

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
    const newRecords = { ...records };
    const recordKey = settings.mode === 'ONLINE' ? `${settings.trackId}_${settings.laps}_online` : `${settings.trackId}_${settings.laps}`;
    let trackRecords = newRecords[recordKey] || [];
    let bestPreviousTime = trackRecords.length > 0 ? trackRecords[0].time : Infinity;
    let brokeRecord = false;
    
    sortedResults.forEach((car) => {
      if (!car.dnf && car.finishTime && !car.isAI) {
        // Only save human player records for leaderboard
        const playerName = settings.mode === 'ONLINE' ? car.name : (car.id === 'p1' ? '玩家 1' : '玩家 2');
        
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
    });

    if (!brokeRecord) {
       setNewRecordInfo(null);
    }

    // Sort and keep top 10
    trackRecords.sort((a, b) => a.time - b.time);
    newRecords[recordKey] = trackRecords.slice(0, 10);
    setRecords(newRecords);
    
    // Calculate points/coins
    const newScores = { ...scores };
    
    let currentRedScore = 0;
    let currentBlueScore = 0;
    let isFlawlessRed = false;
    const playerCount = sortedResults.length;
    
    const RACE_POINTS_BY_COUNT: Record<number, number[]> = {
      2: [10, 8],
      3: [10, 8, 6],
      4: [10, 8, 6, 5],
      5: [10, 8, 6, 5, 4],
      6: [10, 8, 6, 5, 4, 3],
      7: [10, 8, 6, 5, 4, 3, 2],
      8: [10, 8, 6, 5, 4, 3, 2, 1],
    };
    const racePoints = RACE_POINTS_BY_COUNT[playerCount] || [10, 8, 6, 5, 4, 3, 2, 1];

    if ((settings.mode === 'TEAM' || settings.isTeamMode)) {
      const redTeamResults = sortedResults.filter(r => r.team === 'RED');
      const totalRedMembers = redTeamResults.length;
      
      const allRedFinished = redTeamResults.every(r => !r.dnf);
      const currentTopSweep = sortedResults.slice(0, totalRedMembers).every(r => r.team === 'RED');

      if (allRedFinished && currentTopSweep) {
        isFlawlessRed = true;
      }
    }

    setIsFlawlessResult(isFlawlessRed);
    
    let redMvpId = '';
    let maxRedScore = -1;
    let totalRedRaceScore = 0;
    let totalBlueRaceScore = 0;

    sortedResults.forEach((car, index) => {
      const earned = car.dnf ? 0 : (racePoints[index] || 0);
      newScores[car.id] = (newScores[car.id] || 0) + earned;
      
      if ((settings.mode === 'TEAM' || settings.isTeamMode)) {
        if (car.team === 'RED') {
           totalRedRaceScore += earned;
           if (newScores[car.id] > maxRedScore) {
             maxRedScore = newScores[car.id];
             redMvpId = car.id;
           }
        }
        if (car.team === 'BLUE') {
           totalBlueRaceScore += earned;
        }
      }
    });
    
    currentRedScore = totalRedRaceScore;
    currentBlueScore = totalBlueRaceScore;
    let isTeamWin = false;
    if (currentRedScore > currentBlueScore) {
       isTeamWin = true;
    } else if (currentRedScore === currentBlueScore && sortedResults.length > 0 && sortedResults[0].team === 'RED') {
       isTeamWin = true;
    }

    sortedResults.forEach((car, index) => {
      const isLocalPlayer = settings.mode === 'ONLINE' ? car.id === socketService.playerId : car.id === 'p1';
      if (isLocalPlayer) {
        setPlayerData(p => {
           let newGarage = [...p.garage];
           const eqId = p.profile.activeCarId;
           const targetIdx = newGarage.findIndex(v => v.carId === eqId);
           if (targetIdx !== -1) {
              const eqDef = VEHICLES_DB.find(v => v.id === eqId) || { tier: 'T0' };
              let loss = 1;
              if (eqDef.tier === 'T0') loss = 0;
              else if (eqDef.tier === 'T1') loss = 1;
              else if (eqDef.tier === 'T2') loss = 0.8;
              else if (eqDef.tier === 'T3') loss = 0.5;
              
              newGarage[targetIdx] = {
                 ...newGarage[targetIdx],
                 durability: Math.max(0, Number((newGarage[targetIdx].durability - loss).toFixed(3)))
              };
           }
           
           if (!car.dnf) {
             const isMVP = car.id === redMvpId && isTeamWin;
             const totalCoins = calculateCoinReward(
               index,
               playerCount, 
               settings.aiDifficulty, 
               !!(settings.mode === 'TEAM' || settings.isTeamMode), 
               isTeamWin, 
               isFlawlessRed, 
               isMVP
             );
             return { ...p, wallet: { ...p.wallet, coins: p.wallet.coins + totalCoins }, garage: newGarage };
           }
           
           return { ...p, garage: newGarage };
        });
      }
    });

    setFlawlessVictoryMessage(null);
    if ((settings.mode === 'TEAM' || settings.isTeamMode)) {
      setTeamScore({ RED: currentRedScore, BLUE: currentBlueScore });
      if (isFlawlessRed) {
        setFlawlessVictoryMessage(`🔥 完胜！ 红队全员完赛并包揽前 ${sortedResults.filter(r => r.team === 'RED').length} 名！🔥 额外奖励 +50！`);
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
        if (currentRedScore > currentBlueScore) {
          newTeamWins = { ...newTeamWins, RED: newTeamWins.RED + 1 };
        } else if (currentBlueScore > currentRedScore) {
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
              bonus += cupState.tracks.length * 25;
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
                 const diffMult = { 1: 0.8, 2: 1.0, 3: 1.2, 4: 1.5, 5: 1.8 }[settings.aiDifficulty] || 1.0;
                 bonus += Math.floor(cupState.tracks.length * 15 * diffMult);
              }
           }
        } else {
           const sortedOverall = Object.entries(newScores).sort((a, b) => (b[1] as number) - (a[1] as number));
           const p1Index = sortedOverall.findIndex(s => s[0] === 'p1');
           
           if (p1Index === 0) bonus = cupState.tracks.length * 40;
           else if (p1Index === 1 || p1Index === 2) bonus = cupState.tracks.length * 15;
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

  const handleExit = () => {
    audioService.stopBGM();
    setCupState(null);
    setScores({});
    setTeamScore(null);
    setSettings(s => ({ ...s, isTeamMode: false }));
    if (settings.mode === 'ONLINE') {
      import('./services/socketService').then(({ socketService }) => {
         if (socketService.playerId === socketService.room?.hostId) {
            socketService.socket?.emit('returnToLobby');
         }
      });
      setGameState('ONLINE_LOBBY');
    } else {
      setGameState('MENU');
    }
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
                      onClick={() => setSettings(s => ({ ...s, mode: 'TEAM', cupNumTracks: s.isCupMode && s.cupNumTracks && s.cupNumTracks % 2 === 0 ? s.cupNumTracks + 1 : s.cupNumTracks }))}
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
                             let next = Math.max((settings.mode === 'TEAM' || settings.isTeamMode) ? 3 : 2, (settings.cupNumTracks || 4) - 1);
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
                             let next = Math.min(TRACKS.length, (settings.cupNumTracks || 4) + 1);
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
                {(settings.mode === 'SINGLE' || (settings.mode === 'TEAM' || settings.isTeamMode)) && (
                  <>
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
                  </>
                )}
                <button 
                  onClick={() => setGameState('SHOP')}
                  className="flex-1 md:flex-none bg-accent-magenta/20 text-accent-magenta border border-accent-magenta px-4 md:px-[20px] py-[12px] text-[14px] font-bold uppercase rounded-[4px] cursor-pointer transition-all hover:bg-accent-magenta/40"
                >
                  商店 ({playerData.wallet.coins} ⟁)
                </button>
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
        {gameState === 'ONLINE_LOBBY' && <OnlineLobby onBack={() => {
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
              onExit={handleExit} 
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
                 
                 const diffMult = { 1: 0.8, 2: 1.0, 3: 1.2, 4: 1.5, 5: 1.8 }[settings.aiDifficulty] || 1.0;
                 const tracks = settings.cupNumTracks || 4;

                 if ((settings.mode === 'TEAM' || settings.isTeamMode)) {
                    isWin = (cupState.teamWins?.RED || 0) > (cupState.teamWins?.BLUE || 0);
                    if (isWin) {
                       reward += tracks * 15;
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
                        reward = tracks * 20;
                    } else if (rank === 1 || rank === 2) {
                        isPodium = true;
                        reward = tracks * 10;
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
                       let isWin = false;
                       let reward = 0;
                       const diffMult = { 1: 0.8, 2: 1.0, 3: 1.2, 4: 1.5, 5: 1.8 }[settings.aiDifficulty] || 1.0;
                       const tracks = settings.cupNumTracks || 4;

                       if ((settings.mode === 'TEAM' || settings.isTeamMode)) {
                          isWin = (cupState.teamWins?.RED || 0) > (cupState.teamWins?.BLUE || 0);
                          if (isWin) {
                             reward += tracks * 15;
                             const entries = Object.keys(scores).map(id => ({ id, score: scores[id] })).sort((a,b) => b.score - a.score);
                             const isLocal = (id: string) => settings.mode === 'ONLINE' ? id === socketService.playerId : (id === 'p1');
                             if (entries.length > 0 && isLocal(entries[0].id)) {
                                reward += tracks * 10;
                             }
                          }
                       } else {
                          const entries = Object.keys(scores).map(id => ({ id, score: scores[id] })).sort((a,b) => b.score - a.score);
                          const isLocal = (id: string) => settings.mode === 'ONLINE' ? id === socketService.playerId : (id === 'p1');
                          const rank = entries.findIndex(e => isLocal(e.id));
                          if (rank === 0) reward = tracks * 20;
                          else if (rank === 1 || rank === 2) reward = tracks * 10;
                       }

                       setPlayerData(p => ({...p, wallet: {...p.wallet, coins: p.wallet.coins + Math.floor(reward)}}));
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

              {(settings.mode === 'TEAM' || settings.isTeamMode) && teamScore && (
                <div className="flex justify-center items-start gap-8 mb-8 text-2xl font-black">
                  <div className={`flex flex-col items-center min-w-[120px] ${teamScore.RED > teamScore.BLUE ? 'text-yellow-400 scale-110' : 'text-red-400'} transition-transform`}>
                    <span className="text-sm">红队</span>
                    {teamScore.RED} 分
                    
                    <div className="flex flex-col gap-1 mt-3 text-xs font-normal opacity-80 w-full border-t border-current pt-2">
                       {results.filter(c => c.team === 'RED').map(c => {
                          const RACE_POINTS_BY_COUNT: Record<number, number[]> = {
                            2: [10, 8], 3: [10, 8, 6], 4: [10, 8, 6, 4], 5: [10, 8, 6, 4, 2], 6: [10, 8, 6, 4, 2, 1],
                          };
                          const racePoints = RACE_POINTS_BY_COUNT[results.length] || [10, 8, 6, 4, 2, 1, 0, 0];
                          const earned = c.dnf ? 0 : (racePoints[results.findIndex(r => r.id === c.id)] || 0);
                          return (
                            <div key={c.id} className="flex justify-between w-full">
                              <span className="opacity-80 truncate max-w-[80px]">{c.name || c.id.toUpperCase()}</span>
                              <span className="font-mono">贡献 {earned} 分</span>
                            </div>
                          )
                       })}
                    </div>

                    {teamScore.RED > teamScore.BLUE && <span className="text-xs text-yellow-400 mt-2 bg-yellow-400/10 px-2 py-1 rounded">获胜 +20⟁</span>}
                  </div>
                  
                  <div className="text-white/30 text-4xl mt-4">对决</div>
                  
                  <div className={`flex flex-col items-center min-w-[120px] ${teamScore.BLUE > teamScore.RED ? 'text-yellow-400 scale-110' : 'text-blue-400'} transition-transform`}>
                    <span className="text-sm">蓝队</span>
                    {teamScore.BLUE} 分

                    <div className="flex flex-col gap-1 mt-3 text-xs font-normal opacity-80 w-full border-t border-current pt-2">
                       {results.filter(c => c.team === 'BLUE').map(c => {
                          const RACE_POINTS_BY_COUNT: Record<number, number[]> = {
                            2: [10, 8], 3: [10, 8, 6], 4: [10, 8, 6, 4], 5: [10, 8, 6, 4, 2], 6: [10, 8, 6, 4, 2, 1],
                          };
                          const racePoints = RACE_POINTS_BY_COUNT[results.length] || [10, 8, 6, 4, 2, 1, 0, 0];
                          const earned = c.dnf ? 0 : (racePoints[results.findIndex(r => r.id === c.id)] || 0);
                          return (
                            <div key={c.id} className="flex justify-between w-full">
                              <span className="opacity-80 truncate max-w-[80px]">{c.name || c.id.toUpperCase()}</span>
                              <span className="font-mono">贡献 {earned} 分</span>
                            </div>
                          )
                       })}
                    </div>

                    {teamScore.BLUE > teamScore.RED && <span className="text-xs text-yellow-400 mt-2 bg-yellow-400/10 px-2 py-1 rounded">获胜 +20⟁</span>}
                  </div>
                </div>
              )}

              <div className="space-y-4 mb-8">
                {results.map((car, index) => {
                  const RACE_POINTS_BY_COUNT: Record<number, number[]> = {
                    2: [10, 8], 3: [10, 8, 6], 4: [10, 8, 6, 4], 5: [10, 8, 6, 4, 2], 6: [10, 8, 6, 4, 2, 1],
                  };
                  const racePoints = RACE_POINTS_BY_COUNT[results.length] || [10, 8, 6, 4, 2, 1, 0, 0];
                  // the real earned points for the player
                  const earnedPts = car.dnf ? 0 : (racePoints[index] || 0);

                  const isLocalPlayer = settings.mode === 'ONLINE' ? car.id === socketService.playerId : car.id === 'p1';
                  
                  // For UI Display of purely single-match calculations:
                  let displayCoins = 0;
                  if (settings.mode !== 'ONLINE') {
                    const isTeamWin = teamScore && ((teamScore.RED > teamScore.BLUE && car.team === 'RED') || (teamScore.BLUE > teamScore.RED && car.team === 'BLUE'));
                    
                    let mvpId = '';
                    let maxPts = -1;
                    if (isTeamWin) {
                       results.filter(c => c.team === car.team).forEach(c => {
                          const pts = c.dnf ? 0 : (racePoints[results.findIndex(r => r.id === c.id)] || 0);
                          if (pts > maxPts) { maxPts = pts; mvpId = c.id; }
                       });
                    }
                    displayCoins = calculateCoinReward(
                       index,
                       results.length,
                       settings.aiDifficulty,
                       !!(settings.mode === 'TEAM' || settings.isTeamMode),
                       !!isTeamWin,
                       !!(isFlawlessResult && car.team === 'RED'),
                       car.id === mvpId
                    );
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
                        {isLocalPlayer && !car.dnf && settings.mode !== 'ONLINE' && (
                          <div className="font-mono text-sm text-accent-yellow bg-accent-yellow/10 px-3 py-1 rounded-full border border-accent-yellow/30 flex items-center gap-1">
                             奖励 💰 +{displayCoins}
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

              {records[`${settings.trackId}_${settings.laps}`]?.[0] && (
                <div className="mb-8 p-4 rounded-lg bg-black/40 border border-white/10 text-left flex justify-between items-center">
                  <div>
                    <div className="text-accent-cyan text-xs font-bold uppercase mb-1">本图最佳记录 ({settings.laps}圈)</div>
                    <div className="text-white font-bold">{records[`${settings.trackId}_${settings.laps}`][0].playerName}</div>
                    <div className="text-xs text-zinc-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                      {records[`${settings.trackId}_${settings.laps}`][0].vehicle}
                    </div>
                  </div>
                  <div className="text-2xl font-mono text-accent-yellow font-black">
                    {(records[`${settings.trackId}_${settings.laps}`][0].time / 1000).toFixed(2)}s
                  </div>
                </div>
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
                       onClick={handleExit}
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

      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="neon-panel bg-[#0a0a0a] max-w-[800px] w-full max-h-[85vh] overflow-y-auto p-6 md:p-10 rounded-xl border border-white/20 shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 sticky top-0 bg-[#0a0a0a] z-10 pt-2">
                <h2 className="text-xl md:text-2xl font-black text-accent-cyan uppercase tracking-wider">🏎️ 游戏游玩说明</h2>
                <button 
                  onClick={() => setShowInstructions(false)} 
                  className="text-zinc-400 hover:text-white px-3 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                >
                  ✕ 关闭
                </button>
              </div>
              
              <div className="space-y-6 text-zinc-300 text-sm md:text-base leading-relaxed pb-4 pr-1 scrollbar-hide">
                <section>
                  <h3 className="text-accent-yellow font-bold text-lg mb-2 flex items-center gap-2">🏆 赛事目标与概览</h3>
                  <p className="opacity-90 leading-6">
                    在多变复杂的赛道上超越所有对手，夺取冠军！比赛名次决定金币收益，你可以使用金币在商店解锁更强赛车、高配性能零件以及炫彩涂装。<br/>
                    本游戏包含四种主要模式：<strong className="text-accent-cyan">单人模式(竞速/组队)</strong>、<strong className="text-accent-magenta">同屏对战(双人)</strong>、<strong className="text-accent-yellow">杯赛模式(联赛)</strong>、<strong className="text-green-400">在线对战(多人联机)</strong>。<br/>
                    同时提供<strong className="text-purple-400">精英赛</strong>（最高难度AI，部分杯赛下会锁死特殊发光外观）。在<strong className="text-green-400">在线对战</strong>中，您可以创建或加入房间，与全世界的玩家进行巅峰对决，并且支持组队模式或混战！
                  </p>
                </section>
                
                <section>
                  <h3 className="text-accent-magenta font-bold text-lg mb-2">🎮 操作方式与快捷键</h3>
                  <p className="opacity-80 text-sm mb-3">支持在游戏中按 <kbd className="bg-white/20 px-1 rounded">P</kbd> 键 或 <kbd className="bg-white/20 px-1 rounded">ESC</kbd> 键快速<strong className="text-white">暂停/继续</strong>比赛。</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-md border border-white/5">
                     <div>
                       <strong className="text-accent-cyan block mb-2 border-b border-accent-cyan/30 pb-1">玩家一操作（单人/组队/在线对战）：</strong>
                       <p className="opacity-80 leading-7">
                         • <kbd className="bg-white/10 px-1 rounded">↑</kbd> <kbd className="bg-white/10 px-1 rounded">↓</kbd> <kbd className="bg-white/10 px-1 rounded">←</kbd> <kbd className="bg-white/10 px-1 rounded">→</kbd>：加速/刹车/转向<br/>
                         • <kbd className="bg-white/10 px-1 rounded">Shift</kbd> 键：手刹漂移 (微调过弯)<br/>
                         • <kbd className="bg-white/10 px-1 rounded">空格 (Space)</kbd> / <kbd className="bg-white/10 px-1 rounded">Enter</kbd>：急刹车<br/>
                         <span className="text-[12px] text-zinc-400">* 注：在任何模式下均可使用 WASD 与 Q/E 控制。</span>
                       </p>
                     </div>
                     <div className="hidden">
                       <strong className="text-accent-magenta block mb-2 border-b border-accent-magenta/30 pb-1">玩家二操作（仅双人模式）：</strong>
                       <p className="opacity-80 leading-7">
                         • <kbd className="bg-white/10 px-1 rounded">W</kbd> <kbd className="bg-white/10 px-1 rounded">S</kbd> <kbd className="bg-white/10 px-1 rounded">A</kbd> <kbd className="bg-white/10 px-1 rounded">D</kbd>：加速/刹车/转向<br/>
                         • <kbd className="bg-white/10 px-1 rounded">Q</kbd> 或 <kbd className="bg-white/10 px-1 rounded">E</kbd>：手刹漂移<br/>
                         • <kbd className="bg-white/10 px-1 rounded">空格 (Space)</kbd>：急刹车
                       </p>
                     </div>
                  </div>
                </section>
                
                <section>
                  <h3 className="text-accent-cyan font-bold text-lg mb-3">🛠️ 进阶系统与物理机制</h3>
                  <ul className="list-disc pl-5 space-y-3 opacity-90 leading-6">
                     <li>
                       <strong className="text-white">物理驱动与防粘连设计：</strong>游戏拥有拟真的惯性系统，极速入弯可能导致冲出赛道并严重减速。玩家间碰撞会导致失速与互相推挤，请合理运用走线或提前减速入弯。
                     </li>
                     <li>
                       <strong className="text-white">漂移过弯：</strong>长按或点按“手刹漂移键”会使抓地力暂时下降从而进行滑移，大幅增加转向角度，适合U型或V型急弯。过度漂移会导致速度急剧折损。
                     </li>
                     <li>
                       <strong className="text-white">差异化赛车与改装零部件：</strong>在商店可以购买多种不同底盘的赛车（极速型如F1、稳如磐石如拉力越野车）。配合涡轮引擎、热熔轮胎等零件，打造出完美契合你驾驶习惯的座驾。组队模式中，你强力的赛车和装备甚至能够成为队伍胜利的决定性因素！
                     </li>
                     <li>
                       <strong className="text-accent-yellow">极速起步 (Launch)：</strong>部分高规格轮胎和零件会提供“起步”加成。拥有起步优势的赛车，读秒结束时会获得明显的爆发初速度。
                     </li>
                  </ul>
                </section>
                
                <div className="bg-accent-magenta/10 border-l-4 border-accent-magenta p-4 mt-8 rounded-r-md">
                  <strong>车库规则说明：</strong>你所购买的赛车、外观涂装和改装强化件，必需进入主界面的【我的车库】大厅完成装配才会生效。<br/>
                  <span className="text-sm opacity-80 mt-1 block">提示：目前的自定装备（车库系统）在“单人竞速”与“组队杯赛”等模式开放使用；在“双人同屏黑客”模式下为了保证相对公平配置，暂时自动禁用自定车辆。</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 lg:p-10"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#151515] p-6 rounded-xl border border-red-500/30 shadow-2xl max-w-sm w-full text-center"
            >
              <h3 className="text-xl font-bold text-white mb-4">⚠️ 确认操作</h3>
              <p className="text-zinc-400 mb-8">{confirmAction.message}</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmAction(null)} 
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    confirmAction.onConfirm();
                    setConfirmAction(null);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors border border-red-400/50"
                >
                  {confirmAction.confirmText || '确定'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="neon-panel bg-[#0a0a0a] max-w-[800px] w-full max-h-[85vh] overflow-y-auto p-6 md:p-10 rounded-xl border border-white/20 shadow-2xl relative"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/10 pb-4 pt-2 sticky top-0 bg-[#0a0a0a] z-10 w-full shrink-0">
                <h2 className="text-xl md:text-2xl font-black text-accent-yellow uppercase tracking-wider">🏆 赛道排行榜</h2>
                <div className="flex flex-wrap gap-2 text-sm md:text-base w-full sm:w-auto">
                  <button 
                    onClick={handleExportRecords}
                    className="flex-1 sm:flex-none text-accent-cyan hover:text-white px-3 py-1 rounded bg-accent-cyan/10 hover:bg-accent-cyan/20 transition-colors border border-accent-cyan/30 text-center flex items-center justify-center gap-1"
                  >
                    ⬇️ 导出
                  </button>
                  <button 
                    onClick={handleImportRecords}
                    className="flex-1 sm:flex-none text-accent-cyan hover:text-white px-3 py-1 rounded bg-accent-cyan/10 hover:bg-accent-cyan/20 transition-colors border border-accent-cyan/30 text-center flex items-center justify-center gap-1"
                  >
                    ⬆️ 导入
                  </button>
                  <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setConfirmAction({
                          message: '确定要清空所有赛道的所有记录吗？此操作无法撤销。',
                          onConfirm: () => {
                            setRecords({});
                            localStorage.removeItem('neon_lap_records');
                          }
                        });
                    }}
                    className="flex-1 sm:flex-none text-red-400 hover:text-red-300 px-3 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors border border-red-500/30 text-center"
                  >
                    🗑️ 清空全部
                  </button>
                  <button 
                    onClick={() => setShowLeaderboard(false)} 
                    className="flex-1 sm:flex-none text-zinc-400 hover:text-white px-3 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-center"
                  >
                    ✕ 关闭
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Horizontal Tabs for Tracks */}
                <div className="flex gap-2 p-1 overflow-x-auto pb-2 border-b border-white/10 shrink-0">
                  {TRACKS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setLeaderboardTrackId(t.id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-md ${
                        t.id === leaderboardTrackId 
                        ? 'bg-accent-cyan text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]' 
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 px-1 pb-4">
                  <div className="flex rounded-md overflow-hidden border border-white/20">
                    <button
                      onClick={() => setLeaderboardType('LOCAL')}
                      className={`px-4 py-1.5 text-xs font-bold transition-all ${leaderboardType === 'LOCAL' ? 'bg-accent-yellow text-black' : 'bg-black text-zinc-400 hover:bg-white/10'}`}
                    >本地记录</button>
                    <button
                      onClick={() => setLeaderboardType('ONLINE')}
                      className={`px-4 py-1.5 text-xs font-bold transition-all ${leaderboardType === 'ONLINE' ? 'bg-accent-yellow text-black' : 'bg-black text-zinc-400 hover:bg-white/10'}`}
                    >在线对战</button>
                  </div>
                </div>

                {/* Sub-tabs for Laps */}
                <div className="flex gap-2 px-1">
                  {[1, 2, 3, 4, 5].map(lap => {
                    const recordKey = leaderboardType === 'ONLINE' ? `${leaderboardTrackId}_${lap}_online` : `${leaderboardTrackId}_${lap}`;
                    const hasRecords = (records[recordKey] || []).length > 0;
                    return (
                      <button
                        key={lap}
                        onClick={() => setLeaderboardLapCount(lap)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${
                          lap === leaderboardLapCount
                          ? 'border-accent-magenta bg-accent-magenta/20 text-accent-magenta shadow-[0_0_10px_rgba(255,0,234,0.3)]'
                          : 'border-white/10 bg-black text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                        }`}
                      >
                        {lap} 圈 {hasRecords && <span className="w-1.5 h-1.5 inline-block bg-accent-yellow rounded-full ml-1" />}
                      </button>
                    );
                  })}
                </div>

                {/* Records Listing */}
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  {(() => {
                    const currentKey = leaderboardType === 'ONLINE' ? `${leaderboardTrackId}_${leaderboardLapCount}_online` : `${leaderboardTrackId}_${leaderboardLapCount}`;
                    const trackRecords = records[currentKey] || [];
                    const trackName = TRACKS.find(t => t.id === leaderboardTrackId)?.name;
                    
                    if (trackRecords.length === 0) {
                      return <div className="text-zinc-500 text-sm text-center py-8 bg-black/40 rounded-lg border border-white/5">{leaderboardType === 'ONLINE' ? '该赛道暂无在线对战成绩' : '该赛道/圈数暂无成绩，快去创造记录吧！'}</div>;
                    }
                    
                    return (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-4">
                          <h4 className="text-accent-magenta font-bold">
                            {trackName} - {leaderboardLapCount}圈记录 {leaderboardType === 'ONLINE' ? '(在线对战)' : ''}
                          </h4>
                          <button 
                            onClick={() => setConfirmAction({
                              message: `确定要删除「${trackName}」的 ${leaderboardLapCount} 圈${leaderboardType === 'ONLINE' ? '在线' : ''}记录吗？`,
                              onConfirm: () => {
                                const newRecords = { ...records };
                                delete newRecords[currentKey];
                                setRecords(newRecords);
                              }
                            })}
                            className="text-xs font-normal text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors border border-red-500/30"
                          >
                            🗑️ 删除此榜单记录
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {trackRecords.map((record, idx) => {
                            const dateStr = record.timestamp 
                              ? new Date(record.timestamp).toLocaleString('zh-CN', { hour12: false }) 
                              : '-';
                              
                            return (
                              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm p-3 rounded bg-black/40 border border-white/5 gap-2 hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-3">
                                  <span className={`font-black w-6 text-center ${idx === 0 ? 'text-accent-yellow scale-125' : idx === 1 ? 'text-zinc-300 scale-110' : idx === 2 ? 'text-amber-600 scale-105' : 'text-zinc-600'}`}>
                                    #{idx + 1}
                                  </span>
                                  <span className="text-white font-bold">{record.playerName}</span>
                                  <span className="text-zinc-500 text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 hidden sm:inline">
                                    {record.vehicle}
                                  </span>
                                </div>
                                <div className="flex items-center justify-end gap-4 ml-9 sm:ml-0">
                                  <span className="text-[10px] text-zinc-500">{dateStr}</span>
                                  <span className="font-mono font-bold text-accent-magenta text-base">{(record.time / 1000).toFixed(2)}s</span>
                                  <button
                                    onClick={() => setConfirmAction({
                                      message: `确定要删除此条记录吗？`,
                                      onConfirm: () => {
                                        const newRecords = { ...records };
                                        const currList = [...newRecords[currentKey]];
                                        currList.splice(idx, 1);
                                        if (currList.length === 0) {
                                          delete newRecords[currentKey];
                                        } else {
                                          newRecords[currentKey] = currList;
                                        }
                                        setRecords(newRecords);
                                      }
                                    })}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/20 transition-all font-bold"
                                    title="删除此记录"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}
