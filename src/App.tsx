import React, { useState } from 'react';
import { GameSettings, CarState, AIDifficulty, GameMode, GarageData, LapRecord, AIStyle, TeamSetup } from './types';
import { TRACKS, VEHICLES_DB, ITEMS_DB, LIVERIES_DB } from './constants';
import GameCanvas from './components/GameCanvas';

const generateTeamRoster = (teamSize: 2 | 3 = 3, difficulty: AIDifficulty = 2): TeamSetup[] => {
  const styles: AIStyle[] = ['OPTIMAL', 'AGGRESSIVE', 'CAUTIOUS', 'DRIFTER'];
  const roster: TeamSetup[] = [];
  
  // Create AI that fits the difficulty level roughly
  const createRandomAI = (id: string, name: string, team: 'RED' | 'BLUE'): TeamSetup => {
    const availableVehicles = VEHICLES_DB; 
    const v = availableVehicles[Math.floor(Math.random() * availableVehicles.length)];
    
    // Higher probability of having upgrades at higher difficulty
    const probUpgrade = difficulty * 0.25; 
    const hasEngine = Math.random() < probUpgrade;
    const hasTires = Math.random() < probUpgrade;
    
    const hasLivery = Math.random() > 0.5;
    const engines = ITEMS_DB.filter(i => i.type === 'engine');
    const tires = ITEMS_DB.filter(i => i.type === 'tires');
    
    const style = styles[Math.floor(Math.random() * styles.length)];
    
    return {
      id,
      name,
      vehicleId: v.id,
      engineId: hasEngine ? engines[Math.floor(Math.random() * engines.length)].id : null,
      tiresId: hasTires ? tires[Math.floor(Math.random() * tires.length)].id : null,
      liveryId: hasLivery ? LIVERIES_DB[Math.floor(Math.random() * LIVERIES_DB.length)].id : null,
      style,
      team,
    };
  };

  for (let i = 0; i < teamSize - 1; i++) {
    roster.push(createRandomAI(`red_ai_${i+1}`, `R-BOT ${i+1}`, 'RED'));
  }
  
  for (let i = 0; i < teamSize; i++) {
    roster.push(createRandomAI(`blue_ai_${i+1}`, `B-BOT ${i+1}`, 'BLUE'));
  }

  return roster;
};
import ShopUI from './components/ShopUI';
import GarageUI from './components/GarageUI';
import { Trophy, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioService } from './services/audioService';

const initialGarageData: GarageData = (() => {
  const saved = localStorage.getItem('neon_garage_v2');
  if (saved) return JSON.parse(saved);
  return {
    coins: 0,
    ownedVehicles: ['car_basic'],
    ownedItems: [],
    ownedLiveries: [],
    equippedVehicle: 'car_basic',
    equippedItems: { engine: null, tires: null },
    equippedLivery: '#00f2ff'
  };
})();

