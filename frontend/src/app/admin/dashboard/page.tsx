'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, Film, MessageSquare, AlertTriangle, Star, Shield, 
  Trash2, CheckCircle, Award, Ban, Check, ArrowLeft, Loader2, RefreshCw
} from 'lucide-react';
import Header from '../../../components/Header';
import { adminApi, authApi, Role, AdminStatsPayload, AdminUserPayload, FlaggedCommentPayload } from '../../../lib/api';

export default function AdminDashboard() {
  const router = useRouter();
  
  // Authentication check states
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Stats and list states
  const [stats, setStats] = useState<AdminStatsPayload | null>(null);
  const [users, setUsers] = useState<AdminUserPayload[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<FlaggedCommentPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Active Tab: 'users' | 'comments'
  const [activeTab, setActiveTab] = useState<'users' | 'comments'>('users');

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
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAdminAuth();
  }, []);

  // Load Admin Data once verified
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, commentsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getFlaggedComments(),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
      if (commentsRes.success && commentsRes.data) {
        setFlaggedComments(commentsRes.data);
      }
    } catch (err) {
      console.error('[Admin Dashboard Load Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin === true) {
      loadDashboardData();
    }
  }, [isAdmin]);

  // Action: Ban User
  const handleBanUser = async (userId: string) => {
    setActionLoading(`ban-${userId}`);
    const res = await adminApi.banUser(userId);
    if (res.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, reputationScore: -100 } : u));
      // Refresh stats in background
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
      // Refresh stats
      adminApi.getStats().then(s => s.success && s.data && setStats(s.data));
    } else {
      alert(res.error?.message || 'Không thể mở khóa tài khoản này.');
    }
    setActionLoading(null);
  };

  // Action: Change User Role
  const handleChangeRole = async (userId: string, currentRole: Role) => {
    const nextRole = currentRole === Role.USER ? Role.EXPERT : Role.USER;
    const confirmChange = window.confirm(`Bạn có chắc chắn muốn thay đổi quyền hạn của người dùng này sang ${nextRole === Role.EXPERT ? 'Chuyên Gia (EXPERT)' : 'Khán Giả (USER)'}?`);
    if (!confirmChange) return;

    setActionLoading(`role-${userId}`);
    const res = await adminApi.updateUserRole(userId, nextRole);
    if (res.success && res.data) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: res.data!.role } : u));
    } else {
      alert(res.error?.message || 'Không thể thay đổi quyền hạn.');
    }
    setActionLoading(null);
  };

  // Action: Dismiss Comment Flag
  const handleDismissFlag = async (commentId: string) => {
    setActionLoading(`dismiss-${commentId}`);
    const res = await adminApi.dismissCommentFlag(commentId);
    if (res.success) {
      setFlaggedComments(prev => prev.filter(c => c.id !== commentId));
      // Refresh stats
      adminApi.getStats().then(s => s.success && s.data && setStats(s.data));
    } else {
      alert(res.error?.message || 'Không thể bỏ cắm cờ bình luận này.');
    }
    setActionLoading(null);
  };

  // Action: Delete Flagged Comment
  const handleDeleteComment = async (commentId: string) => {
    const confirmDelete = window.confirm('Bạn có chắc chắn muốn XÓA VĨNH VIỄN bình luận này khỏi hệ thống? Thao tác này không thể hoàn tác.');
    if (!confirmDelete) return;

    setActionLoading(`delete-${commentId}`);
    const res = await adminApi.deleteComment(commentId);
    if (res.success) {
      setFlaggedComments(prev => prev.filter(c => c.id !== commentId));
      // Refresh stats
      adminApi.getStats().then(s => s.success && s.data && setStats(s.data));
    } else {
      alert(res.error?.message || 'Không thể xóa bình luận này.');
    }
    setActionLoading(null);
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
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans pb-24">
      <Header />

      {/* ADMIN TITLE WRAPPER */}
      <section className="w-full px-6 md:px-12 lg:px-16 mt-28 select-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-violet-600/25 border border-violet-500/35 text-violet-400 font-extrabold px-2 py-0.5 rounded-[3px] text-[8.5px] uppercase tracking-widest flex items-center gap-1 shadow-sm">
                <Shield className="w-3 h-3 text-violet-400" />
                Hệ Thống Quản Trị
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white uppercase leading-none">
              ADMIN DASHBOARD
            </h1>
          </div>

          <button 
            onClick={loadDashboardData}
            disabled={loading}
            className="px-4 py-2 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-zinc-300 rounded-[4px] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all outline-none cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới dữ liệu
          </button>
        </div>

        {/* OVERVIEW STATISTICS CARDS GRID */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-10">
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

        {/* TABS SELECTOR PANEL */}
        <div className="flex border-b border-zinc-900 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer outline-none ${
              activeTab === 'users'
                ? 'border-violet-650 text-white bg-violet-600/5'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Quản Lý Thành Viên ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-5 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer outline-none relative ${
              activeTab === 'comments'
                ? 'border-violet-650 text-white bg-violet-600/5'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Báo Cáo Vi Phạm ({flaggedComments.length})
            {flaggedComments.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </div>

        {/* LOADING SHIMMER FOR DATA */}
        {loading ? (
          <div className="p-12 text-center border border-zinc-900/60 bg-zinc-950/20 rounded-[4px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Đang nạp dữ liệu quản trị hệ thống...</span>
          </div>
        ) : (
          <div className="bg-zinc-950/20 border border-zinc-900/60 rounded-[4px] overflow-hidden shadow-xl">
            
            {/* ==============================================================================
               TAB 1: USER MANAGEMENT TABLE
               ============================================================================== */}
            {activeTab === 'users' && (
              <div className="overflow-x-auto">
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
                    {users.map((user) => {
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
                                  className="px-2.5 py-1 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-zinc-400 hover:text-amber-400 rounded-[2px] text-[10px] font-bold uppercase transition-all flex items-center gap-1 disabled:opacity-50"
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
                                    className="px-2.5 py-1 bg-emerald-950/15 border border-emerald-900/60 hover:bg-emerald-900/30 text-emerald-400 rounded-[2px] text-[10px] font-extrabold uppercase transition-all flex items-center gap-1 disabled:opacity-50"
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
                                    className="px-2.5 py-1 bg-rose-955/10 border border-rose-900/50 hover:bg-rose-900/20 text-rose-500 rounded-[2px] text-[10px] font-extrabold uppercase transition-all flex items-center gap-1 disabled:opacity-50"
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
                                className="px-2.5 py-1 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-zinc-400 hover:text-emerald-400 rounded-[2px] text-[10px] font-bold uppercase transition-all flex items-center gap-1 disabled:opacity-50"
                                title="Bình luận trong sạch, hủy bỏ cảnh báo"
                              >
                                {actionLoading === `dismiss-${comment.id}` ? (
                                  <Loader2 className="w-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Cho Qua
                              </button>

                              {/* Delete Comment Button */}
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={actionLoading !== null}
                                className="px-2.5 py-1 bg-rose-955/10 border border-rose-900/50 hover:bg-rose-900/20 text-rose-500 rounded-[2px] text-[10px] font-extrabold uppercase transition-all flex items-center gap-1 disabled:opacity-50"
                                title="Xóa bỏ vĩnh viễn khỏi cơ sở dữ liệu"
                              >
                                {actionLoading === `delete-${comment.id}` ? (
                                  <Loader2 className="w-3 animate-spin" />
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

          </div>
        )}
      </section>
    </div>
  );
}
