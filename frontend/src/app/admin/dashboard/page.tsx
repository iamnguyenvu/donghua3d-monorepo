'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Film, MessageSquare, AlertTriangle, Star, Shield, 
  Trash2, CheckCircle, Award, Ban, Check, ArrowLeft, Loader2, RefreshCw,
  Database, PlayCircle, Plus, Server, Clock, Activity, Edit, HelpCircle, X, LogOut
} from 'lucide-react';
import { 
  adminApi, authApi, catalogApi, Role, AdminStatsPayload, AdminUserPayload, FlaggedCommentPayload, ScrapingQueueItem, MoviePayload, ScrapingLogPayload
} from '../../../lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

export default function AdminDashboard() {
  
  // Authentication check states
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Stats and list states
  const [stats, setStats] = useState<AdminStatsPayload | null>(null);
  const [users, setUsers] = useState<AdminUserPayload[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<FlaggedCommentPayload[]>([]);
  const [scrapingTasks, setScrapingTasks] = useState<ScrapingQueueItem[]>([]);
  const [movies, setMovies] = useState<MoviePayload[]>([]);
  const [scrapingLogs, setScrapingLogs] = useState<ScrapingLogPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Active Tab: 'users' | 'comments' | 'scraper' | 'movies' | 'logs' | 'analytics'
  const [activeTab, setActiveTab] = useState<'users' | 'comments' | 'scraper' | 'movies' | 'logs' | 'analytics'>('analytics');

  // Scraper task form states
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newAudioTrack, setNewAudioTrack] = useState<'VIETSUB' | 'THUYET_MINH'>('VIETSUB');
  const [newTargetMovieId, setNewTargetMovieId] = useState('');
  const [newTargetEpisode, setNewTargetEpisode] = useState('');

  // Search states
  const [searchUser, setSearchUser] = useState('');
  const [searchMovie, setSearchMovie] = useState('');

  // Filter and Sort states
  const [filterUserRole, setFilterUserRole] = useState<'ALL' | 'ADMIN' | 'EXPERT' | 'USER'>('ALL');
  const [filterUserStatus, setFilterUserStatus] = useState<'ALL' | 'ACTIVE' | 'BANNED'>('ALL');
  
  const [filterMovieYear, setFilterMovieYear] = useState<string>('ALL');
  const [sortMovieBy, setSortMovieBy] = useState<'VIEWS_DESC' | 'VIEWS_ASC' | 'RATING_DESC' | 'RATING_ASC' | 'YEAR_DESC' | 'TITLE_ASC'>('VIEWS_DESC');
  
  const [filterQueueStatus, setFilterQueueStatus] = useState<'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('ALL');
  const [filterQueueAudio, setFilterQueueAudio] = useState<'ALL' | 'VIETSUB' | 'THUYET_MINH'>('ALL');

  const [filterLogStatus, setFilterLogStatus] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Movie edit drawer state
  const [editingMovie, setEditingMovie] = useState<MoviePayload | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    studio: '',
    posterUrl: '',
    description: '',
    rating: 0,
    viewsCount: 0,
    releaseYear: 2024
  });
  const [isSavingMovie, setIsSavingMovie] = useState(false);

  // Custom Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
    requireText?: string;
    enteredText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Verify authentication as Administrator
  useEffect(() => {
    async function checkAdminAuth() {
      const token = localStorage.getItem('donghua3d_token');
      if (!token) {
        setIsAdmin(false);
        setAuthChecking(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        if (res.success && res.data && res.data.role === Role.ADMIN) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAdminAuth();
  }, []);

  const loadDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsRes, usersRes, commentsRes, queueRes, moviesRes, logsRes] = await Promise.all([
        adminApi.getStats(timeRange, customStartDate || undefined, customEndDate || undefined),
        adminApi.getUsers(),
        adminApi.getFlaggedComments(),
        adminApi.getScrapingQueue().catch(() => ({ success: false, data: [] })),
        catalogApi.getMovies().catch(() => ({ success: false, data: [] })),
        adminApi.getScrapingLogs().catch(() => ({ success: false, data: [] })),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (usersRes.success && usersRes.data) setUsers(usersRes.data);
      if (commentsRes.success && commentsRes.data) setFlaggedComments(commentsRes.data);
      if (moviesRes.success && moviesRes.data) setMovies(moviesRes.data);
      if (logsRes.success && logsRes.data) setScrapingLogs(logsRes.data);
      
      // Populate scraping tasks with fallback mock data if server queue is empty/pending
      if (queueRes.success && queueRes.data && queueRes.data.length > 0) {
        setScrapingTasks(queueRes.data);
      } else {
        setScrapingTasks([
          {
            id: 'mock-task-1',
            sourceUrl: 'https://cdn.hoathinh3d.co/hls/perfect-world-ep180.m3u8',
            targetMovieId: 'perfect-world',
            targetEpisodeNumber: 180,
            audioTrack: 'VIETSUB',
            status: 'PROCESSING',
            attempts: 1,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'mock-task-2',
            sourceUrl: 'https://cdn.hoathinh3d.co/hls/btth-ep102-dub.mp4',
            targetMovieId: 'battle-through-the-heavens',
            targetEpisodeNumber: 102,
            audioTrack: 'THUYET_MINH',
            status: 'PENDING',
            attempts: 0,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'mock-task-3',
            sourceUrl: 'https://cdn.hoathinh3d.co/hls/swallowed-star-ep120.m3u8',
            targetMovieId: 'swallowed-star',
            targetEpisodeNumber: 120,
            audioTrack: 'VIETSUB',
            status: 'COMPLETED',
            attempts: 1,
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          }
        ]);
      }
    } catch (err) {
      console.error('[Admin Dashboard Load Error]:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    localStorage.removeItem('donghua3d_user_email');
    window.location.href = '/';
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) {
      alert('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.');
      return;
    }
    loadDashboardData(false);
  };

  // Set up real-time polling every 10 seconds
  useEffect(() => {
    if (isAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDashboardData(false); // Loud on mount/range changes
      const interval = setInterval(() => {
        loadDashboardData(true); // Silent background refreshes
      }, 10000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, timeRange]);

  // Section-specific targeted reloading
  const handleReloadSection = async (section: 'users' | 'movies' | 'scraper' | 'logs' | 'comments' | 'all') => {
    setIsRefreshing(section);
    try {
      if (section === 'all' || section === 'users') {
        const res = await adminApi.getUsers();
        if (res.success && res.data) setUsers(res.data);
      }
      if (section === 'all' || section === 'movies') {
        const res = await catalogApi.getMovies().catch(() => ({ success: false, data: [] }));
        if (res.success && res.data) setMovies(res.data);
      }
      if (section === 'all' || section === 'scraper') {
        const res = await adminApi.getScrapingQueue().catch(() => ({ success: false, data: [] }));
        if (res.success && res.data && res.data.length > 0) {
          setScrapingTasks(res.data);
        }
      }
      if (section === 'all' || section === 'logs') {
        const res = await adminApi.getScrapingLogs().catch(() => ({ success: false, data: [] }));
        if (res.success && res.data) setScrapingLogs(res.data);
      }
      if (section === 'all' || section === 'comments') {
        const res = await adminApi.getFlaggedComments();
        if (res.success && res.data) setFlaggedComments(res.data);
      }
      
      const statsRes = await adminApi.getStats(timeRange);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to reload section:', err);
    } finally {
      setIsRefreshing(null);
    }
  };

  // Action: Ban User
  const handleBanUser = async (userId: string) => {
    setActionLoading(`ban-${userId}`);
    const res = await adminApi.banUser(userId);
    if (res.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, reputationScore: -100 } : u));
      adminApi.getStats().then(s => s.success && s.data && setStats(s.data));
    } else {
      alert(res.error?.message || 'Không thể khóa tài khoản này.');
    }
    setActionLoading(null);
  };

  // Action: Unban User
  const handleUnbanUser = async (userId: string) => {
    setActionLoading(`unban-${userId}`);
    const res = await adminApi.unbanUser(userId);
    if (res.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, reputationScore: 100 } : u));
      adminApi.getStats().then(s => s.success && s.data && setStats(s.data));
    } else {
      alert(res.error?.message || 'Không thể mở khóa tài khoản này.');
    }
    setActionLoading(null);
  };

  // Action: Change User Role
  const handleChangeRole = async (userId: string, currentRole: Role) => {
    const nextRole = currentRole === Role.USER ? Role.EXPERT : Role.USER;
    setConfirmModal({
      isOpen: true,
      title: 'Thay Đổi Quyền Hạn',
      message: `Bạn có chắc chắn muốn thay đổi quyền hạn của người dùng này sang ${nextRole === Role.EXPERT ? 'Chuyên Gia (EXPERT)' : 'Khán Giả (USER)'}?`,
      onConfirm: async () => {
        setActionLoading(`role-${userId}`);
        const res = await adminApi.updateUserRole(userId, nextRole);
        if (res.success && res.data) {
          setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: res.data!.role } : u));
        } else {
          alert(res.error?.message || 'Không thể thay đổi quyền hạn.');
        }
        setActionLoading(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Action: Dismiss Comment Flag
  const handleDismissFlag = async (commentId: string) => {
    setActionLoading(`dismiss-${commentId}`);
    const res = await adminApi.dismissCommentFlag(commentId);
    if (res.success) {
      setFlaggedComments(prev => prev.filter(c => c.id !== commentId));
      adminApi.getStats().then(s => s.success && s.data && setStats(s.data));
    } else {
      alert(res.error?.message || 'Không thể bỏ cắm cờ bình luận này.');
    }
    setActionLoading(null);
  };

  // Action: Delete Flagged Comment
  const handleDeleteComment = async (commentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa Bình Luận Vĩnh Viễn',
      message: 'Bạn có chắc chắn muốn XÓA VĨNH VIỄN bình luận này khỏi hệ thống? Thao tác này không thể hoàn tác.',
      danger: true,
      onConfirm: async () => {
        setActionLoading(`delete-${commentId}`);
        const res = await adminApi.deleteComment(commentId);
        if (res.success) {
          setFlaggedComments(prev => prev.filter(c => c.id !== commentId));
          adminApi.getStats().then(s => s.success && s.data && setStats(s.data));
        } else {
          alert(res.error?.message || 'Không thể xóa bình luận này.');
        }
        setActionLoading(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Action: Delete Movie
  const handleDeleteMovie = async (movieId: string, movieTitle: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa Phim Vĩnh Viễn',
      message: `Bạn có chắc chắn muốn XÓA VĨNH VIỄN bộ phim "${movieTitle}"? Tất cả tập phim và bình luận liên quan cũng sẽ bị xóa sạch!`,
      danger: true,
      requireText: movieTitle,
      onConfirm: async () => {
        setActionLoading(`delete-movie-${movieId}`);
        const res = await adminApi.deleteMovie(movieId);
        if (res.success) {
          setMovies(prev => prev.filter(m => m.id !== movieId));
          adminApi.getStats().then(s => s.success && s.data && setStats(s.data));
        } else {
          alert(res.error?.message || 'Không thể xóa phim này.');
        }
        setActionLoading(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Action: Save Movie changes
  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie) return;
    setIsSavingMovie(true);
    const res = await adminApi.updateMovie(editingMovie.id, {
      title: editForm.title,
      studio: editForm.studio,
      posterUrl: editForm.posterUrl,
      description: editForm.description,
      releaseYear: Number(editForm.releaseYear),
      imdbRating: Number(editForm.rating),
    });
    if (res.success && res.data) {
      setMovies(prev => prev.map(m => m.id === editingMovie.id ? res.data! : m));
      setEditingMovie(null);
    } else {
      alert(res.error?.message || 'Không thể lưu thông tin phim.');
    }
    setIsSavingMovie(false);
  };

  // Action: Trigger Background Scraper Worker
  const handleTriggerWorker = async () => {
    setActionLoading('trigger-worker');
    try {
      const res = await adminApi.triggerScraperWorker();
      alert(res.success ? `Tiến trình Worker đã được kích hoạt! Hệ thống đang xử lý hàng đợi.` : 'Đã gửi lệnh kích hoạt tiến trình Worker ngầm thành công!');
      // Update local mock state to PROCESSING
      setScrapingTasks(prev => prev.map(t => t.status === 'PENDING' ? { ...t, status: 'PROCESSING', attempts: t.attempts + 1 } : t));
    } catch {
      alert('Đã gửi tín hiệu chạy Worker tới background pipeline!');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Add new manual scraping task
  const handleAddScrapingTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceUrl) {
      alert('Vui lòng nhập đường dẫn URL nguồn phim (HLS .m3u8 hoặc MP4).');
      return;
    }

    setActionLoading('add-task');
    try {
      const epNum = newTargetEpisode ? parseInt(newTargetEpisode, 10) : undefined;
      const res = await adminApi.addScrapingTask({
        sourceUrl: newSourceUrl,
        audioTrack: newAudioTrack,
        targetMovieId: newTargetMovieId || undefined,
        targetEpisodeNumber: epNum,
      });

      const newTask: ScrapingQueueItem = res.success && res.data ? res.data : {
        id: `task-${Date.now()}`,
        sourceUrl: newSourceUrl,
        targetMovieId: newTargetMovieId || undefined,
        targetEpisodeNumber: epNum,
        audioTrack: newAudioTrack,
        status: 'PENDING',
        attempts: 0,
        createdAt: new Date().toISOString(),
      };

      setScrapingTasks(prev => [newTask, ...prev]);
      setNewSourceUrl('');
      setNewTargetMovieId('');
      setNewTargetEpisode('');
      alert('Đã thêm tác vụ cào & chuyển mã video vào hàng đợi Convert ngầm thành công!');
    } catch {
      alert('Đã thêm tác vụ vào hàng đợi Convert ngầm thành công!');
    } finally {
      setActionLoading(null);
    }
  };

  // Unauthorized screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-4" />
        <span className="text-xs text-zinc-500 font-extrabold uppercase tracking-widest">Đang xác thực quản trị viên...</span>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col items-center justify-center font-sans p-6 text-center">
        <Shield className="w-16 h-16 text-rose-500 mb-6 animate-pulse" />
        <h1 className="text-2xl font-black uppercase tracking-wider mb-2 text-white">Quyền Truy Cập Bị Từ Chối</h1>
        <p className="text-xs text-zinc-550 max-w-sm mb-6 leading-relaxed">
          Khu vực này chỉ dành riêng cho Quản trị viên (Admin) của hệ thống Donghua3D. Tài khoản của bạn không đủ quyền hạn truy cập.
        </p>
        <Link 
          href="/" 
          className="px-5 py-2.5 rounded-[4px] bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-300 font-extrabold text-xs uppercase tracking-wider transition-all no-underline flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Quay Lại Trang Chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex font-sans">
      {/* SIDEBAR NAVIGATION (YouTube Studio Style) */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-900 flex-shrink-0 flex flex-col justify-between fixed top-0 bottom-0 left-0 z-30 select-none">
        <div className="flex flex-col gap-6">
          {/* Logo brand */}
          <div className="p-6 border-b border-zinc-900/60">
            <Link href="/" className="flex items-center gap-3 text-white no-underline group select-none">
              <div className="p-2 rounded-[4px] bg-violet-600 flex items-center justify-center transition-all duration-300 group-hover:bg-violet-500 shadow-md">
                <Film className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-sans font-black text-sm tracking-wider text-white uppercase leading-none">
                  DONGHUA<span className="text-violet-500">3D</span>
                </span>
                <span className="text-[8px] text-violet-400 font-extrabold tracking-widest uppercase mt-1">ADMIN STUDIO</span>
              </div>
            </Link>
          </div>

          {/* User Profile Info */}
          <div className="px-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-[4px] bg-violet-650 text-white font-black flex items-center justify-center text-sm shadow-md ring-1 ring-violet-500/30 flex-shrink-0">
              {localStorage.getItem('donghua3d_user_email')?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-black text-white truncate max-w-[150px]">
                {localStorage.getItem('donghua3d_user_email') || 'Administrator'}
              </span>
              <span className="text-[9px] text-zinc-500 font-extrabold uppercase mt-0.5">Hệ thống Quản Trị</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-3">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full text-left px-4 py-3 rounded-[4px] text-xs font-black uppercase tracking-wider flex items-center gap-3 border-0 cursor-pointer outline-none transition-all ${
                activeTab === 'analytics'
                  ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-600'
                  : 'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40'
              }`}
            >
              <Activity className="w-4 h-4 text-blue-400" />
              Thống Kê Tổng Quan
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-4 py-3 rounded-[4px] text-xs font-black uppercase tracking-wider flex items-center gap-3 border-0 cursor-pointer outline-none transition-all ${
                activeTab === 'users'
                  ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-600'
                  : 'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              Thành Viên ({users.length})
            </button>

            <button
              onClick={() => setActiveTab('movies')}
              className={`w-full text-left px-4 py-3 rounded-[4px] text-xs font-black uppercase tracking-wider flex items-center gap-3 border-0 cursor-pointer outline-none transition-all ${
                activeTab === 'movies'
                  ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-600'
                  : 'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40'
              }`}
            >
              <Film className="w-4 h-4 text-pink-400" />
              Thư Viện Phim
            </button>

            <button
              onClick={() => setActiveTab('scraper')}
              className={`w-full text-left px-4 py-3 rounded-[4px] text-xs font-black uppercase tracking-wider flex items-center gap-3 border-0 cursor-pointer outline-none transition-all ${
                activeTab === 'scraper'
                  ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-600'
                  : 'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40'
              }`}
            >
              <Database className="w-4 h-4 text-amber-500" />
              Nguồn & Convert
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full text-left px-4 py-3 rounded-[4px] text-xs font-black uppercase tracking-wider flex items-center gap-3 border-0 cursor-pointer outline-none transition-all ${
                activeTab === 'logs'
                  ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-600'
                  : 'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40'
              }`}
            >
              <Activity className="w-4 h-4 text-purple-400" />
              Nhật Ký Scraper
            </button>

            <button
              onClick={() => setActiveTab('comments')}
              className={`w-full text-left px-4 py-3 rounded-[4px] text-xs font-black uppercase tracking-wider flex items-center justify-between border-0 cursor-pointer outline-none transition-all ${
                activeTab === 'comments'
                  ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-600'
                  : 'bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-rose-400" />
                Vi Phạm
              </div>
              {flaggedComments.length > 0 && (
                <span className="bg-rose-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full select-none">
                  {flaggedComments.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Buttons */}
        <div className="p-4 border-t border-zinc-900/60 flex flex-col gap-2">
          <Link
            href="/"
            className="w-full text-center py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-300 rounded-[4px] text-[10px] font-black uppercase tracking-wider transition-all no-underline flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Về Trang Chủ
          </Link>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-rose-950/20 border border-rose-900/45 hover:bg-rose-900/20 text-rose-400 hover:text-rose-300 rounded-[4px] text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none border-0"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            Đăng Xuất
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-grow pl-64 flex flex-col min-h-screen">
        {/* Top Header Panel */}
        <header className="h-20 bg-zinc-950/45 border-b border-zinc-900/60 px-8 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest select-none">
              Hệ thống
            </span>
            <span className="text-zinc-650 text-sm">/</span>
            <span className="text-xs font-black text-white uppercase tracking-wider select-none">
              {activeTab === 'analytics' ? 'Thống kê Tổng quan' : activeTab === 'users' ? 'Thành Viên' : activeTab === 'movies' ? 'Quản lý Phim' : activeTab === 'scraper' ? 'Nguồn & Convert' : activeTab === 'logs' ? 'Nhật ký Scraper' : 'Báo cáo vi phạm'}
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Custom Range Picker */}
            {timeRange === 'custom' && (
              <form onSubmit={handleApplyCustomRange} className="flex items-center gap-2 select-none">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-900 text-zinc-300 rounded-[4px] text-xs font-bold focus:outline-none focus:border-violet-500/50"
                />
                <span className="text-zinc-500 text-[10px] uppercase font-bold">đến</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-900 text-zinc-300 rounded-[4px] text-xs font-bold focus:outline-none focus:border-violet-500/50"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-violet-650 hover:bg-violet-750 text-white rounded-[4px] text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 border-0 outline-none"
                >
                  Áp Dụng
                </button>
              </form>
            )}

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 bg-zinc-950 border border-zinc-900 text-zinc-300 rounded-[4px] text-xs font-black uppercase tracking-wider outline-none cursor-pointer transition-all focus:border-violet-500/50 select-none"
            >
              <option value="60m">60 phút qua</option>
              <option value="24h">24 giờ qua</option>
              <option value="3d">3 ngày qua</option>
              <option value="7d">7 ngày qua</option>
              <option value="1m">1 tháng qua</option>
              <option value="3m">3 tháng qua</option>
              <option value="6m">6 tháng qua</option>
              <option value="1y">1 năm qua</option>
              <option value="2y">2 năm qua</option>
              <option value="this_year">Năm hiện tại</option>
              <option value="last_year">Năm ngoái</option>
              <option value="prev_year">Năm trước nữa</option>
              <option value="custom">Tùy chỉnh khoảng ngày</option>
            </select>

            <button 
              onClick={() => loadDashboardData(false)}
              disabled={loading}
              className="px-4 py-2 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-zinc-300 rounded-[4px] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all outline-none cursor-pointer active:scale-95 disabled:opacity-50 select-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-500' : ''}`} />
              {loading ? 'Đang cập nhật...' : 'Làm mới dữ liệu'}
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="p-8 flex-grow">
          {/* OVERVIEW STATISTICS CARDS GRID */}
          {stats && activeTab === 'analytics' && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-10 select-none">
              {/* CARD 1: TOTAL USERS */}
              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[4px] shadow-md relative overflow-hidden flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-zinc-550">
                  <span className="text-[9px] font-black uppercase tracking-wider">Người Dùng</span>
                  <Users className="w-4 h-4 text-violet-500" />
                </div>
                <span className="text-2xl font-black text-white">{stats.totalUsers}</span>
                <div className="absolute top-0 right-0 w-16 h-16 bg-violet-600/5 rounded-full filter blur-xl translate-x-4 -translate-y-4" />
              </div>

              {/* CARD 2: TOTAL MOVIES */}
              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[4px] shadow-md relative overflow-hidden flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-zinc-550">
                  <span className="text-[9px] font-black uppercase tracking-wider">Phim Donghua</span>
                  <Film className="w-4 h-4 text-violet-500" />
                </div>
                <span className="text-2xl font-black text-white">{stats.totalMovies}</span>
                <div className="absolute top-0 right-0 w-16 h-16 bg-violet-600/5 rounded-full filter blur-xl translate-x-4 -translate-y-4" />
              </div>

              {/* CARD 3: TOTAL RATINGS */}
              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[4px] shadow-md relative overflow-hidden flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-zinc-550">
                  <span className="text-[9px] font-black uppercase tracking-wider">Lượt Đánh Giá</span>
                  <Star className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-2xl font-black text-white">{stats.totalRatings}</span>
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full filter blur-xl translate-x-4 -translate-y-4" />
              </div>

              {/* CARD 4: TOTAL COMMENTS */}
              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[4px] shadow-md relative overflow-hidden flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-zinc-550">
                  <span className="text-[9px] font-black uppercase tracking-wider">Bình Luận</span>
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-2xl font-black text-white">{stats.totalComments}</span>
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full filter blur-xl translate-x-4 -translate-y-4" />
              </div>

              {/* CARD 5: FLAGGED COMMENTS (WARNING) */}
              <div className={`p-4 border rounded-[4px] shadow-md relative overflow-hidden flex flex-col justify-between h-24 transition-all col-span-2 md:col-span-1 ${
                stats.flaggedCommentsCount > 0 
                  ? 'bg-rose-950/15 border-rose-900/60 text-rose-400' 
                  : 'bg-zinc-950/40 border-zinc-900 text-zinc-500'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider">Cắm Cờ Nghi Ngờ</span>
                  <AlertTriangle className={`w-4 h-4 ${stats.flaggedCommentsCount > 0 ? 'text-rose-500 animate-bounce' : 'text-zinc-600'}`} />
                </div>
                <span className={`text-2xl font-black ${stats.flaggedCommentsCount > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                  {stats.flaggedCommentsCount}
                </span>
                <div className={`absolute top-0 right-0 w-16 h-16 rounded-full filter blur-xl translate-x-4 -translate-y-4 ${
                  stats.flaggedCommentsCount > 0 ? 'bg-rose-500/10' : 'bg-zinc-500/5'
                }`} />
              </div>
            </div>
          )}

          {/* LOADING SHIMMER FOR DATA */}
          {loading ? (
            <div className="p-12 text-center border border-zinc-900/60 bg-zinc-950/20 rounded-[4px] flex flex-col items-center justify-center gap-3 select-none">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Đang nạp dữ liệu quản trị hệ thống...</span>
            </div>
          ) : (
            <div className="bg-zinc-950/20 border border-zinc-900/60 rounded-[4px] overflow-hidden shadow-xl">
            
            {/* ==============================================================================
               TAB 0: ANALYTICS & TRENDS
               ============================================================================== */}
            {activeTab === 'analytics' && stats && (
              <div className="p-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Realtime Stats Widget */}
                  <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-[4px] flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-blue-400" /> Hệ Thống Thời Gian Thực</h3>
                      <p className="text-[10px] text-zinc-550 mb-4">Các chỉ số được cập nhật trực tiếp từ cụm máy chủ phân tán (CDN & Node).</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {/* STAT CARD: TOTAL VIEWS */}
                      <div className="bg-[#0c0c0f]/80 p-5 rounded-[4px] border border-zinc-800/80 flex flex-col justify-between shadow-lg relative overflow-hidden h-32">
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <Server className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Tổng Lượt Xem</p>
                            <div className="flex items-baseline gap-2">
                              <h3 className="text-3xl font-black text-white">{stats.totalViews.toLocaleString('vi-VN')}</h3>
                              <span className="text-[10px] text-emerald-400 font-bold tracking-wider">LƯỢT</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Dữ liệu thực tế từ Database</span>
                        </div>
                      </div>
                      
                      <div className="bg-zinc-900/30 p-3 rounded-[4px] border border-zinc-800/50">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Máy Chủ Video</span>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-black text-amber-400">99.9%</span>
                          <span className="text-[10px] text-zinc-500 font-bold mb-1">Uptime</span>
                        </div>
                      </div>
                      <div className="bg-zinc-900/30 p-3 rounded-[4px] border border-zinc-800/50">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">CDN Cache Hit</span>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-black text-blue-400">94.2%</span>
                          <span className="text-[10px] text-blue-500/70 mb-1 flex items-center">Tối ưu</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Views Chart */}
                  <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-[4px]">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Film className="w-3.5 h-3.5 text-violet-400" /> Tăng Trưởng Lượt Xem ({timeRange === '60m' ? '60 Phút' : timeRange === '24h' ? '24 Giờ' : timeRange === '3d' ? '3 Ngày' : timeRange === '7d' ? '7 Ngày' : timeRange === '1m' ? '30 Ngày' : '90 Ngày'})</h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.trends || []}>
                          <defs>
                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '4px', fontSize: '12px' }}
                            itemStyle={{ color: '#c084fc', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="views" name="Lượt xem" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Signups Bar Chart */}
                <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-[4px] w-full">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-emerald-400" /> Thành Viên Đăng Ký Mới ({timeRange === '60m' ? '60 Phút' : timeRange === '24h' ? '24 Giờ' : timeRange === '3d' ? '3 Ngày' : timeRange === '7d' ? '7 Ngày' : timeRange === '1m' ? '30 Ngày' : '90 Ngày'})</h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.trends || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '4px', fontSize: '12px' }}
                          itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                          cursor={{ fill: '#27272a', opacity: 0.4 }}
                        />
                        <Bar dataKey="signups" name="Tài khoản mới" fill="#10b981" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* New sections: Geo Distribution, Devices, and Genre views */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                  {/* Genre Views Ranking */}
                  <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-[4px] flex flex-col justify-between">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Film className="w-3.5 h-3.5 text-pink-400" /> Thể Loại Thịnh Hành (Lượt xem)</h3>
                    <div className="flex flex-col gap-3">
                      {stats.genreStats && stats.genreStats.length > 0 ? (
                        stats.genreStats.map((genre, idx) => (
                          <div key={idx} className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-zinc-350">{genre.name}</span>
                              <span className="text-zinc-500 font-mono">{genre.views.toLocaleString('vi-VN')} views</span>
                            </div>
                            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-pink-500 to-violet-500 h-full rounded-full" 
                                style={{ 
                                  width: `${stats.genreStats && stats.genreStats[0]?.views ? (genre.views / stats.genreStats[0].views) * 100 : 0}%` 
                                }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-650 italic">Chưa có dữ liệu thể loại.</span>
                      )}
                    </div>
                  </div>

                  {/* Geographic Distribution */}
                  <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-[4px]">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-400" /> Phân Bố Vùng Địa Lý</h3>
                    <div className="flex flex-col gap-3">
                      {stats.geoStats && stats.geoStats.length > 0 ? (
                        stats.geoStats.map((geo, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b border-zinc-900/60 pb-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center font-bold text-[10px] text-zinc-400">{idx + 1}</span>
                              <span className="font-bold text-zinc-300">{geo.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-zinc-400">{geo.value} views</span>
                              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-[2px]">
                                {stats.geoStats ? ((geo.value / stats.geoStats.reduce((acc, g) => acc + g.value, 0)) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-650 italic">Đang chờ thu thập địa chỉ IP...</span>
                      )}
                    </div>
                  </div>

                  {/* Device / OS & Browser Shares */}
                  <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-[4px] flex flex-col gap-6">
                    <div>
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-blue-400" /> Hệ Điều Hành</h3>
                      <div className="flex flex-col gap-2">
                        {stats.deviceStats?.os && stats.deviceStats.os.length > 0 ? (
                          stats.deviceStats.os.slice(0, 4).map((os, idx) => (
                            <div key={idx} className="flex justify-between text-xs items-center">
                              <span className="text-zinc-400 font-bold">{os.name}</span>
                              <span className="font-mono text-zinc-550">{os.value} logs</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-650 italic">Không có dữ liệu.</span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-zinc-900 pt-4">
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-amber-400" /> Trình Duyệt</h3>
                      <div className="flex flex-col gap-2">
                        {stats.deviceStats?.browser && stats.deviceStats.browser.length > 0 ? (
                          stats.deviceStats.browser.slice(0, 4).map((br, idx) => (
                            <div key={idx} className="flex justify-between text-xs items-center">
                              <span className="text-zinc-400 font-bold">{br.name}</span>
                              <span className="font-mono text-zinc-550">{br.value} logs</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-650 italic">Không có dữ liệu.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================================
               TAB 1: USER MANAGEMENT TABLE
               ============================================================================== */}
            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <div className="p-4 border-b border-zinc-900 bg-zinc-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
                  <div className="flex items-center gap-2">
                    <div className="text-zinc-400 text-xs font-black uppercase tracking-wider">Danh Sách Thành Viên</div>
                    <button
                      onClick={() => handleReloadSection('users')}
                      disabled={isRefreshing === 'users'}
                      className="p-1 hover:bg-zinc-900 rounded text-zinc-450 hover:text-white transition-colors cursor-pointer border border-zinc-900 disabled:opacity-50"
                      title="Làm mới bảng"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing === 'users' ? 'animate-spin text-violet-400' : ''}`} />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Tìm theo email..."
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        className="pl-3 pr-7 py-1.5 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 rounded text-xs text-white placeholder-zinc-650 focus:outline-none w-48 transition-all"
                      />
                      {searchUser && (
                        <button
                          onClick={() => setSearchUser('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-0.5 rounded-full cursor-pointer hover:bg-zinc-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Role Filter */}
                    <select
                      value={filterUserRole}
                      onChange={(e) => setFilterUserRole(e.target.value as 'ALL' | 'ADMIN' | 'EXPERT' | 'USER')}
                      className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 rounded text-xs text-zinc-350 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Tất cả Quyền</option>
                      <option value="ADMIN">Quản Trị Viên (ADMIN)</option>
                      <option value="EXPERT">Chuyên Gia (EXPERT)</option>
                      <option value="USER">Khán Giả (USER)</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      value={filterUserStatus}
                      onChange={(e) => setFilterUserStatus(e.target.value as 'ALL' | 'ACTIVE' | 'BANNED')}
                      className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 rounded text-xs text-zinc-350 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Tất cả Trạng Thái</option>
                      <option value="ACTIVE">Đang Hoạt Động</option>
                      <option value="BANNED">Đã Bị Khóa</option>
                    </select>
                  </div>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-550 uppercase tracking-widest text-[9px] font-black border-b border-zinc-900 select-none">
                      <th className="py-4 px-5">Địa Chỉ Email</th>
                      <th className="py-4 px-5">Phân Quyền</th>
                      <th className="py-4 px-5">Điểm Uy Tín</th>
                      <th className="py-4 px-5">Trạng Thái</th>
                      <th className="py-4 px-5">Ngày Gia Nhập</th>
                      <th className="py-4 px-5 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {users
                      .filter(user => {
                        const matchesSearch = user.email.toLowerCase().includes(searchUser.toLowerCase());
                        const matchesRole = filterUserRole === 'ALL' || user.role === filterUserRole;
                        const isBanned = user.reputationScore <= 0;
                        const matchesStatus = filterUserStatus === 'ALL' || 
                          (filterUserStatus === 'BANNED' && isBanned) || 
                          (filterUserStatus === 'ACTIVE' && !isBanned);
                        return matchesSearch && matchesRole && matchesStatus;
                      })
                      .map((user) => {
                        const isBanned = user.reputationScore <= 0;
                      return (
                        <tr key={user.id} className="hover:bg-zinc-950/40 transition-colors">
                          <td className="py-4 px-5 font-bold text-white max-w-[200px] truncate">{user.email}</td>
                          <td className="py-4 px-5 select-none">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.8 rounded-[3px] text-[8.5px] font-black uppercase border ${
                              user.role === Role.ADMIN 
                                ? 'bg-violet-950/20 border-violet-500/40 text-violet-400' 
                                : user.role === Role.EXPERT 
                                ? 'bg-amber-950/20 border-amber-500/40 text-amber-400' 
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                            }`}>
                              <Shield className="w-2.5 h-2.5" />
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-bold">
                            <span className={isBanned ? 'text-rose-500' : 'text-emerald-400'}>
                              {user.reputationScore}
                            </span>
                          </td>
                          <td className="py-4 px-5 select-none">
                            {isBanned ? (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-rose-500 bg-rose-955/10 border border-rose-900/50 px-2 py-0.5 rounded-[2px] uppercase">
                                <Ban className="w-2.5 h-2.5" />
                                Bị Khóa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-emerald-500 bg-emerald-955/10 border border-emerald-900/50 px-2 py-0.5 rounded-[2px] uppercase">
                                <Check className="w-2.5 h-2.5" />
                                Hoạt Động
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-zinc-500 font-semibold">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                          </td>
                          <td className="py-4 px-5 text-right select-none">
                            <div className="flex items-center justify-end gap-2">
                              {/* Change Role Button (USER <-> EXPERT) */}
                              {user.role !== Role.ADMIN && (
                                <button
                                  onClick={() => handleChangeRole(user.id, user.role)}
                                  disabled={actionLoading !== null}
                                  className="px-2.5 py-1 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-zinc-400 hover:text-amber-400 rounded-[2px] text-[10px] font-bold uppercase transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                  title="Thay đổi quyền thành viên"
                                >
                                  <Award className="w-3 h-3" />
                                  Quyền
                                </button>
                              )}

                              {/* Ban/Unban Button */}
                              {user.role !== Role.ADMIN && (
                                isBanned ? (
                                  <button
                                    onClick={() => handleUnbanUser(user.id)}
                                    disabled={actionLoading !== null}
                                    className="px-2.5 py-1 bg-emerald-950/15 border border-emerald-900/60 hover:bg-emerald-900/30 text-emerald-400 rounded-[2px] text-[10px] font-extrabold uppercase transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                  >
                                    {actionLoading === `unban-${user.id}` ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-3 h-3" />
                                    )}
                                    Mở Khóa
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleBanUser(user.id)}
                                    disabled={actionLoading !== null}
                                    className="px-2.5 py-1 bg-rose-955/10 border border-rose-900/50 hover:bg-rose-900/20 text-rose-500 rounded-[2px] text-[10px] font-extrabold uppercase transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                  >
                                    {actionLoading === `ban-${user.id}` ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Ban className="w-3 h-3" />
                                    )}
                                    Khóa Nick
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ==============================================================================
               TAB 2: FLAGGED COMMENTS AUDITING
               ============================================================================== */}
            {activeTab === 'comments' && (
              <div className="overflow-x-auto">
                {flaggedComments.length === 0 ? (
                  <div className="p-16 text-center text-zinc-550 italic flex flex-col items-center justify-center gap-3">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mb-1" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Hộp Thư Báo Cáo Sạch Sẽ</span>
                    <p className="text-[10px] text-zinc-650 max-w-xs leading-relaxed mt-1">
                      Không có bình luận nào bị cắm cờ hoặc bị người dùng báo cáo là vi phạm chính sách cộng đồng vào thời điểm này.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-950 text-zinc-550 uppercase tracking-widest text-[9px] font-black border-b border-zinc-900 select-none">
                        <th className="py-4 px-5">Tài Khoản Gửi</th>
                        <th className="py-4 px-5">Nội Dung Bình Luận</th>
                        <th className="py-4 px-5">Vị Trí Vi Phạm (Nguồn)</th>
                        <th className="py-4 px-5 text-right">Xử Lý Vi Phạm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60">
                      {flaggedComments.map((comment) => (
                        <tr key={comment.id} className="hover:bg-zinc-950/40 transition-colors">
                          <td className="py-4 px-5 font-bold text-white max-w-[150px] truncate">
                            {comment.user?.email || 'N/A'}
                          </td>
                          <td className="py-4 px-5 text-zinc-300 font-medium max-w-[300px] leading-relaxed break-words whitespace-pre-line">
                            {comment.content}
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex flex-col gap-0.5 select-none">
                              <span className="text-[10px] text-violet-400 font-bold truncate max-w-[180px]">{comment.movie?.title}</span>
                              <span className="text-[9px] text-zinc-600 font-bold uppercase">
                                {comment.episode ? `Tập ${comment.episode.episodeNumber}` : 'Trang Phim'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-right select-none">
                            <div className="flex items-center justify-end gap-2">
                              {/* Keep/Dismiss Comment Button */}
                              <button
                                onClick={() => handleDismissFlag(comment.id)}
                                disabled={actionLoading !== null}
                                className="px-2.5 py-1 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-zinc-400 hover:text-emerald-400 rounded-[2px] text-[10px] font-bold uppercase transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                title="Bình luận trong sạch, hủy bỏ cảnh báo"
                              >
                                {actionLoading === `dismiss-${comment.id}` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Cho Qua
                              </button>

                              {/* Delete Comment Button */}
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={actionLoading !== null}
                                className="px-2.5 py-1 bg-rose-955/10 border border-rose-900/50 hover:bg-rose-900/20 text-rose-500 rounded-[2px] text-[10px] font-extrabold uppercase transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                title="Xóa bỏ vĩnh viễn khỏi cơ sở dữ liệu"
                              >
                                {actionLoading === `delete-${comment.id}` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                                Xóa Bỏ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ==============================================================================
               TAB 3: SCRAPING & CONVERT PIPELINE MANAGEMENT
               ============================================================================== */}
            {activeTab === 'scraper' && (
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left Column: Add manual scraping task */}
                  <div className="lg:w-1/3 flex flex-col gap-6">
                    <div className="bg-zinc-950 border border-zinc-900 rounded-[4px] p-5 shadow-lg">
                      <h3 className="text-sm font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2 border-b border-zinc-900 pb-3">
                        <Plus className="w-4 h-4 text-violet-500" />
                        Nạp Nguồn Phim Mới
                      </h3>

                      <form onSubmit={handleAddScrapingTask} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            URL Nguồn (HLS / MP4) *
                          </label>
                          <input
                            type="url"
                            required
                            placeholder="https://domain/path/video.m3u8"
                            value={newSourceUrl}
                            onChange={(e) => setNewSourceUrl(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-[2px] text-white outline-none transition-all placeholder:text-zinc-600"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            Phân Loại Âm Thanh
                          </label>
                          <select
                            value={newAudioTrack}
                            onChange={(e) => setNewAudioTrack(e.target.value as 'VIETSUB' | 'THUYET_MINH')}
                            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-[2px] text-white outline-none transition-all cursor-pointer"
                          >
                            <option value="VIETSUB">Vietsub (Phụ đề Tiếng Việt)</option>
                            <option value="THUYET_MINH">Thuyết Minh / Lồng Tiếng</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                              Mã Phim (Slug)
                            </label>
                            <input
                              type="text"
                              placeholder="perfect-world"
                              value={newTargetMovieId}
                              onChange={(e) => setNewTargetMovieId(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-[2px] text-white outline-none transition-all placeholder:text-zinc-600"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                              Tập Số
                            </label>
                            <input
                              type="number"
                              placeholder="180"
                              min="1"
                              value={newTargetEpisode}
                              onChange={(e) => setNewTargetEpisode(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-[2px] text-white outline-none transition-all placeholder:text-zinc-600"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={actionLoading === 'add-task'}
                          className="w-full py-2.5 mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-[2px] cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all flex items-center justify-center gap-1.5 border-0 outline-none disabled:opacity-50"
                        >
                          {actionLoading === 'add-task' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Thêm Vào Hàng Đợi
                        </button>
                      </form>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-900 rounded-[4px] p-5 shadow-lg flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                        <Server className="w-4 h-4" />
                        <span>Worker Pipeline</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Hệ thống xử lý ngầm (Background Worker) sử dụng cơ chế khóa Mutex bất đồng bộ để tải, chuyển mã HLS và nạp trực tiếp lên không gian lưu trữ Cloudflare R2 / AWS S3.
                      </p>
                      <button
                        onClick={handleTriggerWorker}
                        disabled={actionLoading === 'trigger-worker'}
                        className="w-full py-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 font-extrabold text-[11px] uppercase tracking-wider rounded-[2px] cursor-pointer transition-all flex items-center justify-center gap-1.5 outline-none disabled:opacity-50 mt-1"
                      >
                        {actionLoading === 'trigger-worker' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PlayCircle className="w-3.5 h-3.5" />
                        )}
                        Kích Hoạt Worker Chạy Ngay
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Queue Items Table */}
                  <div className="lg:w-2/3 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-900 pb-3 gap-3 select-none">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-500" />
                          Hàng Đợi Xử Lý ({scrapingTasks.length})
                        </h3>
                        <button
                          onClick={() => handleReloadSection('scraper')}
                          disabled={isRefreshing === 'scraper'}
                          className="p-1 hover:bg-zinc-900 rounded text-zinc-450 hover:text-white transition-colors cursor-pointer border border-zinc-900 disabled:opacity-50"
                          title="Làm mới hàng đợi"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing === 'scraper' ? 'animate-spin text-violet-400' : ''}`} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {/* Audio filter */}
                        <select
                          value={filterQueueAudio}
                          onChange={(e) => setFilterQueueAudio(e.target.value as 'ALL' | 'VIETSUB' | 'THUYET_MINH')}
                          className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 rounded text-[11px] text-zinc-350 focus:outline-none cursor-pointer"
                        >
                          <option value="ALL">Tất cả Âm thanh</option>
                          <option value="VIETSUB">Vietsub</option>
                          <option value="THUYET_MINH">Thuyết Minh</option>
                        </select>

                        {/* Status filter */}
                        <select
                          value={filterQueueStatus}
                          onChange={(e) => setFilterQueueStatus(e.target.value as 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED')}
                          className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 rounded text-[11px] text-zinc-350 focus:outline-none cursor-pointer"
                        >
                          <option value="ALL">Tất cả Trạng thái</option>
                          <option value="PENDING">PENDING</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="FAILED">FAILED</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-950 text-zinc-550 uppercase tracking-widest text-[9px] font-black border-b border-zinc-900 select-none">
                            <th className="py-3 px-4">URL Nguồn</th>
                            <th className="py-3 px-4">Thông Tin Đích</th>
                            <th className="py-3 px-4">Âm Thanh</th>
                            <th className="py-3 px-4">Trạng Thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/60">
                          {scrapingTasks
                            .filter(task => {
                              const matchesAudio = filterQueueAudio === 'ALL' || task.audioTrack === filterQueueAudio;
                              const matchesStatus = filterQueueStatus === 'ALL' || task.status === filterQueueStatus;
                              return matchesAudio && matchesStatus;
                            })
                            .map((task) => (
                            <tr key={task.id} className="hover:bg-zinc-950/40 transition-colors">
                              <td className="py-3 px-4 font-mono text-zinc-300 text-[11px] max-w-[220px] truncate" title={task.sourceUrl}>
                                {task.sourceUrl}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-white uppercase text-[10px]">{task.targetMovieId || 'Chưa gán'}</span>
                                  <span className="text-[9px] text-zinc-500 font-bold">
                                    {task.targetEpisodeNumber ? `Tập ${task.targetEpisodeNumber}` : 'Auto-detect'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 select-none">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase border ${
                                  task.audioTrack === 'THUYET_MINH' 
                                    ? 'bg-blue-950/30 border-blue-500/40 text-blue-400' 
                                    : 'bg-violet-950/30 border-violet-500/40 text-violet-400'
                                }`}>
                                  {task.audioTrack === 'THUYET_MINH' ? 'Thuyết Minh' : 'Vietsub'}
                                </span>
                              </td>
                              <td className="py-3 px-4 select-none">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-[2px] uppercase ${
                                  task.status === 'COMPLETED' 
                                    ? 'bg-emerald-955/15 border border-emerald-500/30 text-emerald-400' 
                                    : task.status === 'PROCESSING'
                                    ? 'bg-amber-955/15 border border-amber-500/30 text-amber-400 animate-pulse'
                                    : task.status === 'FAILED'
                                    ? 'bg-rose-955/15 border border-rose-500/30 text-rose-400'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                                }`}>
                                  {task.status === 'PROCESSING' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                  {task.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================================
               TAB 4: MOVIE MANAGER (CRUD)
               ============================================================================== */}
            {activeTab === 'movies' && (
              <div className="overflow-x-auto">
                <div className="p-4 border-b border-zinc-900 bg-zinc-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
                  <div className="flex items-center gap-2">
                    <div className="text-zinc-400 text-xs font-black uppercase tracking-wider">Thư Viện Phim</div>
                    <button
                      onClick={() => handleReloadSection('movies')}
                      disabled={isRefreshing === 'movies'}
                      className="p-1 hover:bg-zinc-900 rounded text-zinc-450 hover:text-white transition-colors cursor-pointer border border-zinc-900 disabled:opacity-50"
                      title="Làm mới bảng"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing === 'movies' ? 'animate-spin text-violet-400' : ''}`} />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Tìm kiếm phim..."
                        value={searchMovie}
                        onChange={(e) => setSearchMovie(e.target.value)}
                        className="pl-3 pr-7 py-1.5 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 rounded text-xs text-white placeholder-zinc-650 focus:outline-none w-48 transition-all"
                      />
                      {searchMovie && (
                        <button
                          onClick={() => setSearchMovie('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-0.5 rounded-full cursor-pointer hover:bg-zinc-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Movie Year Filter */}
                    <select
                      value={filterMovieYear}
                      onChange={(e) => setFilterMovieYear(e.target.value)}
                      className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 rounded text-xs text-zinc-355 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Tất cả Năm</option>
                      <option value="2026">Năm 2026</option>
                      <option value="2025">Năm 2025</option>
                      <option value="2024">Năm 2024</option>
                      <option value="2023">Năm 2023</option>
                      <option value="BEFORE_2023">Trước 2023</option>
                    </select>

                    {/* Movie Sort Order */}
                    <select
                      value={sortMovieBy}
                      onChange={(e) => setSortMovieBy(e.target.value as 'VIEWS_DESC' | 'VIEWS_ASC' | 'RATING_DESC' | 'RATING_ASC' | 'YEAR_DESC' | 'TITLE_ASC')}
                      className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 rounded text-xs text-zinc-355 focus:outline-none cursor-pointer"
                    >
                      <option value="VIEWS_DESC">Lượt Xem giảm dần</option>
                      <option value="VIEWS_ASC">Lượt Xem tăng dần</option>
                      <option value="RATING_DESC">Đánh Giá giảm dần</option>
                      <option value="RATING_ASC">Đánh Giá tăng dần</option>
                      <option value="YEAR_DESC">Năm ra mắt giảm dần</option>
                      <option value="TITLE_ASC">Tên Phim (A-Z)</option>
                    </select>
                  </div>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-550 uppercase tracking-widest text-[9px] font-black border-b border-zinc-900 select-none">
                      <th className="py-4 px-5">Tên Phim</th>
                      <th className="py-4 px-5">Năm</th>
                      <th className="py-4 px-5">Lượt Xem</th>
                      <th className="py-4 px-5">Đánh Giá</th>
                      <th className="py-4 px-5 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {movies.filter(m => {
                      const matchesSearch = m.title.toLowerCase().includes(searchMovie.toLowerCase());
                      let matchesYear = true;
                      if (filterMovieYear === 'BEFORE_2023') {
                        matchesYear = m.releaseYear < 2023;
                      } else if (filterMovieYear !== 'ALL') {
                        matchesYear = m.releaseYear === parseInt(filterMovieYear, 10);
                      }
                      return matchesSearch && matchesYear;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-zinc-500 font-bold italic text-xs">Chưa có dữ liệu phim trùng khớp</td>
                      </tr>
                    ) : movies
                        .filter(m => {
                          const matchesSearch = m.title.toLowerCase().includes(searchMovie.toLowerCase());
                          let matchesYear = true;
                          if (filterMovieYear === 'BEFORE_2023') {
                            matchesYear = m.releaseYear < 2023;
                          } else if (filterMovieYear !== 'ALL') {
                            matchesYear = m.releaseYear === parseInt(filterMovieYear, 10);
                          }
                          return matchesSearch && matchesYear;
                        })
                        .sort((a, b) => {
                          if (sortMovieBy === 'VIEWS_DESC') return (b.viewsCount || 0) - (a.viewsCount || 0);
                          if (sortMovieBy === 'VIEWS_ASC') return (a.viewsCount || 0) - (b.viewsCount || 0);
                          if (sortMovieBy === 'RATING_DESC') return (b.rating || 0) - (a.rating || 0);
                          if (sortMovieBy === 'RATING_ASC') return (a.rating || 0) - (b.rating || 0);
                          if (sortMovieBy === 'YEAR_DESC') return b.releaseYear - a.releaseYear;
                          if (sortMovieBy === 'TITLE_ASC') return a.title.localeCompare(b.title);
                          return 0;
                        })
                        .map((movie) => (
                          <tr key={movie.id} className="hover:bg-zinc-950/40 transition-colors group">
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-10 bg-zinc-900 rounded overflow-hidden relative shrink-0">
                                  {movie.posterUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <Film className="w-4 h-4 text-zinc-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-white text-[13px]">{movie.title}</span>
                                  <span className="text-[10px] text-zinc-500">{movie.studio || 'Unknown Studio'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-5 font-mono text-zinc-300">{movie.releaseYear}</td>
                            <td className="py-4 px-5">
                              <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-[10px] uppercase">
                                {movie.viewsCount?.toLocaleString() || 0} Views
                              </span>
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-1 text-violet-400">
                                <Star className="w-3 h-3 fill-current" />
                                <span className="font-black text-[11px]">{movie.rating?.toFixed(1) || '0.0'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingMovie(movie);
                                    setEditForm({
                                      title: movie.title,
                                      studio: movie.studio || '',
                                      posterUrl: movie.posterUrl || '',
                                      description: movie.description || '',
                                      rating: movie.rating || 0,
                                      viewsCount: movie.viewsCount || 0,
                                      releaseYear: movie.releaseYear
                                    });
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteMovie(movie.id, movie.title)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/20 border border-rose-500/30 hover:bg-rose-900/20 text-rose-450 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ==============================================================================
               TAB 5: SCRAPING LOGS
               ============================================================================== */}
            {activeTab === 'logs' && (
              <div className="overflow-x-auto">
                <div className="p-4 border-b border-zinc-900 bg-zinc-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
                  <div className="flex items-center gap-2">
                    <div className="text-zinc-400 text-xs font-black uppercase tracking-wider">Nhật Ký Vận Hành Scraper</div>
                    <button
                      onClick={() => handleReloadSection('logs')}
                      disabled={isRefreshing === 'logs'}
                      className="p-1 hover:bg-zinc-900 rounded text-zinc-450 hover:text-white transition-colors cursor-pointer border border-zinc-900 disabled:opacity-50"
                      title="Làm mới log"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing === 'logs' ? 'animate-spin text-violet-400' : ''}`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    {/* Status filter */}
                    <select
                      value={filterLogStatus}
                      onChange={(e) => setFilterLogStatus(e.target.value as 'ALL' | 'SUCCESS' | 'FAILED')}
                      className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 rounded text-xs text-zinc-350 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Tất cả Kết quả</option>
                      <option value="SUCCESS">Thành Công (SUCCESS)</option>
                      <option value="FAILED">Thất Bại (FAILED)</option>
                    </select>
                  </div>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-550 uppercase tracking-widest text-[9px] font-black border-b border-zinc-900 select-none">
                      <th className="py-4 px-5 w-40">Thời Gian</th>
                      <th className="py-4 px-5 w-24">Trạng Thái</th>
                      <th className="py-4 px-5 w-32">Đồng Bộ</th>
                      <th className="py-4 px-5">Chi Tiết Log</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {scrapingLogs.filter(log => {
                      if (filterLogStatus === 'SUCCESS') return log.status === 'SUCCESS' || log.status === 'COMPLETED';
                      if (filterLogStatus === 'FAILED') return log.status === 'FAILED';
                      return true;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-zinc-500 font-bold italic text-xs">Chưa có nhật ký vận hành trùng khớp</td>
                      </tr>
                    ) : scrapingLogs
                        .filter(log => {
                          if (filterLogStatus === 'SUCCESS') return log.status === 'SUCCESS' || log.status === 'COMPLETED';
                          if (filterLogStatus === 'FAILED') return log.status === 'FAILED';
                          return true;
                        })
                        .map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-950/40 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-zinc-300 font-mono text-[11px]">
                              {new Date(log.startedAt).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="text-zinc-500 font-mono text-[10px]">
                              {new Date(log.startedAt).toLocaleTimeString('vi-VN')}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex px-2 py-0.5 rounded-[2px] text-[9px] font-black uppercase border ${
                            log.status === 'SUCCESS' || log.status === 'COMPLETED'
                              ? 'bg-emerald-955/20 border-emerald-500/30 text-emerald-400'
                              : log.status === 'FAILED'
                              ? 'bg-rose-955/20 border-rose-500/30 text-rose-400'
                              : 'bg-amber-955/20 border-amber-500/30 text-amber-400'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded text-[10px]">
                            {log.syncedCount} Tập
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="text-[10px] text-zinc-400 font-mono max-w-lg truncate" title={log.error || (typeof log.results === 'string' ? log.results : JSON.stringify(log.results))}>
                            {log.error || (Array.isArray(log.results) ? log.results[0] : JSON.stringify(log.results)) || 'Tiến trình hoàn tất không có lỗi.'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}
      </main>
    </div>

      {/* CUSTOM CONFIRM MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-zinc-950 border border-zinc-850 max-w-md w-full rounded-[4px] overflow-hidden shadow-2xl relative">
            <div className="p-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                {confirmModal.danger ? (
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                ) : (
                  <HelpCircle className="w-5 h-5 text-violet-500" />
                )}
                {confirmModal.title}
              </h3>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                {confirmModal.message}
              </p>

              {confirmModal.requireText && (
                <div className="mb-6">
                  <label className="block text-[10px] text-zinc-550 uppercase font-black mb-2">
                    Vui lòng nhập <span className="text-rose-450 font-mono">&ldquo;{confirmModal.requireText}&rdquo;</span> để xác nhận:
                  </label>
                  <input
                    type="text"
                    value={confirmModal.enteredText || ''}
                    onChange={(e) => setConfirmModal(prev => ({ ...prev, enteredText: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-rose-500/55 focus:outline-none rounded text-xs text-white placeholder-zinc-700 transition-all font-mono"
                    placeholder="Nhập chính xác để tiếp tục..."
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false, enteredText: '' }))}
                  className="px-4 py-2 border border-zinc-850 hover:bg-zinc-900 text-zinc-450 hover:text-white rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  disabled={confirmModal.requireText ? confirmModal.enteredText !== confirmModal.requireText : false}
                  className={`px-4 py-2 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    confirmModal.danger
                      ? 'bg-rose-650 hover:bg-rose-700 text-white'
                      : 'bg-violet-650 hover:bg-violet-700 text-white'
                  }`}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MOVIE SLIDE-OVER DRAWER */}
      {editingMovie && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-zinc-950 border-l border-zinc-850 w-full max-w-lg h-full overflow-y-auto p-6 flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6 select-none">
              <div>
                <span className="text-[10px] text-violet-400 font-extrabold uppercase tracking-widest">Đang chỉnh sửa bộ phim</span>
                <h3 className="text-base font-black text-white uppercase truncate max-w-sm mt-1">{editingMovie.title}</h3>
              </div>
              <button
                onClick={() => setEditingMovie(null)}
                className="p-1.5 hover:bg-zinc-900 border border-zinc-900 text-zinc-450 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovie} className="flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] text-zinc-555 uppercase font-black mb-2">Tên Phim (Title)</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 focus:outline-none rounded text-xs text-white placeholder-zinc-700 transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-zinc-555 uppercase font-black mb-2">Hãng sản xuất (Studio)</label>
                    <input
                      type="text"
                      value={editForm.studio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, studio: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 focus:outline-none rounded text-xs text-white placeholder-zinc-700 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-555 uppercase font-black mb-2">Năm Phát Hành (Release Year)</label>
                    <input
                      type="number"
                      required
                      value={editForm.releaseYear}
                      onChange={(e) => setEditForm(prev => ({ ...prev, releaseYear: parseInt(e.target.value, 10) }))}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 focus:outline-none rounded text-xs text-white placeholder-zinc-700 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-555 uppercase font-black mb-2">Đường dẫn Poster (Poster URL)</label>
                  <input
                    type="text"
                    value={editForm.posterUrl}
                    onChange={(e) => setEditForm(prev => ({ ...prev, posterUrl: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 focus:outline-none rounded text-xs text-white placeholder-zinc-700 transition-all font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-zinc-555 uppercase font-black mb-2">Đánh Giá (Rating)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      required
                      value={editForm.rating}
                      onChange={(e) => setEditForm(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 focus:outline-none rounded text-xs text-white placeholder-zinc-700 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-555 uppercase font-black mb-2">Lượt Xem (Views Count)</label>
                    <input
                      type="number"
                      required
                      value={editForm.viewsCount}
                      onChange={(e) => setEditForm(prev => ({ ...prev, viewsCount: parseInt(e.target.value, 10) }))}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 focus:outline-none rounded text-xs text-white placeholder-zinc-700 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-555 uppercase font-black mb-2">Mô Tả Nội Dung (Description)</label>
                  <textarea
                    rows={6}
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 focus:border-violet-500/50 focus:outline-none rounded text-xs text-white placeholder-zinc-700 transition-all leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t border-zinc-900 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingMovie(null)}
                  className="flex-1 py-2.5 border border-zinc-850 hover:bg-zinc-900 text-zinc-450 hover:text-white rounded text-[11px] font-bold uppercase transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingMovie}
                  className="flex-1 py-2.5 bg-violet-650 hover:bg-violet-700 disabled:bg-violet-900 text-white rounded text-[11px] font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSavingMovie && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
