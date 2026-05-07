'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Film, Search, Trophy, LayoutGrid, User, LogOut, Loader2 } from 'lucide-react';
import { authApi, UserPayload } from '../lib/api';

interface HeaderProps {
  onSearchChange?: (val: string) => void;
}

export default function Header({ onSearchChange }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchVal, setSearchVal] = useState('');
  const [user, setUser] = useState<UserPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load profile state on mount
  useEffect(() => {
    async function fetchMe() {
      const token = localStorage.getItem('donghua3d_token');
      if (token) {
        const res = await authApi.getMe();
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          authApi.logout(); // Clear bad/expired token
        }
      }
      setLoading(false);
    }
    fetchMe();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      let res;
      if (authMode === 'login') {
        res = await authApi.login(email, password);
      } else {
        res = await authApi.register(email, password);
      }

      if (res.success && res.data) {
        setUser(res.data.user);
        setShowModal(false);
        setEmail('');
        setPassword('');
        router.refresh();
      } else {
        setErrorMsg(res.error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } catch (err) {
      setErrorMsg('Không thể kết nối đến máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    setUser(null);
    router.refresh();
  };

  return (
    <>
      <header className="fixed top-4 left-4 right-4 z-50 rounded-full py-3 px-8 flex items-center justify-between bg-zinc-950/75 backdrop-blur-md border border-zinc-800/80 shadow-2xl">
        {/* Logo Brand */}
        <Link href="/" className="flex items-center gap-2 text-white no-underline group select-none">
          <div className="p-2 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)] group-hover:scale-105 transition-transform duration-300">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="font-sans font-extrabold text-xl tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            DONGHUA<span className="text-white transition-all duration-300 group-hover:text-violet-400">3D</span>
          </span>
        </Link>

        {/* Search Bar Input */}
        {onSearchChange && (
          <div className="relative w-full max-w-md mx-8 hidden md:block">
            <input
              type="text"
              placeholder="Tìm kiếm phim, tựa đề dịch..."
              value={searchVal}
              onChange={handleSearch}
              className="w-full pl-12 pr-4 rounded-full py-2 bg-zinc-900/60 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-zinc-100 placeholder-zinc-500 outline-none transition-all text-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-6 select-none">
          <Link
            href="/"
            className={`flex items-center gap-2 text-sm font-semibold no-underline transition-all duration-300 hover:scale-105 ${
              pathname === '/' ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Trang Chủ
          </Link>
          <Link
            href="/leaderboard"
            className={`flex items-center gap-2 text-sm font-semibold no-underline transition-all duration-300 hover:scale-105 ${
              pathname === '/leaderboard' ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Bảng Xếp Hạng
          </Link>

          {/* User Auth Buttons */}
          {loading ? (
            <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-4 border-l border-zinc-800 pl-4">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-white max-w-[120px] truncate">{user.email.split('@')[0]}</span>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Rep: {user.reputationScore}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-full bg-zinc-900/60 border border-zinc-800 hover:bg-rose-500/10 hover:border-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setAuthMode('login'); setShowModal(true); }}
              className="rounded-full px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-[13px] tracking-wide flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer outline-none"
            >
              <User className="w-4 h-4" />
              Đăng Nhập
            </button>
          )}
        </nav>
      </header>

      {/* Auth Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in-up">
          <div className="w-full max-w-md p-8 relative rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2.5 text-zinc-400 hover:text-white bg-transparent border-0 cursor-pointer text-lg font-bold outline-none"
            >
              ✕
            </button>
            
            <h2 className="text-2xl text-white font-extrabold mb-2 text-center tracking-tight">
              {authMode === 'login' ? 'Đăng Nhập Hệ Thống' : 'Tạo Tài Khoản Mới'}
            </h2>
            <p className="text-xs text-zinc-400 text-center mb-6">
              {authMode === 'login' ? 'Kết nối với cộng đồng 3D Donghua chất lượng cao' : 'Nhập thông tin đăng ký tài khoản miễn phí'}
            </p>

            {errorMsg && (
              <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 rounded-xl p-3 text-sm text-center mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Email Đăng Ký</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-white rounded-xl p-3.5 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Mật Khẩu</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-white rounded-xl p-3.5 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-md flex items-center justify-center disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : authMode === 'login' ? (
                  'Đăng Nhập'
                ) : (
                  'Đăng Ký Tài Khoản'
                )}
              </button>
            </form>

            <div className="border-t border-zinc-900 mt-6 pt-5 text-center">
              <span className="text-xs text-zinc-400">
                {authMode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
              </span>
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="ml-2 text-xs text-violet-400 hover:text-violet-300 font-bold bg-transparent border-0 cursor-pointer underline outline-none"
              >
                {authMode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
