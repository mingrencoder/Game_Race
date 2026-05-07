import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerData } from '../types';
import { User, Lock, ArrowRight, KeyRound } from 'lucide-react';

interface AuthUIProps {
  setGarage: React.Dispatch<React.SetStateAction<PlayerData>>;
  onLoginSuccess: () => void;
}

export default function AuthUI({ setGarage, onLoginSuccess }: AuthUIProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('用户名和密码不能为空');
      return;
    }
    
    // Pure frontend mock
    const uid = 'local_' + Math.random().toString(36).substring(2, 9);
    
    setGarage(p => ({
      ...p,
      profile: {
        ...p.profile,
        uid: isLogin ? p.profile.uid : uid, // if register, mock new uid
        nickname: username,
      }
    }));
    
    onLoginSuccess();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d0e15] overflow-hidden">
      {/* Background neon effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-[#00f2ff]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-[#ff0055]/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden neon-panel"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#00f2ff]/5 to-[#ff0055]/5 opacity-50" />
        
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-4xl font-black italic tracking-widest text-center mb-2 leading-none">
            <span className="text-white">NEON</span>
            <span className="text-[#00f2ff]"> RACING</span>
          </h1>
          <p className="text-zinc-400 text-center text-sm font-mono mb-8 opacity-60">
            {isLogin ? 'SYSTEM.AUTH.LOGIN' : 'SYSTEM.AUTH.REGISTER'}
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00f2ff] transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="车手代号 (Username)"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-all font-mono"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#ff0055] transition-colors" size={18} />
                <input
                  type="password"
                  placeholder="访问密钥 (Password)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-[#ff0055] focus:ring-1 focus:ring-[#ff0055] transition-all font-mono"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-sm font-mono text-center flex justify-center overflow-hidden"
                >
                  <span className="pt-2">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                isLogin 
                  ? 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:shadow-[0_0_25px_rgba(0,242,255,0.6)]' 
                  : 'bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055] hover:bg-[#ff0055] hover:text-white shadow-[0_0_15px_rgba(255,0,85,0.3)] hover:shadow-[0_0_25px_rgba(255,0,85,0.6)]'
              }`}
            >
              {isLogin ? (
                <>
                  <KeyRound size={18} />
                  <span>授权接入</span>
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  <span>建立新档案</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="group flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-mono transition-colors"
            >
              {isLogin ? (
                <>
                  <span>未受限人员？</span>
                  <span className="text-[#ff0055] group-hover:underline">前往注册</span>
                </>
              ) : (
                <>
                  <span>已有档案？</span>
                  <span className="text-[#00f2ff] group-hover:underline">返回登录</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
