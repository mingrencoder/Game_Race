import React, { useState } from 'react';
import { GameSettings, CarState, AIDifficulty, GameMode, GarageData } from './types';
import { TRACKS } from './constants';
import GameCanvas from './components/GameCanvas';
import ShopUI from './components/ShopUI';
import GarageUI from './components/GarageUI';
import { Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'RESULT' | 'SHOP' | 'GARAGE'>('MENU');
  const [settings, setSettings] = useState<GameSettings>({
    mode: 'SINGLE',
    aiCount: 1,
    aiDifficulty: AIDifficulty.MEDIUM,
    trackId: 'oval',
  });
  const [results, setResults] = useState<CarState[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  
  const [garage, setGarage] = useState<GarageData>(initialGarageData);

  React.useEffect(() => {
    localStorage.setItem('neon_garage_v2', JSON.stringify(garage));
  }, [garage]);

  const handleStartGame = () => {
    setGameState('PLAYING');
  };

  const handleFinish = (finalResults: CarState[]) => {
    setResults(finalResults);
    
    // Calculate points/coins (1st: 25, 2nd: 15, 3rd: 10, 4th: 5)
    // Less money per race to increase grind for new economy
    const points = [25, 15, 10, 5];
    const newScores = { ...scores };
    finalResults.forEach((car, index) => {
      newScores[car.id] = (newScores[car.id] || 0) + (points[index] || 0);
      if (car.id === 'p1') {
        const earned = points[index] || 5;
        setGarage(g => ({ ...g, coins: g.coins + earned }));
      }
    });
    setScores(newScores);

    setGameState('RESULT');
  };

  const handleExit = () => {
    setGameState('MENU');
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-neon-text font-sans selection:bg-accent-cyan/30 flex flex-col">
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
                <span className="text-accent-magenta uppercase tracking-[2px] text-[10px] md:text-xs font-bold">赛车竞技系统</span>
              </div>
              <div className="font-mono opacity-60 text-[10px] md:text-[14px]">SYS_VER: 2.0.4</div>
            </header>

            {/* Main Layout */}
            <main className="flex flex-col lg:grid lg:grid-cols-[320px_1fr] gap-4 md:gap-[30px] px-4 md:px-[60px] py-[20px] flex-1 overflow-x-hidden overflow-y-auto lg:overflow-hidden">
              {/* Sidebar */}
              <div className="flex flex-col gap-[15px] sm:gap-[25px] shrink-0">
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
                      onClick={() => setSettings(s => ({ ...s, mode: 'DOUBLE' }))}
                      className={`flex-1 p-[10px] text-center cursor-pointer rounded-[4px] text-[14px] transition-all ${
                        settings.mode === 'DOUBLE' 
                        ? 'bg-accent-cyan text-black font-bold shadow-[0_0_15px_rgba(0,242,255,0.5)] border-accent-cyan' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      双人竞技
                    </button>
                  </div>
                </div>

                <div className="neon-panel p-[20px]">
                  <span className="text-[12px] uppercase tracking-[2px] text-accent-magenta mb-[15px] block font-bold">AI 对手设置</span>
                  
                  <div className="flex justify-between mb-[5px] text-[13px]">
                    <span>AI 数量</span>
                    <span className="text-accent-cyan">{settings.aiCount}位</span>
                  </div>
                  <div className="flex gap-[10px] mb-[20px]">
                    {[0, 1, 2].map(count => (
                      <button 
                        key={count}
                        onClick={() => setSettings(s => ({ ...s, aiCount: count }))}
                        className={`flex-1 p-[10px] text-center cursor-pointer rounded-[4px] text-[14px] transition-all ${
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
                <span className="text-[12px] uppercase tracking-[2px] text-accent-magenta mb-[15px] block font-bold shrink-0">选择赛道 (EST. 1-2 MINS)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-[20px] overflow-visible lg:overflow-y-auto pr-2 pb-4 flex-1 content-start">
                  {TRACKS.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => setSettings(s => ({ ...s, trackId: track.id }))}
                      className={`neon-panel relative overflow-hidden h-[140px] transition-all group ${
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
                        <span className="font-bold">{track.name}</span>
                        <span className="opacity-60 text-xs">{track.laps} LAPS</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </main>

            {/* Footer */}
            <footer className="h-auto py-4 md:h-[80px] bg-gradient-to-t from-accent-cyan/10 to-transparent flex flex-col md:flex-row items-center justify-between px-4 md:px-[60px] gap-4 relative shrink-0">
              <div className="text-[12px] text-zinc-500 max-w-full md:max-w-[400px] leading-[1.5] border-l-2 border-accent-magenta pl-[15px]">
                <strong>驾驶警告：</strong>由于赛道抓地力限制，转弯速度过快将导致赛车撞击赛道边缘。物理碰撞会产生剧烈摩擦并大幅降低车速。
              </div>
              <div className="flex w-full md:w-auto gap-4 flex-wrap md:flex-nowrap">
                {settings.mode === 'SINGLE' && (
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

        {gameState === 'RESULT' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[100dvh]"
          >
            <div className="neon-panel w-full max-w-2xl p-8 text-center">
              <Trophy className="w-16 h-16 text-accent-yellow mx-auto mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(244,255,64,0.5)]" />
              <h2 className="text-5xl font-black italic neon-text-cyan mb-2">RACE RESULTS</h2>
              <p className="text-zinc-500 mb-8 uppercase tracking-widest">Final standings for {TRACKS.find(t => t.id === settings.trackId)?.name}</p>
              
              <div className="space-y-4 mb-8">
                {results.map((car, index) => (
                  <div 
                    key={car.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      index === 0 ? 'bg-accent-yellow/10 border-accent-yellow/50' : 'bg-black/40 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-2xl font-black italic w-8 ${index === 0 ? 'text-accent-yellow' : 'text-zinc-600'}`}>#{index + 1}</div>
                      <div className="w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: car.color, color: car.color }} />
                      <div className="font-bold text-lg uppercase tracking-wider">{car.id.toUpperCase()}</div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="font-mono text-xl text-accent-cyan">
                        {(car.finishTime! / 1000).toFixed(2)}s
                      </div>
                      <div className="font-mono text-sm text-accent-magenta bg-accent-magenta/10 px-3 py-1 rounded-full border border-accent-magenta/30">
                        {scores[car.id]} PTS
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={handleExit}
                  className="flex-1 h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg transition-all"
                >
                  BACK TO MENU
                </button>
                <button 
                  onClick={handleStartGame}
                  className="flex-1 h-12 bg-accent-cyan text-black font-black uppercase rounded-lg shadow-[0_0_20px_rgba(0,242,255,0.4)] hover:scale-[1.02] transition-all"
                >
                  REMATCH
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
