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
      <header className="glass-card fixed top-4 left-4 right-4 z-50 rounded-full py-3 px-8 flex items-center justify-between" style={{ background: 'rgba(10, 10, 14, 0.75)' }}>
        {/* Logo Brand */}
        <Link href="/" className="flex items-center gap-2 text-white no-underline">
          <div className="p-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center glow-primary" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}>
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="font-sans font-extrabold text-xl tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            DONGHUA<span className="text-white">3D</span>
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
              className="input-cinema w-full pl-12 pr-4 rounded-full py-2 bg-zinc-900/60 border border-white/10"
              style={{ fontSize: '0.9rem' }}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className={`flex items-center gap-2 text-sm font-semibold no-underline transition-colors ${
              pathname === '/' ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Trang Chủ
          </Link>
          <Link
            href="/leaderboard"
            className={`flex items-center gap-2 text-sm font-semibold no-underline transition-colors ${
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
            <div className="flex items-center gap-4 border-l border-white/10 pl-4">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-white max-w-[120px] truncate">{user.email.split('@')[0]}</span>
                <span className="text-[10px] text-amber-400 font-bold">Rep: {user.reputationScore}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setAuthMode('login'); setShowModal(true); }}
              className="btn-cinema btn-cinema-primary rounded-full px-5 py-2 flex items-center gap-2"
              style={{ fontSize: '0.85rem' }}
            >
              <User className="w-4 h-4" />
              Đăng Nhập
            </button>
          )}
        </nav>
      </header>

      {/* Auth Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center animate-fade-in-up p-4">
          <div className="glass-card w-full max-w-md p-8 relative rounded-2xl" style={{ background: '#121216' }}>
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-transparent border-0 cursor-pointer text-lg font-bold"
            >
              ✕
            </button>
            
            <h2 className="text-2xl text-white mb-2 text-center">
              {authMode === 'login' ? 'Đăng Nhập Hệ Thống' : 'Tạo Tài Khoản Mới'}
            </h2>
            <p className="text-sm text-zinc-400 text-center mb-6">
              {authMode === 'login' ? 'Kết nối với cộng đồng 3D Donghua chất lượng cao' : 'Nhập thông tin đăng ký tài khoản miễn phí'}
            </p>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-sm text-center mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-semibold uppercase">Email Đăng Ký</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-cinema"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-semibold uppercase">Mật Khẩu</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-cinema"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-cinema btn-cinema-primary w-full py-3 mt-2 flex items-center justify-center"
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

            <div className="border-t border-white/10 mt-6 pt-4 text-center">
              <span className="text-sm text-zinc-400">
                {authMode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
              </span>
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="ml-2 text-sm text-violet-400 hover:text-violet-300 font-semibold bg-transparent border-0 cursor-pointer underline"
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