export default function App() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardTrackId, setLeaderboardTrackId] = useState<string>('oval');
  const [leaderboardLapCount, setLeaderboardLapCount] = useState<number>(2);
  const [showPlayerInfo, setShowPlayerInfo] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{message: string, onConfirm: () => void} | null>(null);
  
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
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'RESULT' | 'SHOP' | 'GARAGE' | 'CUP_STANDINGS'>('MENU');
  
  const [garage, setGarage] = useState<GarageData>(initialGarageData);

  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('neon_volume') || '0.5'));
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('neon_muted') === 'true');

  React.useEffect(() => {
    localStorage.setItem('neon_volume', volume.toString());
    audioService.setVolume(volume);
  }, [volume]);

  React.useEffect(() => {
    localStorage.setItem('neon_muted', isMuted.toString());
    audioService.setMute(isMuted);
  }, [isMuted]);

  React.useEffect(() => {
    localStorage.setItem('neon_garage_v2', JSON.stringify(garage));
  }, [garage]);

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

  const handleStartGame = () => {
    audioService.init();

    if (settings.isCupMode) {
      if (!cupState?.isActive) {
        // Init cup
        const availableTracks = [...TRACKS].map(t => t.id).sort(() => Math.random() - 0.5);
        const selectedTracks = availableTracks.slice(0, settings.cupNumTracks || 4);
        
        setCupState({
          isActive: true,
          tracks: selectedTracks,
          currentRaceIndex: 0,
          finished: false,
          teamWins: settings.mode === 'TEAM' ? { RED: 0, BLUE: 0 } : undefined
        });
        setScores({});
        setTeamScore(null);
        setSettings(s => ({ ...s, trackId: selectedTracks[0] }));
        
        // Show cup standings preview instead of jumping right in
        setGameState('CUP_STANDINGS');
        return;
      } else {
        // Cup is active and we want to start the actual race
        setSettings(s => ({ ...s, trackId: cupState.tracks[cupState.currentRaceIndex] }));
        audioService.startBGM(cupState.tracks[cupState.currentRaceIndex]);
        setGameState('PLAYING');
        return;
      }
    } else {
      setScores({});
      setTeamScore(null);
      setCupState(null);
      audioService.startBGM(settings.trackId);
      setGameState('PLAYING');
    }
  };

  const points = [25, 18, 15, 12, 10, 8, 6, 4];

  const handleFinish = (finalResults: CarState[]) => {
    audioService.stopBGM();
    setResults(finalResults);
    
    // Save records
    const newRecords = { ...records };
    const recordKey = `${settings.trackId}_${settings.laps}`;
    let trackRecords = newRecords[recordKey] || [];
    let bestPreviousTime = trackRecords.length > 0 ? trackRecords[0].time : Infinity;
    let brokeRecord = false;
    let breakerName = '';
    
    finalResults.forEach((car) => {
      if (!car.dnf && car.finishTime && !car.isAI) {
        // Only save human player records for leaderboard
        const playerName = car.id === 'p1' ? '玩家 1' : '玩家 2';
        
        if (car.finishTime < bestPreviousTime) {
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
          isTeam: settings.mode === 'TEAM',
          timestamp: Date.now()
        });
      }
    });

    if (!newRecordInfo && brokeRecord === false) {
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

    if (settings.mode === 'TEAM') {
      const redTeamResults = finalResults.filter(r => r.team === 'RED');
      const totalRedMembers = redTeamResults.length;
      
      // Condition 1: All red members must finish
      const allRedFinished = redTeamResults.every(r => !r.dnf);
      
      // Condition 2: Red members must occupy top spots (0 to totalRedMembers - 1)
      const currentTopSweep = finalResults.slice(0, totalRedMembers).every(r => r.team === 'RED');

      if (allRedFinished && currentTopSweep) {
        isFlawlessRed = true;
      }
    }

    setIsFlawlessResult(isFlawlessRed);
    finalResults.forEach((car, index) => {
      const earned = car.dnf ? 0 : (points[index] || 0);
      newScores[car.id] = (newScores[car.id] || 0) + earned;
      
      if (settings.mode === 'TEAM') {
        if (car.team === 'RED') currentRedScore += earned;
        if (car.team === 'BLUE') currentBlueScore += earned;
      }

      if (car.id === 'p1') {
        let moneyEarned = earned;
        setGarage(g => ({ ...g, coins: g.coins + moneyEarned }));
      }
    });

    setFlawlessVictoryMessage(null);
    if (settings.mode === 'TEAM') {
      setTeamScore({ RED: currentRedScore, BLUE: currentBlueScore });
      let teamBonus = 0;
      if (currentRedScore > currentBlueScore) {
        teamBonus += 20; // Win bonus
      }
      if (isFlawlessRed) {
        teamBonus += 50; // Flawless victory bonus
        setFlawlessVictoryMessage(`🔥 完胜！ 红队全员完赛并包揽前 ${finalResults.filter(r => r.team === 'RED').length} 名！🔥 额外奖励 +50！`);
      }
      if (teamBonus > 0) {
        setGarage(g => ({ ...g, coins: g.coins + teamBonus }));
      }
    } else {
      setTeamScore(null);
    }

    setScores(newScores);

    if (settings.isCupMode && cupState) {
      const nextIndex = cupState.currentRaceIndex + 1;
      const isFinished = nextIndex >= cupState.tracks.length;
      let newTeamWins = cupState.teamWins;
      
      if (settings.mode === 'TEAM' && newTeamWins) {
        if (currentRedScore > currentBlueScore) {
          newTeamWins = { ...newTeamWins, RED: newTeamWins.RED + 1 };
        } else if (currentBlueScore > currentRedScore) {
          newTeamWins = { ...newTeamWins, BLUE: newTeamWins.BLUE + 1 };
        }
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
    setGameState('MENU');
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-neon-text font-sans selection:bg-accent-cyan/30 flex flex-col relative">
      
      {/* Global Volume Control */}
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
                  NEON VELOCITY
                </h1>
                <span className="text-accent-magenta uppercase tracking-[2px] text-[10px] md:text-xs font-bold">急速赛车竞技系统</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 pr-32 md:pr-48">
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
                <div className="font-mono opacity-60 text-[10px] md:text-[14px] hidden sm:block">系统版本: 2.0.4</div>
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
                      onClick={() => setSettings(s => ({ ...s, mode: 'SINGLE' }))}
                      className={`flex-1 p-[10px] text-center cursor-pointer rounded-[4px] text-[14px] transition-all ${
                        settings.mode === 'SINGLE' 
                        ? 'bg-accent-cyan text-black font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)] border-accent-cyan' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      单人模式
                    </button>
                    <button 
                      onClick={() => setSettings(s => ({ ...s, mode: 'DOUBLE', aiCount: Math.min(s.aiCount, 4) }))}
                      className={`flex-1 p-[10px] text-center cursor-pointer rounded-[4px] text-[14px] transition-all ${
                        settings.mode === 'DOUBLE' 
                        ? 'bg-accent-cyan text-black font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)] border-accent-cyan' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      双人竞技
                    </button>
                    <button 
                      onClick={() => setSettings(s => ({ ...s, mode: 'TEAM', cupNumTracks: s.isCupMode && s.cupNumTracks && s.cupNumTracks % 2 === 0 ? s.cupNumTracks + 1 : s.cupNumTracks }))}
                      className={`flex-1 p-[10px] text-center cursor-pointer rounded-[4px] text-[14px] transition-all ${
                        settings.mode === 'TEAM' 
                        ? 'bg-accent-cyan text-black font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)] border-accent-cyan' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      组队对抗
                    </button>
                  </div>
                </div>

                <div className="neon-panel p-[20px]">
                  {settings.mode !== 'TEAM' ? (
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
                            onClick={() => setSettings(s => ({ ...s, aiCount: count }))}
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

                      <div className="flex justify-between mb-[5px] text-[13px]">
                        <span>AI 难度</span>
                        <span className="text-accent-magenta">
                          {settings.aiDifficulty === 1 && '入门级'}
                          {settings.aiDifficulty === 2 && '进阶级'}
                          {settings.aiDifficulty === 3 && '专家级'}
                          {settings.aiDifficulty === 4 && '专业级'} (LV {settings.aiDifficulty})
                        </span>
                      </div>
                      <div className="flex gap-[5px] mt-[10px]">
                        {[1, 2, 3, 4].map(level => (
                          <button
                            key={level}
                            onClick={() => setSettings(s => ({ ...s, aiDifficulty: level }))}
                            className={`h-[6px] flex-1 rounded-[2px] transition-all ${
                              settings.aiDifficulty >= level 
                              ? 'bg-accent-magenta shadow-[0_0_8px_rgba(255,0,234,0.6)]' 
                              : 'bg-white/10 hover:bg-white/20'
                            }`}
                          />
                        ))}
                      </div>
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
                           <button 
                             onClick={() => setSettings(s => ({ ...s, isEliteMode: !s.isEliteMode }))}
                             className={`px-2 py-1 rounded transition-colors text-[10px] ml-2 ${settings.isEliteMode ? 'bg-accent-magenta text-white font-bold shadow-[0_0_10px_rgba(255,0,234,0.5)]' : 'bg-white/10 hover:bg-white/20'}`}
                           >
                             精英赛
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

                    {!settings.isEliteMode && (
                      <>
                        <div className="flex justify-between mb-[5px] text-[13px]">
                          <span>AI 难度 (影响队友及对手)</span>
                          <span className="text-accent-magenta">
                            LV {settings.aiDifficulty}
                          </span>
                        </div>
                        <div className="flex gap-[5px] mt-[10px] mb-[20px]">
                          {[1, 2, 3, 4].map(level => (
                            <button
                              key={level}
                              onClick={() => setSettings(s => ({ ...s, aiDifficulty: level, teamRoster: generateTeamRoster(s.teamSize, level) }))}
                              className={`h-[6px] flex-1 rounded-[2px] transition-all ${
                                settings.aiDifficulty >= level 
                                ? 'bg-accent-magenta shadow-[0_0_8px_rgba(255,0,234,0.6)]' 
                                : 'bg-white/10 hover:bg-white/20'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}

                      <div className="space-y-4">
                        <div>
                           <div className="text-red-400 font-bold mb-1 border-b border-red-500/30 pb-1 text-xs">红队 (你的队伍)</div>
                           <div className="text-xs text-white/80">
                              - 玩家 1 (P1)<br/>
                              {settings.teamRoster.filter(r => r.team === 'RED').map(r => (
                                <div key={r.id}>- {r.name} [{r.style}]</div>
                              ))}
                           </div>
                        </div>
                        <div>
                           <div className="text-blue-400 font-bold mb-1 border-b border-blue-500/30 pb-1 text-xs">蓝队</div>
                           <div className="text-xs text-white/80">
                              {settings.teamRoster.filter(r => r.team === 'BLUE').map(r => (
                                <div key={r.id}>- {r.name} [{r.style}]</div>
                              ))}
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
                             let next = Math.max(settings.mode === 'TEAM' ? 3 : 2, (settings.cupNumTracks || 4) - 1);
                             if (settings.mode === 'TEAM' && next % 2 === 0) next = Math.max(3, next - 1);
                             setSettings(s => ({ ...s, cupNumTracks: next }));
                          }}
                          className="w-10 h-10 bg-white/5 border border-white/10 text-white rounded hover:bg-white/10 font-black text-xl flex items-center justify-center transition-colors"
                        >
                          -
                        </button>
                        <input 
                           type="number"
                           min={settings.mode === 'TEAM' ? 3 : 2}
                           step={settings.mode === 'TEAM' ? 2 : 1}
                           max={TRACKS.length}
                           value={settings.cupNumTracks || (settings.mode === 'TEAM' ? 3 : 4)}
                           onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                 let next = Math.max(settings.mode === 'TEAM' ? 3 : 2, Math.min(TRACKS.length, val));
                                 if (settings.mode === 'TEAM' && next % 2 === 0) next += 1;
                                 setSettings(s => ({ ...s, cupNumTracks: Math.min(TRACKS.length, next) }));
                              }
                           }}
                           className="bg-black/60 border border-accent-yellow/50 text-accent-yellow font-mono text-2xl font-black text-center rounded px-2 w-20 h-12 outline-none focus:border-accent-yellow focus:shadow-[0_0_10px_rgba(244,255,64,0.3)] transition-all"
                        />
                        <button 
                          onClick={() => {
                             let next = Math.min(TRACKS.length, (settings.cupNumTracks || 4) + 1);
                             if (settings.mode === 'TEAM' && next % 2 === 0) next = Math.min(TRACKS.length, next + 1);
                             // Need to handle if TRACKS.length is even and we hit it.
                             if (settings.mode === 'TEAM' && next % 2 === 0) next -= 1; 
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-[20px] overflow-visible lg:overflow-y-auto pr-2 pb-4 flex-1 content-start">
                    {TRACKS.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => setSettings(s => ({ ...s, trackId: track.id }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSettings(s => ({ ...s, trackId: track.id }));
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={`neon-panel relative overflow-hidden h-[140px] transition-all group cursor-pointer ${
                        settings.trackId === track.id 
                          ? 'border-2 border-accent-yellow shadow-[0_0_20px_rgba(244,255,64,0.4)]' 
                          : 'hover:border-white/30'
                      }`}
                    >
                      <div className="w-full h-[70%] bg-black/40 flex items-center justify-center">
                        {/* Simple SVG Track Preview */}
                        <svg width="120" height="60" viewBox="0 0 1600 1200" className="opacity-50 group-hover:opacity-80 transition-opacity">
                          <path 
                            d={track.waypoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'} 
                            fill="none" 
                            stroke={settings.trackId === track.id ? '#f4ff40' : '#00f2ff'} 
                            strokeWidth="80" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="p-[8px_15px] bg-black/60 text-[14px] flex justify-between items-center absolute bottom-0 w-full">
                        <span className="font-bold flex items-center gap-2">
                          {track.name}
                          {(() => {
                            const trackRecords = records[`${track.id}_${settings.laps}`] || [];
                            if (trackRecords.length > 0) {
                              const best = trackRecords[0];
                              return <span className="text-[10px] text-accent-yellow bg-accent-yellow/20 px-1.5 py-0.5 rounded border border-accent-yellow/30 font-mono hidden sm:inline-block">🏆 {(best.time / 1000).toFixed(2)}s</span>
                            }
                            return null;
                          })()}
                        </span>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setLeaderboardTrackId(track.id);
                               setLeaderboardLapCount(settings.laps);
                               setShowLeaderboard(true);
                             }}
                             className="text-[10px] text-accent-cyan hover:text-white px-1.5 py-0.5 rounded bg-accent-cyan/10 hover:bg-accent-cyan/30 transition-colors italic tracking-wider shadow-[0_0_5px_currentColor] border border-accent-cyan/20"
                           >查看榜单</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </main>

            {/* Footer */}
            <footer className="h-auto py-4 md:h-[80px] bg-gradient-to-t from-accent-cyan/10 to-transparent flex flex-col md:flex-row items-center justify-between px-4 md:px-[60px] gap-4 relative shrink-0">
              <div className="text-[12px] text-zinc-500 max-w-full md:max-w-[400px] leading-[1.5] border-l-2 border-accent-magenta pl-[15px]">
                <strong>驾驶警告：</strong>由于赛道抓地力限制，转弯速度过快将导致赛车撞击赛道边缘。物理碰撞会产生剧烈摩擦并大幅降低车速。
              </div>
              <div className="flex w-full md:w-auto gap-4 flex-wrap md:flex-nowrap">
                {(settings.mode === 'SINGLE' || settings.mode === 'TEAM') && (
                  <button 
                    onClick={() => setGameState('GARAGE')}
                    className="flex-1 md:flex-none border border-accent-cyan/50 text-accent-cyan px-4 md:px-[20px] py-[12px] text-[14px] font-bold uppercase rounded-[4px] cursor-pointer transition-all hover:bg-accent-cyan hover:text-black"
                  >
                    我的车库
                  </button>
                )}
                <button 
                  onClick={() => setGameState('SHOP')}
                  className="flex-1 md:flex-none bg-accent-magenta/20 text-accent-magenta border border-accent-magenta px-4 md:px-[20px] py-[12px] text-[14px] font-bold uppercase rounded-[4px] cursor-pointer transition-all hover:bg-accent-magenta/40"
                >
                  商店 ({garage.coins} ⟁)
                </button>
                <button 
                  onClick={handleStartGame}
                  className="w-full md:w-auto bg-accent-yellow text-black px-4 md:px-[40px] py-[12px] text-[16px] md:text-[20px] font-black uppercase rounded-[4px] cursor-pointer shadow-[0_0_30px_rgba(244,255,64,0.5)] transition-all transform hover:scale-105 active:scale-95"
                >
                  进入比赛
                </button>
              </div>
            </footer>
          </motion.div>
        )}

        {gameState === 'SHOP' && <ShopUI garage={garage} setGarage={setGarage} onClose={() => setGameState('MENU')} />}
        {gameState === 'GARAGE' && <GarageUI garage={garage} setGarage={setGarage} onClose={() => setGameState('MENU')} />}

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
              garage={garage}
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
                {settings.mode === 'TEAM' ? (() => {
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
                        const ai = settings.teamRoster.find(r => r.id === id);
                        if (ai) name = ai.name;
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
                 if (settings.mode === 'TEAM') {
                    isWin = (cupState.teamWins?.RED || 0) > (cupState.teamWins?.BLUE || 0);
                 } else {
                    const entries = Object.keys(scores).map(id => ({ id, score: scores[id] })).sort((a,b) => b.score - a.score);
                    isWin = entries.length > 0 && (entries[0].id === 'p1' || entries[0].id === 'p2');
                 }
                 const reward = isWin ? (settings.cupNumTracks || 4) * 150 : (settings.cupNumTracks || 4) * 40;

                 return (
                   <div className={`border p-4 rounded-lg mb-6 animate-pulse ${isWin ? 'bg-accent-yellow/10 border-accent-yellow/50 shadow-[0_0_20px_rgba(244,255,64,0.3)]' : 'bg-white/5 border-white/20'}`}>
                      <p className={`font-black text-xl mb-2 ${isWin ? 'text-accent-yellow' : 'text-zinc-400'}`}>
                         {isWin ? '🏆 恭喜获得杯赛冠军！ 🏆' : '😔 遗憾错失冠军 😔'}
                      </p>
                      <p className={`font-bold text-lg ${isWin ? 'text-accent-yellow' : 'text-zinc-500'}`}>
                         获得杯赛结算金币 {reward} ⟁
                      </p>
                   </div>
                 );
              })()}

              <div className="flex gap-4 shrink-0">
                {cupState.finished ? (
                   <button 
                     onClick={() => {
                       let isWin = false;
                       if (settings.mode === 'TEAM') {
                          isWin = (cupState.teamWins?.RED || 0) > (cupState.teamWins?.BLUE || 0);
                       } else {
                          const entries = Object.keys(scores).map(id => ({ id, score: scores[id] })).sort((a,b) => b.score - a.score);
                          isWin = entries.length > 0 && (entries[0].id === 'p1' || entries[0].id === 'p2');
                       }
                       const reward = isWin ? (settings.cupNumTracks || 4) * 150 : (settings.cupNumTracks || 4) * 40;

                       setGarage(g => ({...g, coins: g.coins + reward}));
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
                       onClick={handleStartGame}
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

              {settings.mode === 'TEAM' && teamScore && (
                <div className="flex justify-center items-start gap-8 mb-8 text-2xl font-black">
                  <div className={`flex flex-col items-center min-w-[120px] ${teamScore.RED > teamScore.BLUE ? 'text-yellow-400 scale-110' : 'text-red-400'} transition-transform`}>
                    <span className="text-sm">红队</span>
                    {teamScore.RED} 分
                    
                    <div className="flex flex-col gap-1 mt-3 text-xs font-normal opacity-80 w-full border-t border-current pt-2">
                       {results.filter(c => c.team === 'RED').map(c => {
                          const earned = c.dnf ? 0 : (points[results.findIndex(r => r.id === c.id)] || 0);
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
                          const earned = c.dnf ? 0 : (points[results.findIndex(r => r.id === c.id)] || 0);
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
                  const earned = car.dnf ? 0 : (points[index] || 0);
                  return (
                    <div 
                      key={car.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        index === 0 ? 'bg-accent-yellow/10 border-accent-yellow/50' : 'bg-black/40 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-black italic w-8 ${index === 0 ? 'text-accent-yellow' : 'text-zinc-600'}`}>#{index + 1}</div>
                        <div className="w-6 h-6 rounded border border-white/20 shadow-[0_0_10px_currentColor]" style={{ backgroundColor: car.color, color: car.color }} />
                        <div className="flex flex-col items-start pr-4">
                          <div className="font-bold text-lg uppercase tracking-wider leading-none">
                             {car.name || car.id.toUpperCase()} 
                             {settings.mode === 'TEAM' && (
                               <span className={`text-[10px] ml-2 px-1 rounded ${car.team === 'RED' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                 {car.team === 'RED' ? '红队' : '蓝队'}
                               </span>
                             )}
                          </div>
                          {car.aiStyle && <div className="text-[10px] text-zinc-500 uppercase">{car.aiStyle}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="font-mono text-xl text-accent-cyan">
                          {car.dnf ? <span className="text-red-500 text-sm">DNF</span> : `${(car.finishTime! / 1000).toFixed(2)}s`}
                        </div>
                        {car.id === 'p1' && !car.dnf && (
                          <div className="font-mono text-sm text-accent-yellow bg-accent-yellow/10 px-3 py-1 rounded-full border border-accent-yellow/30 flex items-center gap-1">
                             奖励 💰 +{settings.mode === 'TEAM' ? (earned + ((teamScore?.RED! > teamScore?.BLUE! && car.team === 'RED') || (teamScore?.BLUE! > teamScore?.RED! && car.team === 'BLUE') ? 20 : 0) + (isFlawlessResult && car.team === 'RED' ? 50 : 0)) : earned}
                          </div>
                        )}
                        <div className="font-mono text-sm text-accent-magenta bg-accent-magenta/10 px-3 py-1 rounded-full border border-accent-magenta/30">
                          {settings.mode === 'TEAM' ? `贡献 ${earned}` : (car.dnf ? 0 : scores[car.id])} 分
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
                       返回主菜单
                     </button>
                     <button 
                       onClick={handleStartGame}
                       className="flex-1 h-12 bg-accent-cyan text-black font-black uppercase rounded-lg shadow-[0_0_20px_rgba(0,242,255,0.4)] hover:scale-[1.02] transition-all"
                     >
                       重新比赛
                     </button>
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
              
              <div className="space-y-6 text-zinc-300 text-sm md:text-base leading-relaxed pb-4">
                <section>
                  <h3 className="text-accent-yellow font-bold text-lg mb-2 flex items-center gap-2">目标</h3>
                  <p className="opacity-90">在指定的赛道上完成固定圈数，争取获得第一名！比赛名次越高，获得的金币奖励越丰厚。使用金币可以在商店中购买更高级的赛车、强力道具和炫酷的涂装。</p>
                </section>
                
                <section>
                  <h3 className="text-accent-magenta font-bold text-lg mb-2">🎮 操作方式</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-md border border-white/5">
                     <div>
                       <strong className="text-accent-cyan block mb-2 border-b border-accent-cyan/30 pb-1">单人模式（玩家1）：</strong>
                       <p className="opacity-80">
                         • 向上方向键（↑）：加速<br/>
                         • 向下方向键（↓）：刹车 / 倒车<br/>
                         • 左右方向键（←/→）：转向<br/>
                         • Shift键：漂移（高速过弯微调）
                       </p>
                     </div>
                     <div>
                       <strong className="text-accent-magenta block mb-2 border-b border-accent-magenta/30 pb-1">双人模式（玩家2）：</strong>
                       <p className="opacity-80">
                         • W键：加速<br/>
                         • S键：刹车 / 倒车<br/>
                         • A/D键：转向<br/>
                         • 空格键（Space）：漂移
                       </p>
                     </div>
                  </div>
                </section>
                
                <section>
                  <h3 className="text-accent-cyan font-bold text-lg mb-3">🛠️ 进阶机制与商店系统</h3>
                  <ul className="list-disc pl-5 space-y-3 opacity-90">
                     <li>
                       <strong className="text-white">漂移系统：</strong>按下漂移键后，车辆抓地力会降低，你可以进行更大角度的滑动，转向速度也会提升。这适合在急弯处点击或按住使用。但请注意：过度漂移会导致速度急剧下降！
                     </li>
                     <li>
                       <strong className="text-white">购买赛车：</strong>在商店中可以解锁购买不同性能的赛车。标准车属性均衡，F1赛车极速惊人但抓地力低（容易打滑），越野拉力赛车虽然速度较慢但过弯稳定性极强。
                     </li>
                     <li>
                       <strong className="text-white">道具与改装：</strong>你可以购买“引擎调校”来大幅度增加最高速度，或者购买“抓地力控制系统”来让您的赛车在弯道指哪打哪。<br/>
                       <span className="text-accent-yellow text-sm">💡 提示：购买后请记得前往主界面的【我的车库】中进行装备才会生效！</span>
                     </li>
                     <li>
                       <strong className="text-white">物理防粘设计：</strong>如果速度过快撞到赛道边缘，不仅会在物理上弹开，车速也会受到损耗下降。请依据真实的驾驶习惯，在入弯前选择性松开油门或者点按刹车。与对手碰撞也会互相推挤并影响速度。
                     </li>
                  </ul>
                </section>
                
                <div className="bg-accent-magenta/10 border-l-4 border-accent-magenta p-4 mt-8 rounded-r-md">
                  <strong>车库说明：</strong>【我的车库】仅在单人模式下开放，你可以在车库中自由更换当前使用的赛车、安装道具以及应用炫彩涂装，快去积攒金币打造你的最强专属赛车吧！
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
                  确定删除
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
                <div className="flex gap-2 text-sm md:text-base w-full sm:w-auto">
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

                {/* Sub-tabs for Laps */}
                <div className="flex gap-2 px-1">
                  {[1, 2, 3, 4, 5].map(lap => {
                    const hasRecords = (records[`${leaderboardTrackId}_${lap}`] || []).length > 0;
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
                    const trackRecords = records[`${leaderboardTrackId}_${leaderboardLapCount}`] || [];
                    const trackName = TRACKS.find(t => t.id === leaderboardTrackId)?.name;
                    
                    if (trackRecords.length === 0) {
                      return <div className="text-zinc-500 text-sm text-center py-8 bg-black/40 rounded-lg border border-white/5">该赛道/圈数暂无成绩，快去创造记录吧！</div>;
                    }
                    
                    return (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-4">
                          <h4 className="text-accent-magenta font-bold">
                            {trackName} - {leaderboardLapCount}圈记录
                          </h4>
                          <button 
                            onClick={() => setConfirmAction({
                              message: `确定要删除「${trackName}」的 ${leaderboardLapCount} 圈记录吗？`,
                              onConfirm: () => {
                                const newRecords = { ...records };
                                delete newRecords[`${leaderboardTrackId}_${leaderboardLapCount}`];
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
                              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm p-3 rounded bg-black/40 border border-white/5 gap-2">
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
        {showPlayerInfo && (() => {
          const baseVehicle = VEHICLES_DB.find(v => v.id === garage.equippedVehicle) || VEHICLES_DB[0];
          const engine = ITEMS_DB.find(i => i.id === garage.equippedItems.engine);
          const tires = ITEMS_DB.find(i => i.id === garage.equippedItems.tires);
          
          const finalSpeed = baseVehicle.baseSpeed + (engine?.boostValue || 0);
          const finalGrip = baseVehicle.baseGrip + (tires?.boostValue || 0);

          return (
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
                className="neon-panel bg-[#0a0a0a] max-w-[500px] w-full p-6 md:p-8 rounded-xl border border-white/20 shadow-2xl relative"
              >
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                  <h2 className="text-xl md:text-2xl font-black text-accent-cyan uppercase tracking-wider">👤 我的信息与属性</h2>
                  <button 
                    onClick={() => setShowPlayerInfo(false)} 
                    className="text-zinc-400 hover:text-white px-3 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/10">
                    <span className="text-zinc-400">总资产</span>
                    <div className="flex items-center gap-4">
                      <span className="text-accent-yellow font-black text-xl">{garage.coins} ⟁</span>
                      <button 
                        onClick={() => {
                          if (confirm('确定要清空金币吗？此操作不可撤销。')) {
                            setGarage(g => ({ ...g, coins: 0 }));
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-400 border border-red-500/30 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                        title="清空金币"
                      >
                        清空
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-accent-magenta uppercase tracking-widest border-l-2 border-accent-magenta pl-2">当前赛车配置</h3>
                    
                    <div className="bg-black/40 p-4 rounded-lg border border-white/5 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">已装备赛车：</span>
                        <span className="text-white font-bold">{baseVehicle.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">已装备引擎：</span>
                        <span className={engine ? "text-accent-cyan" : "text-zinc-600"}>
                          {engine ? engine.name : '未装备 (无加成)'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">已装备轮胎：</span>
                        <span className={tires ? "text-accent-cyan" : "text-zinc-600"}>
                          {tires ? tires.name : '未装备 (无加成)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-accent-yellow uppercase tracking-widest border-l-2 border-accent-yellow pl-2">综合能力数值</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400">最终极速 (Max Speed)</span>
                          <span className="font-mono text-accent-cyan">{finalSpeed.toFixed(1)}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-accent-cyan rounded-full" style={{ width: `${Math.min((finalSpeed / 15) * 100, 100)}%` }} />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-400">抓地力/操控性 (Grip)</span>
                          <span className="font-mono text-accent-magenta">{finalGrip.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-accent-magenta rounded-full" style={{ width: `${Math.min((finalGrip / 0.3) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
