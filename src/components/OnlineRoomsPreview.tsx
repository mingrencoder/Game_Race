import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { TRACKS } from '../constants';

/**
 * 首页中实时滚动/刷新并在大厅前置展示当前的活跃联机房间列表
 */
export const OnlineRoomsPreview = () => {
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    import('../services/socketService').then(({ socketService }) => {
      socketService.connect();
      const fetchRooms = () => {
        socketService.getRooms((res) => {
          if (res.success) {
            setRooms(res.rooms);
          }
        });
      };
      
      fetchRooms();
      interval = setInterval(fetchRooms, 3000);
    });

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-2">
       <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-500 font-bold uppercase">实时公开大厅列表</span>
          <span className="text-accent-cyan animate-pulse flex items-center gap-1">
             <RefreshCw size={10} className="inline-block" /> 刷新中
          </span>
       </div>
       {rooms.filter(r => !r.hasPassword && r.status === 'LOBBY').length === 0 ? (
          <div className="text-center text-zinc-600 text-xs py-4 border border-white/5 bg-white/5 rounded">暂无公开大厅</div>
       ) : (
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
             {rooms.filter(r => !r.hasPassword && r.status === 'LOBBY').map(r => (
               <div key={r.roomId} className="flex justify-between items-center bg-white/5 p-1.5 rounded text-xs">
                 <div className="flex flex-col">
                   <span className="font-bold text-white">{r.roomName}</span>
                   <span className="text-[10px] text-zinc-500">{TRACKS.find(t=>t.id===r.trackId)?.name || r.trackId} - LV{r.aiDifficulty || 2}</span>
                 </div>
                 <div className="text-right">
                   <span className="text-accent-cyan font-mono">{r.playersCount}/6</span>
                 </div>
               </div>
             ))}
          </div>
       )}
    </div>
  );
};
