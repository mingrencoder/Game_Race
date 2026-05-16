import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerData } from '../types';
import { User, Lock, ArrowRight, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';

interface AuthUIProps {
  setGarage: React.Dispatch<React.SetStateAction<PlayerData>>;
  onLoginSuccess: () => void;
}

/**
 * 玩家登录与注册统一认证入口界面
 * 使用 JWT 保存在 localStorage 中，实现无状态的会话持久化
 */
export default function AuthUI({ setGarage, onLoginSuccess }: AuthUIProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<{ uid: string; username: string; token: string } | null>(null);

  const proceedToLogin = (token: string) => {
    setIsLoading(true);
    localStorage.setItem('neon_token', token);
    
    fetch('/api/player/profile', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(profileRes => {
      if (!profileRes.ok) {
        return profileRes.json().then(err => {
          throw new Error(err.error || `档案握手失败 (HTTP ${profileRes.status})`);
        });
      }
      return profileRes.json();
    })
    .then(profileData => {
      // 3. 【核心修复】严格对齐后端 PlayerController 下发的 data 键名
      if (profileData.success && profileData.data) {
        setGarage(profileData.data); // 将底层档案全量同步至前端大盘
        onLoginSuccess();
      } else {
        throw new Error(profileData.error || '底层数据包负载缺失，大盘重构中断');
      }
    })
    .catch(err => {
      setError(err.message || '系统连接超时或中断');
      setIsLoading(false);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('车手代号和访问密钥不能为空');
      return;
    }
    
    if (password.length < 6 || password.length > 16) {
      setError('访问密钥长度必须在6到16位之间');
      return;
    }
    
    setIsLoading(true);
    
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password: password.trim() })
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || err.message || '认证请求遭到驳回'); });
      }
      return res.json();
    })
    .then(data => {
      // 1. 校验首层登录凭证回执
      if (data.success && data.token) {
        if (!isLogin) {
          // If it was registration, show the success screen first
          setIsLoading(false);
          setRegisteredUser({
            uid: data.user.uid,
            username: data.user.username,
            token: data.token
          });
        } else {
          // Normal login
          proceedToLogin(data.token);
        }
      } else {
        throw new Error(data.error || data.message || '服务端未返回有效访问令牌');
      }
    })
    .catch(err => {
      setError(err.message || '系统连接超时或中断');
      setIsLoading(false);
    });
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
            <span className="text-white">跑跑</span>
            <span className="text-[#00f2ff]"> 赛车</span>
          </h1>
          
          {registeredUser ? (
            <div className="w-full mt-6 text-center">
              <CheckCircle2 className="mx-auto text-green-400 mb-4" size={48} />
              <h2 className="text-xl font-bold text-white mb-2">档案创建成功</h2>
              <p className="text-zinc-400 text-sm mb-6">您的专属车手信息已记录：</p>
              
              <div className="bg-black/50 border border-white/10 rounded-lg p-4 mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-500 font-mono text-sm">车手代号</span>
                  <span className="text-[#00f2ff] font-bold">{registeredUser.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-mono text-sm">通行证 ID</span>
                  <span className="text-[#ff0055] font-mono text-xl tracking-widest">{registeredUser.uid}</span>
                </div>
              </div>

              <div className="text-xs text-red-400/80 mb-6 font-mono bg-red-400/10 p-2 rounded border border-red-400/20">
                请牢记您的通行证 ID 与安全密钥，这是找回账号丢失数据的唯一凭证！
              </div>

              <button
                onClick={() => proceedToLogin(registeredUser.token)}
                disabled={isLoading}
                className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-300 bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:shadow-[0_0_25px_rgba(0,242,255,0.6)] disabled:opacity-70 disabled:cursor-wait"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>系统连接中...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} />
                    <span>立即进入系统</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <p className="text-zinc-400 text-center text-sm font-mono mb-8 opacity-60">
                {isLogin ? '身份验证 (AUTH)' : '新车手档案录入'}
              </p>

              <form onSubmit={handleSubmit} className="w-full space-y-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00f2ff] transition-colors" size={18} />
                    <input
                      type="text"
                      placeholder={isLogin ? "请输入您的车手代号/ID..." : "请输入您的车手代号..."}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError('');
                      }}
                      disabled={isLoading}
                      className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-all font-mono disabled:opacity-50"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#ff0055] transition-colors" size={18} />
                    <input
                      type="password"
                      placeholder="请输入安全密钥(6-16位)..."
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      minLength={6}
                      maxLength={16}
                      disabled={isLoading}
                      className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-[#ff0055] focus:ring-1 focus:ring-[#ff0055] transition-all font-mono disabled:opacity-50"
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
                  disabled={isLoading}
                  className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-70 disabled:cursor-wait ${
                    isLogin 
                      ? 'bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff] hover:bg-[#00f2ff] hover:text-black shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:shadow-[0_0_25px_rgba(0,242,255,0.6)]' 
                      : 'bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055] hover:bg-[#ff0055] hover:text-white shadow-[0_0_15px_rgba(255,0,85,0.3)] hover:shadow-[0_0_25px_rgba(255,0,85,0.6)]'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>系统连接中...</span>
                    </>
                  ) : isLogin ? (
                    <>
                      <KeyRound size={18} />
                      <span>验证并登入系统</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight size={18} />
                      <span>建立车手档案</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!isLoading) {
                      setIsLogin(!isLogin);
                      setError('');
                    }
                  }}
                  disabled={isLoading}
                  className="group flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-mono transition-colors disabled:opacity-50"
                >
                  {isLogin ? (
                    <>
                      <span>尚未拥有档案？</span>
                      <span className="text-[#ff0055] group-hover:underline">申请成为新车手</span>
                    </>
                  ) : (
                    <>
                      <span>已有最高权限？</span>
                      <span className="text-[#00f2ff] group-hover:underline">返回身份验证</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
