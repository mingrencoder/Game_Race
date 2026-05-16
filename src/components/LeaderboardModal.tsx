import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TRACKS } from '../constants';
import { LapRecord } from '../types';

interface LeaderboardModalProps {
  show: boolean;
  onClose: () => void;
  leaderboardType: 'LOCAL' | 'ONLINE';
  setLeaderboardType: (type: 'LOCAL' | 'ONLINE') => void;
  leaderboardTrackId: string;
  setLeaderboardTrackId: (id: string) => void;
  leaderboardLapCount: number;
  setLeaderboardLapCount: (count: number) => void;
  records: Record<string, LapRecord[]>;
  setRecords: (records: Record<string, LapRecord[]>) => void;
  onlineRecords: LapRecord[];
  isFetchingOnline: boolean;
  onExport: () => void;
  onImport: () => void;
  setConfirmAction: (action: { message: string, onConfirm: () => void, confirmText?: string } | null) => void;
}

/**
 * 荣誉榜单记录弹窗 UI
 * 用于展示单机本地缓存或者联机全球云端的单人/赛事最高完赛记录
 * 支持存档导入导出以及按赛道/圈数切换筛选
 */
export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  show, onClose, leaderboardType, setLeaderboardType, leaderboardTrackId, setLeaderboardTrackId,
  leaderboardLapCount, setLeaderboardLapCount, records, setRecords, onlineRecords, isFetchingOnline,
  onExport, onImport, setConfirmAction
}) => {
  return (
    <AnimatePresence>
      {show && (
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
              <div className="flex flex-col gap-1">
                <h2 className="text-xl md:text-2xl font-black text-accent-yellow uppercase tracking-wider">🏆 赛道排行榜</h2>
                <span className="text-[10px] text-zinc-500">注：导入、导出与清空功能仅针对本地记录有效。</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm md:text-base w-full sm:w-auto">
                {leaderboardType === 'LOCAL' && (
                  <>
                    <button 
                      onClick={onExport}
                      className="flex-1 sm:flex-none text-accent-cyan hover:text-white px-3 py-1 rounded bg-accent-cyan/10 hover:bg-accent-cyan/20 transition-colors border border-accent-cyan/30 text-center flex items-center justify-center gap-1"
                    >
                      ⬇️ 导出
                    </button>
                    <button 
                      onClick={onImport}
                      className="flex-1 sm:flex-none text-accent-cyan hover:text-white px-3 py-1 rounded bg-accent-cyan/10 hover:bg-accent-cyan/20 transition-colors border border-accent-cyan/30 text-center flex items-center justify-center gap-1"
                    >
                      ⬆️ 导入
                    </button>
                  </>
                )}
                {leaderboardType === 'LOCAL' && (
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
                )}
                <button 
                  onClick={onClose} 
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
                  const recordKey = `${leaderboardTrackId}_${lap}`;
                  const hasRecords = leaderboardType === 'ONLINE' ? false : (records[recordKey] || []).length > 0;
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
                  const currentKey = `${leaderboardTrackId}_${leaderboardLapCount}`;
                  const trackRecords = leaderboardType === 'ONLINE' ? onlineRecords : (records[currentKey] || []);
                  const trackName = TRACKS.find(t => t.id === leaderboardTrackId)?.name;
                  
                  if (trackRecords.length === 0) {
                    return <div className="text-zinc-500 text-sm text-center py-8 bg-black/40 rounded-lg border border-white/5">{isFetchingOnline ? '正在获取在线记录...' : (leaderboardType === 'ONLINE' ? '该赛道暂无在线对战成绩' : '该赛道/圈数暂无成绩，快去创造记录吧！')}</div>;
                  }
                  
                  return (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-4">
                        <h4 className="text-accent-magenta font-bold">
                          {trackName} - {leaderboardLapCount}圈记录 {leaderboardType === 'ONLINE' ? '(在线对战)' : ''}
                        </h4>
                        {leaderboardType === 'LOCAL' && (
                          <button 
                            onClick={() => setConfirmAction({
                              message: `确定要删除「${trackName}」的 ${leaderboardLapCount} 圈记录吗？`,
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
                        )}
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
                                {leaderboardType === 'LOCAL' && (
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
                                )}
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
  );
};
