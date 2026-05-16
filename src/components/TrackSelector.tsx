import React from 'react';
import { TRACKS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

/** 赛道地图按难度和主题的分类配置目录 */
export const TRACK_CATEGORIES = [
  {
    theme: '基础训练',
    tracks: ['oval', 'figure8']
  },
  {
    theme: '进阶挑战',
    tracks: ['technical', 'speed', 'serpent']
  },
  {
    theme: '漂移大师',
    tracks: ['drift_peanut', 'snake_drift']
  },
  {
    theme: '霓虹狂飙',
    tracks: ['grandprix', 'crossover_bridge', 'neon_labyrinth']
  },
  {
    theme: '终极虚空',
    tracks: ['star_breaker', 'vortex', 'butterfly', 'zenith_loop']
  }
];

/** 
 * 赛道选择缩略图弹窗面板 
 * 包含按主题划分的赛道小地图与选择逻辑，附带该赛道的排行榜快捷入口
 */
export const TrackSelector = ({ selectedTrackId, onSelect, onViewLeaderboard, onClose }: { selectedTrackId: string, onSelect: (id: string) => void, onViewLeaderboard?: (id: string) => void, onClose?: () => void }) => {
  return (
    <div className="flex flex-col gap-6 w-full max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      {TRACK_CATEGORIES.map(cat => (
        <div key={cat.theme} className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-accent-magenta border-b border-accent-magenta/30 pb-1">{cat.theme}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {cat.tracks.map(id => {
              const track = TRACKS.find(t => t.id === id);
              if (!track) return null;
              const isSelected = selectedTrackId === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => onSelect(track.id)}
                  className={`relative overflow-hidden group flex flex-col items-center justify-between border rounded-[8px] h-[100px] transition-all ${
                    isSelected 
                      ? 'border-accent-yellow bg-accent-yellow/10 shadow-[0_0_15px_rgba(244,255,64,0.3)]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="w-full h-[70%] bg-black/40 flex items-center justify-center pointer-events-none">
                    <svg width="100" height="50" viewBox="0 0 1600 1200" className="opacity-50 group-hover:opacity-80 transition-opacity">
                      <path 
                        d={track.waypoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'} 
                        fill="none" 
                        stroke={isSelected ? '#f4ff40' : '#00f2ff'} 
                        strokeWidth="80" 
                        strokeLinejoin="round" 
                        strokeLinecap="round" 
                      />
                    </svg>
                  </div>
                  <div className="w-full h-[30%] flex items-center justify-between bg-black/60 text-[10px] sm:text-[12px] text-zinc-300 font-bold px-2 whitespace-nowrap overflow-hidden">
                    <span className="truncate flex-1 text-left">{track.name}</span>
                    {onViewLeaderboard && (
                      <div 
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewLeaderboard(track.id);
                        }}
                        className="pointer-events-auto ml-1 text-[10px] text-accent-cyan hover:text-white px-1 rounded bg-accent-cyan/10 hover:bg-accent-cyan/30"
                      >榜单</div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-accent-yellow rounded-full shadow-[0_0_8px_rgba(244,255,64,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
