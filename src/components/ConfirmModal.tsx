import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  confirmAction: {
    message: string;
    onConfirm: () => void;
    confirmText?: string;
  } | null;
  onCancel: () => void;
}

/**
 * 赛博朋克风格的全局确认交互弹窗
 * 确保一些危险或高价值操作二次确认
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({ confirmAction, onCancel }) => {
  return (
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
                onClick={onCancel} 
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  confirmAction.onConfirm();
                  onCancel();
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
  );
};
