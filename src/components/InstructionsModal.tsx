import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface InstructionsModalProps {
  show: boolean;
  onClose: () => void;
}

/**
 * 游戏操作按键指南和玩法说明弹窗
 */
export const InstructionsModal: React.FC<InstructionsModalProps> = ({ show, onClose }) => {
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
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 sticky top-0 bg-[#0a0a0a] z-10 pt-2">
              <h2 className="text-xl md:text-2xl font-black text-accent-cyan uppercase tracking-wider">🏎️ 游戏游玩说明</h2>
              <button 
                onClick={onClose} 
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
  );
};
