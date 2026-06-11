'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Film, Search, User, LogOut, Loader2, ChevronDown, Bell, Menu, X, Clock } from 'lucide-react';
import { authApi, catalogApi, UserPayload, MoviePayload } from '../lib/api';

interface HeaderProps {
  onSearchChange?: (val: string) => void;
}

export default function Header({ onSearchChange }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [moviesCache, setMoviesCache] = useState<MoviePayload[]>([]);
  const [genresCache, setGenresCache] = useState<{ id: string; name: string; slug: string; _count?: { movies: number } }[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [user, setUser] = useState<UserPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);


  // Watch History popover state
  interface LocalWatchHistoryItem {
    id: string;
    episodeId: string;
    movieId: string;
    movieTitle: string;
    episodeNumber: number;
    progress: number;
    duration: number;
    thumbnail: string;
    updatedAt: string;
  }
  const [watchHistory, setWatchHistory] = useState<LocalWatchHistoryItem[]>([]);

  const loadWatchHistory = () => {
    try {
      const stored = localStorage.getItem('donghua3d_local_watch_history');
      if (stored) {
        setWatchHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to parse watch history:', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWatchHistory();
    
    // Auto-sync history across tabs instantly
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'donghua3d_local_watch_history') {
        loadWatchHistory();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
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

    async function fetchGenres() {
      try {
        const { genreApi } = await import('../lib/api');
        const res = await genreApi.getGenres();
        if (res.success && res.data) {
          setGenresCache(res.data);
        }
      } catch (err) {
        console.error('Failed to load genres:', err);
      }
    }
    fetchGenres();
  }, []);

  // Professional Escape Key handler to close drawer or modal instantly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setShowModal(false);
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#profile-dropdown-container')) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [profileMenuOpen]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const handleSearchFocus = async () => {
    setIsSearchFocused(true);
    if (moviesCache.length === 0) {
      setSearchLoading(true);
      const res = await catalogApi.getMovies();
      if (res.success && res.data) {
        setMoviesCache(res.data);
      }
      setSearchLoading(false);
    }
  };

  const handleSearchBlur = () => {
    setTimeout(() => setIsSearchFocused(false), 200);
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
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault();
      window.location.href = '/';
    }
  };

  const handleLogout = () => {
    authApi.logout();
    setUser(null);
    router.refresh();
  };

  return (
    <>

      <header className="sticky top-0 z-50 w-full bg-[#050508]/85 backdrop-blur-md border-b border-zinc-900/50">
        <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16 h-20 md:h-[88px] flex items-center justify-between">
          {/* Left Side: Logo + Navigation clustered together */}
          <div className="flex items-center gap-4 sm:gap-10 md:gap-14">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-zinc-400 hover:text-white bg-transparent border-0 cursor-pointer outline-none flex items-center justify-center transition-colors"
              title="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Logo Brand */}
            <Link href="/" onClick={handleLogoClick} className="flex items-center gap-2 sm:gap-3 text-white no-underline group select-none flex-shrink-0">
              <div className="p-1.5 sm:p-2 rounded-[4px] bg-violet-600 flex items-center justify-center transition-all duration-300 group-hover:bg-violet-500 shadow-md">
                <Film className="w-4 sm:w-4.5 h-4 sm:h-4.5 text-white" />
              </div>
              <span className="font-sans font-black text-base sm:text-lg md:text-xl tracking-wider text-white">
                DONGHUA<span className="text-violet-500">3D</span>
              </span>
            </Link>

            {/* Navigation Tabs (Desktop only: hidden lg:flex) */}
            <nav className="hidden lg:flex items-center gap-6 md:gap-8 select-none">
              <Link
                href="/"
                onClick={handleLogoClick}
                className={`relative text-xs font-black uppercase tracking-wider no-underline transition-colors duration-200 py-2.5 ${
                  pathname === '/' ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Trang Chủ
                {pathname === '/' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-violet-500 rounded-full" />
                )}
              </Link>
              <Link
                href="/leaderboard"
                className={`relative text-xs font-black uppercase tracking-wider no-underline transition-colors duration-200 py-2.5 ${
                  pathname === '/leaderboard' ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Bảng Xếp Hạng
                {pathname === '/leaderboard' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-violet-500 rounded-full" />
                )}
              </Link>
              <Link
                href="/watchlist"
                className={`relative text-xs font-black uppercase tracking-wider no-underline transition-colors duration-200 py-2.5 ${
                  pathname === '/watchlist' ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Danh Sách Của Tôi
                {pathname === '/watchlist' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-violet-500 rounded-full" />
                )}
              </Link>
              
              {/* Thể Loại Dropdown */}
              <div className="relative group/genre cursor-pointer py-2.5">
                <div className={`relative text-xs font-black uppercase tracking-wider no-underline transition-colors duration-200 flex items-center gap-1 ${
                  pathname.startsWith('/genres') ? 'text-white' : 'text-zinc-400 group-hover/genre:text-white'
                }`}>
                  Thể Loại
                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover/genre:rotate-180" />
                  {pathname.startsWith('/genres') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-violet-500 rounded-full" />
                  )}
                </div>
                <div className="absolute left-0 top-full pt-2 w-96 opacity-0 invisible group-hover/genre:opacity-100 group-hover/genre:visible transition-all duration-300 transform translate-y-2 group-hover/genre:translate-y-0 z-50">
                  <div className="bg-[#0c0c10]/95 backdrop-blur-xl border border-zinc-900 rounded-[4px] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] grid grid-cols-2 gap-2">
                    {genresCache.length > 0 ? (
                      genresCache.map((g) => (
                        <Link 
                          key={g.id} 
                          href={`/genres/${g.slug}`}
                          className="px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-[2px] transition-colors no-underline flex items-center justify-between group/item"
                        >
                          <span>{g.name}</span>
                          {g._count?.movies !== undefined && (
                            <span className="text-[9px] text-zinc-600 group-hover/item:text-violet-400 bg-zinc-950 px-1.5 py-0.5 rounded-[2px]">
                              {g._count.movies}
                            </span>
                          )}
                        </Link>
                      ))
                    ) : (
                      <div className="col-span-2 text-center text-xs text-zinc-500 py-2">Đang tải...</div>
                    )}
                  </div>
                </div>
              </div>
            </nav>
          </div>

          {/* Right Side: Search + Actions clustered together */}
          <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
            {/* Search Bar Input Container (Always Visible) */}
            <div className="relative flex items-center gap-3 px-4 py-2.5 rounded-[4px] bg-black/50 border border-zinc-800/80 focus-within:border-violet-500/80 focus-within:bg-black/85 transition-all duration-300 w-40 sm:w-48 lg:w-64 hidden md:flex shadow-inner">
              <Search className="w-4 h-4 text-zinc-400 flex-shrink-0 transition-colors" />
              <input
                type="text"
                placeholder="Tìm kiếm phim..."
                value={searchVal}
                onChange={handleSearch}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-xs outline-none border-0 p-0 focus:ring-0 focus:outline-none"
              />
              
              {/* Search Suggestions Dropdown */}
              {isSearchFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0c0c10]/95 backdrop-blur-xl border border-zinc-900 rounded-[4px] shadow-2xl z-50 overflow-hidden flex flex-col">
                  {searchLoading ? (
                    <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-violet-500" /></div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col">
                      {searchVal.trim() === '' ? (
                        <>
                          <div className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-900">
                            Phim Trending
                          </div>
                          {moviesCache
                            .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
                            .slice(0, 5)
                            .map((m) => (
                              <Link key={m.id} href={`/movies/${m.slug || m.id}`} className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900/80 border-b border-zinc-900/50 no-underline group last:border-0">
                                <div className="w-8 h-10 bg-zinc-800 rounded-[2px] overflow-hidden flex-shrink-0 border border-zinc-800 group-hover:border-violet-500/40">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={m.posterUrl || '/static/uploads/default_poster.jpg'} alt={m.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-xs font-bold text-zinc-200 group-hover:text-violet-400 truncate">{m.title}</span>
                                  <span className="text-[9px] text-zinc-500 truncate">{m.altTitles[0] || m.releaseYear}</span>
                                </div>
                              </Link>
                            ))}
                        </>
                      ) : (
                        <>
                          <div className="px-3 py-2 text-[9px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-900">
                            Kết Quả Tìm Kiếm
                          </div>
                          {moviesCache
                            .filter(m => 
                              m.title.toLowerCase().includes(searchVal.toLowerCase()) || 
                              m.altTitles.some(a => a.toLowerCase().includes(searchVal.toLowerCase()))
                            )
                            .slice(0, 5)
                            .map((m) => (
                              <Link key={m.id} href={`/movies/${m.slug || m.id}`} className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900/80 border-b border-zinc-900/50 no-underline group last:border-0">
                                <div className="w-8 h-10 bg-zinc-800 rounded-[2px] overflow-hidden flex-shrink-0 border border-zinc-800 group-hover:border-violet-500/40">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={m.posterUrl || '/static/uploads/default_poster.jpg'} alt={m.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-xs font-bold text-zinc-200 group-hover:text-violet-400 truncate">{m.title}</span>
                                  <span className="text-[9px] text-zinc-500 truncate">{m.altTitles[0] || m.releaseYear}</span>
                                </div>
                              </Link>
                            ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right action area */}
            <div className="flex items-center gap-4">
              {/* User Auth Buttons */}
              {loading ? (
                <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
              ) : user ? (
                <div className="flex items-center gap-3 sm:gap-5 pl-3 sm:pl-5 border-l border-zinc-850">
                  {/* Notification Bell with Violet Indicator Dot */}
                  <div className="relative cursor-pointer hover:text-white text-zinc-400 p-2 transition-colors hidden sm:block" title="Thông báo">
                    <Bell className="w-4.5 h-4.5 transition-transform hover:scale-110 duration-200" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-600 ring-2 ring-[#050508]" />
                  </div>

                  {/* ==============================================================================
                     POPOVER LỊCH SỬ XEM PHIM CAO CẤP TRÊN HEADER
                     ============================================================================== */}
                  <div className="relative group select-none hidden sm:block">
                    <button 
                      onClick={loadWatchHistory}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-bold bg-transparent border-0 cursor-pointer outline-none p-2 transition-colors"
                    >
                      <Clock className="w-4.5 h-4.5 text-violet-400" />
                      <span>Lịch Sử</span>
                    </button>

                    {/* Dropdown Menu trượt xuất hiện mượt mà khi hover */}
                    <div className="absolute right-0 top-full pt-2 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-50">
                      <div className="bg-[#0c0c10]/95 backdrop-blur-xl border border-zinc-900 rounded-[4px] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-zinc-900/60 pb-2">
                          <span className="text-[10px] font-black text-white uppercase tracking-wider">Tập phim vừa xem</span>
                          <Link href="/watchlist" className="text-[10px] text-violet-400 hover:text-violet-300 font-bold no-underline uppercase tracking-wider">Xem tất cả</Link>
                        </div>

                        {/* Danh sách các mục lịch sử */}
                        <div className="flex flex-col gap-2.5 max-h-[250px] overflow-y-auto pr-1">
                          {watchHistory.length > 0 ? (
                            watchHistory.map((hist) => (
                              <Link 
                                key={hist.id} 
                                href={`/movies/${hist.movieId}/episodes/${hist.episodeId}`}
                                className="flex items-center gap-3 p-1.5 rounded-[2px] bg-zinc-950/40 hover:bg-zinc-900 border border-transparent hover:border-zinc-850/60 transition-all no-underline"
                              >
                                {/* Thẻ ảnh nhỏ đại diện tập */}
                                <div className="w-16 h-10 rounded-[2px] bg-zinc-900 overflow-hidden flex-shrink-0 relative border border-zinc-850">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={hist.thumbnail || '/placeholder_thumb.png'} alt="thumbnail" className="w-full h-full object-cover" />
                                  {/* Thanh tiến độ nhỏ dưới ảnh */}
                                  <div className="absolute bottom-0 left-0 h-1 bg-violet-600" style={{ width: `${Math.min(100, (hist.progress / hist.duration) * 100)}%` }} />
                                </div>
                                <div className="flex flex-col gap-0.5 overflow-hidden text-left">
                                  <span className="text-[11px] font-bold text-zinc-200 truncate">{hist.movieTitle}</span>
                                  <span className="text-[9px] font-semibold text-zinc-550">Tập {hist.episodeNumber} - Đang xem {Math.max(1, Math.floor(hist.progress / 60))}m</span>
                                </div>
                              </Link>
                            ))
                          ) : (
                            <div className="text-center py-6 text-[11px] text-zinc-600 italic">
                              Bạn chưa xem bộ phim nào gần đây.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div id="profile-dropdown-container" className="relative select-none">
                    <div 
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                      className="flex items-center gap-2 sm:gap-3.5 cursor-pointer group" 
                      title="Hồ sơ"
                    >
                      <div className="flex flex-col text-right hidden xs:flex">
                        <span className="text-[11px] sm:text-xs font-black text-white max-w-[80px] sm:max-w-[120px] truncate tracking-tight">{user.email.split('@')[0]}</span>
                        <span className="text-[8px] sm:text-[9px] text-violet-400 font-black uppercase tracking-widest mt-0.5">Rep: {user.reputationScore}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-[4px] bg-violet-600 text-white font-black flex items-center justify-center text-xs sm:text-sm shadow-md transition-all duration-300 group-hover:scale-105 group-hover:bg-violet-500 ring-1 ring-violet-500/30">
                          {user.email[0].toUpperCase()}
                        </div>
                        <ChevronDown className={`w-3.5 sm:w-4 h-3.5 sm:h-4 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 ${profileMenuOpen ? 'rotate-180 text-violet-400' : ''}`} />
                      </div>
                    </div>

                    {/* Premium Profile Dropdown Menu */}
                    {profileMenuOpen && (
                      <div className="absolute right-0 top-full pt-2 w-56 animate-fade-in-up z-50">
                        <div className="bg-[#0c0c10]/95 backdrop-blur-xl border border-zinc-900 rounded-[4px] p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col gap-1">
                          {/* User info section inside dropdown for mobile/tablet where text is hidden */}
                          <div className="px-3 py-2 border-b border-zinc-900/60 flex flex-col gap-0.5 xs:hidden">
                            <span className="text-xs font-black text-white truncate">{user.email}</span>
                            <span className="text-[9px] text-violet-400 font-black uppercase tracking-widest">Rep: {user.reputationScore}</span>
                          </div>
                          
                          {/* Admin Dashboard Option if role is ADMIN */}
                          {user.role === 'ADMIN' && (
                            <Link
                              href="/admin/dashboard"
                              onClick={() => setProfileMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[2px] text-xs font-bold text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all no-underline"
                            >
                              <User className="w-4 h-4" />
                              <span>Quản Trị Admin</span>
                            </Link>
                          )}

                          <Link
                            href="/watchlist"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-[2px] text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all no-underline"
                          >
                            <Clock className="w-4 h-4 text-zinc-550" />
                            <span>Danh Sách Của Tôi</span>
                          </Link>

                          <button
                            onClick={() => {
                              setProfileMenuOpen(false);
                              handleLogout();
                            }}
                            className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-[2px] text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-0 bg-transparent cursor-pointer transition-all outline-none"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Đăng Xuất</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAuthMode('login'); setShowModal(true); }}
                  className="rounded-[4px] px-3 sm:px-5 py-2 sm:py-3 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer outline-none border-0 shadow-md hover:shadow-[0_4px_20px_rgba(124,58,237,0.3)] active:scale-95"
                >
                  <User className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  <span className="hidden xxs:inline">Đăng Nhập</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sliding Sidebar Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden select-none">
          {/* Backdrop */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
          />
          {/* Sidebar Panel */}
          <div className="absolute top-20 left-0 bottom-0 w-72 bg-[#050508]/98 border-r border-zinc-900/80 p-6 flex flex-col gap-6 shadow-2xl transition-transform duration-300 ease-out">
            {/* Quick Profile stats on Mobile Sidebar */}
            {user && (
              <div className="flex items-center gap-3.5 border-b border-zinc-900/80 pb-5 mb-1">
                <div className="w-10 h-10 rounded-[4px] bg-violet-600 text-white font-black flex items-center justify-center text-sm shadow-md ring-1 ring-violet-500/30">
                  {user.email[0].toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white truncate max-w-[160px]">{user.email.split('@')[0]}</span>
                  <span className="text-[9px] text-violet-400 font-black uppercase tracking-widest mt-0.5">Uy tín: {user.reputationScore} Rep</span>
                </div>
              </div>
            )}

            {/* Nav Links */}
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-xs font-black uppercase tracking-wider no-underline transition-colors duration-200 py-3.5 px-4 rounded-[4px] flex items-center justify-between ${
                  pathname === '/' ? 'text-white bg-violet-600/10 border-l-2 border-violet-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                }`}
              >
                Trang Chủ
              </Link>
              <Link
                href="/leaderboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-xs font-black uppercase tracking-wider no-underline transition-colors duration-200 py-3.5 px-4 rounded-[4px] flex items-center justify-between ${
                  pathname === '/leaderboard' ? 'text-white bg-violet-600/10 border-l-2 border-violet-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                }`}
              >
                Bảng Xếp Hạng
              </Link>
              <Link
                href="/watchlist"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-xs font-black uppercase tracking-wider no-underline transition-colors duration-200 py-3.5 px-4 rounded-[4px] flex items-center justify-between ${
                  pathname === '/watchlist' ? 'text-white bg-violet-600/10 border-l-2 border-violet-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-950/40'
                }`}
              >
                Danh Sách Của Tôi
              </Link>
            </nav>

            {/* Mobile Search Bar inside Sidebar (if handler provided) */}
            {onSearchChange && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-[4px] bg-black/60 border border-zinc-900 focus-within:border-violet-500/80 transition-all duration-300 mt-auto shadow-inner">
                <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Tìm kiếm phim..."
                  value={searchVal}
                  onChange={handleSearch}
                  className="w-full bg-transparent text-zinc-100 placeholder-zinc-600 text-xs outline-none border-0 p-0 focus:ring-0 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in-up">
          <div className="w-full max-w-sm p-6 relative rounded-[4px] bg-[#0c0c0f] border border-zinc-800/80 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-transparent border-0 cursor-pointer text-sm font-bold outline-none"
            >
              ✕
            </button>
            
            <h2 className="text-xl text-white font-extrabold mb-1 text-center tracking-tight">
              {authMode === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}
            </h2>
            <p className="text-xs text-zinc-500 text-center mb-5">
              {authMode === 'login' ? 'Kết nối với cộng đồng 3D Donghua chất lượng cao' : 'Nhập thông tin đăng ký tài khoản miễn phí'}
            </p>

            {errorMsg && (
              <div className="bg-rose-500/5 border border-rose-500/20 text-rose-400 rounded-[4px] p-2.5 text-xs text-center mb-4">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Email Đăng Nhập</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black/50 border border-zinc-800 focus:border-violet-500 text-white rounded-[4px] py-2.5 px-3.5 text-xs outline-none transition-all duration-300"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Mật Khẩu</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/50 border border-zinc-800 focus:border-violet-500 text-white rounded-[4px] py-2.5 px-3.5 text-xs outline-none transition-all duration-300"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 mt-2 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs tracking-wider uppercase transition-all duration-300 active:scale-95 shadow-md flex items-center justify-center disabled:opacity-50 border-0 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
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
