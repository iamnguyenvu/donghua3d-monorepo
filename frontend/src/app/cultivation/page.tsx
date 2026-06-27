'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Gem, 
  ArrowLeft, 
  Loader2, 
  User, 
  Zap, 
  Flame, 
  Compass,
  Trophy,
  History,
  Dumbbell
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { authApi, UserPayload } from '../../lib/api';

// Cultivation tier descriptions and styling mapping
const RANK_STYLES: Record<string, { aura: string; text: string; bg: string; border: string; desc: string }> = {
  "Luyện Khí Kỳ": {
    aura: "shadow-[0_0_20px_rgba(161,161,170,0.15)]",
    text: "text-zinc-400",
    bg: "bg-zinc-950/40",
    border: "border-zinc-800",
    desc: "Cảm ứng thiên địa linh khí, tích lũy chân khí tại đan điền. Cảnh giới khởi đầu của tu sĩ."
  },
  "Trúc Cơ Kỳ": {
    aura: "shadow-[0_0_30px_rgba(20,184,166,0.3)]",
    text: "text-teal-400 font-extrabold",
    bg: "bg-teal-950/10",
    border: "border-teal-500/30",
    desc: "Nén khí hóa lỏng, đúc nền móng vững chắc cho Đại Đạo. Thọ mệnh gia tăng tới hai trăm năm."
  },
  "Kim Đan Kỳ": {
    aura: "shadow-[0_0_40px_rgba(245,158,11,0.45)]",
    text: "text-amber-400 font-black",
    bg: "bg-amber-950/15",
    border: "border-amber-500/40",
    desc: "Đan điền ngưng tụ chân nguyên thành Kim Đan chí tôn. Ngã mệnh do ngã bất do thiên!"
  },
  "Nguyên Anh Kỳ": {
    aura: "shadow-[0_0_45px_rgba(168,85,247,0.55)]",
    text: "text-purple-400 font-black",
    bg: "bg-purple-950/15",
    border: "border-purple-500/40",
    desc: "Phá đan hóa anh, Nguyên Anh xuất khiếu di sơn đảo hải. Thọ mệnh ngàn năm tối thượng."
  },
  "Hóa Thần Kỳ": {
    aura: "shadow-[0_0_50px_rgba(239,68,68,0.65)]",
    text: "text-red-500 font-black tracking-wide",
    bg: "bg-red-950/15",
    border: "border-red-500/40",
    desc: "Nguyên Thần ngưng thực, dung nhập bản nguyên quy luật thiên địa. Thần thông thông thiên."
  },
  "Luyện Hư Kỳ": {
    aura: "shadow-[0_0_55px_rgba(14,165,233,0.7)]",
    text: "text-sky-400 font-black tracking-wide",
    bg: "bg-sky-950/15",
    border: "border-sky-500/40",
    desc: "Phân biệt chân hư, đốn ngộ càn khôn vũ trụ chi đạo. Thoát ly phàm tục xiềng xích."
  },
  "Hợp Thể Kỳ": {
    aura: "shadow-[0_0_60px_rgba(236,72,153,0.75)]",
    text: "text-pink-500 font-black tracking-widest",
    bg: "bg-pink-950/15",
    border: "border-pink-500/40",
    desc: "Nguyên Thần hợp nhất với huyết xác, bất sinh bất diệt, sánh vai thiên địa thần ma."
  },
  "Đại Thừa Kỳ": {
    aura: "shadow-[0_0_70px_rgba(250,204,21,0.85)]",
    text: "text-yellow-400 font-black tracking-widest uppercase",
    bg: "bg-yellow-950/20",
    border: "border-yellow-500/50",
    desc: "Chân khí đạt tới cực hạn viên mãn, tùy thời có thể cảm ứng tiên giới tiếp dẫn quang mang."
  },
  "Độ Kiếp Kỳ": {
    aura: "shadow-[0_0_80px_rgba(99,102,241,0.95)] animate-pulse",
    text: "text-indigo-400 font-black tracking-widest uppercase animate-pulse",
    bg: "bg-indigo-950/20",
    border: "border-indigo-500/60",
    desc: "Vượt qua chín chín Thiên Kiếp lôi phạt. Phá toái hư không, Vũ Hóa Đăng Tiên!"
  },
  "Tiên Nhân": {
    aura: "shadow-[0_0_90px_rgba(255,255,255,1)]",
    text: "text-white font-black tracking-widest uppercase bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 bg-clip-text text-transparent",
    bg: "bg-white/5",
    border: "border-yellow-200/50",
    desc: "Chân Tiên tại thế, thọ dữ thiên tề. Vạn kiếp bất ma, bễ nghễ thiên hạ chư giới."
  }
};

const DEFAULT_STYLE = {
  aura: "shadow-[0_0_20px_rgba(124,58,237,0.2)]",
  text: "text-violet-400",
  bg: "bg-violet-950/10",
  border: "border-violet-850",
  desc: "Nghiên cứu thiên đạo linh lực, từng bước tiến hành hành trình tu tiên."
};

export default function CultivationPage() {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [showBreakthroughAnimation, setShowBreakthroughAnimation] = useState(false);
  const [showCheckinAnimation, setShowCheckinAnimation] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<'cave' | 'quests' | 'lore'>('cave');

  // Load user data on mount
  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('donghua3d_token');
      if (token) {
        const res = await authApi.getMe();
        if (res.success && res.data) {
          setUser(res.data);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const handleCheckin = async () => {
    if (!user) return;
    setCheckinLoading(true);
    setMessage('');

    try {
      const res = await authApi.checkin();
      if (res.success && res.data) {
        const { level, exp, donghuaCoins, cultivationRank } = res.data;

        // Play floating Qi collection effect
        setShowCheckinAnimation(true);
        setTimeout(() => setShowCheckinAnimation(false), 2000);

        // Check if level upgraded
        const prevLevel = user.level;
        
        if (level > prevLevel) {
          // Play dramatic breakthrough lightning effect
          setShowBreakthroughAnimation(true);
          setTimeout(() => setShowBreakthroughAnimation(false), 4000);
        }

        // Update local user state
        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            level,
            exp,
            donghuaCoins,
            cultivationRank
          };
        });

        setMessage(res.message || 'Điểm danh tu luyện thành công!');
        setMessageType('success');
      } else {
        setMessage(res.error?.message || 'Không thể điểm danh vào lúc này.');
        setMessageType('error');
      }
    } catch {
      setMessage('Không thể kết nối đến máy chủ.');
      setMessageType('error');
    } finally {
      setCheckinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto">
          <div className="p-4 rounded-full bg-violet-950/30 border border-violet-800/30 mb-5 text-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-white">Yêu Cầu Đăng Nhập</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Đăng nhập tài khoản Donghua3D để bước chân vào con đường tầm đạo, tích lũy Linh Thạch và thăng cấp Cảnh giới Tu Tiên của riêng bạn!
          </p>
          <Link
            href="/"
            className="mt-6 px-6 py-3 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 no-underline shadow-lg"
          >
            Quay lại Trang Chủ & Đăng Nhập
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  // Get current rank visual styles
  const currentRank = user.cultivationRank || "Luyện Khí Kỳ";
  const rankStyle = RANK_STYLES[currentRank] || DEFAULT_STYLE;
  const nextExpNeeded = user.level * 100;
  const expPercent = Math.min(100, Math.floor((user.exp / nextExpNeeded) * 100));

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans relative overflow-hidden">
      {/* Absolute background visual particles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-900/5 rounded-full blur-[150px] pointer-events-none z-0" />
      
      {/* Breakthrough flash overlay */}
      {showBreakthroughAnimation && (
        <div className="fixed inset-0 bg-white/10 z-[100] flex flex-col items-center justify-center pointer-events-none transition-all duration-500 backdrop-blur-[2px] animate-pulse">
          <div className="text-center p-8 bg-black/80 rounded-[8px] border border-amber-400/50 shadow-[0_0_60px_rgba(245,158,11,0.5)] max-w-sm animate-fade-in-up">
            <h2 className="text-3xl font-black text-amber-400 tracking-widest uppercase flex items-center justify-center gap-2">
              ⚡ ĐỘT PHÁ ⚡
            </h2>
            <p className="text-lg text-white font-bold mt-3">Thăng Cấp Cảnh Giới!</p>
            <p className="text-2xl text-amber-300 font-extrabold mt-1">{user.cultivationRank}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-4">Tu vi đại tiến • Đại cát đại lợi</p>
          </div>
        </div>
      )}

      <Header />

      <main className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 md:px-12 mt-24 flex-grow flex flex-col relative z-10">
        
        {/* Navigation back and profile bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/60 pb-5 mb-8">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="px-3 py-1.5 rounded-[4px] bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white transition-all text-xs flex items-center gap-1.5 no-underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại
            </Link>
            <h1 className="text-lg font-black text-white tracking-wider uppercase border-l-2 border-amber-500 pl-3">
              🔮 Động Phủ Tu Luyện
            </h1>
          </div>

          {/* Sub Navigation tabs */}
          <div className="flex items-center gap-1.5 bg-[#0c0c10] border border-zinc-900 rounded-[4px] p-1">
            <button
              onClick={() => setActiveTab('cave')}
              className={`px-4 py-2 rounded-[2px] text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                activeTab === 'cave'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5 inline mr-1.5" />
              Động Phủ
            </button>
            <button
              onClick={() => setActiveTab('quests')}
              className={`px-4 py-2 rounded-[2px] text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                activeTab === 'quests'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 inline mr-1.5" />
              Nhiệm Vụ Tu Luyện
            </button>
            <button
              onClick={() => setActiveTab('lore')}
              className={`px-4 py-2 rounded-[2px] text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                activeTab === 'lore'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 inline mr-1.5" />
              Bảng Cảnh Giới
            </button>
          </div>
        </div>

        {/* Action message notices */}
        {message && (
          <div className={`mb-6 p-4 rounded-[4px] border text-xs text-center ${
            messageType === 'success' 
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
          }`}>
            {message}
          </div>
        )}

        {/* -------------------- TAB 1: CAVE (ĐỘNG PHỦ) -------------------- */}
        {activeTab === 'cave' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left side: Character Card & Cultivation rank display */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Premium Character Panel */}
              <div className={`bg-[#0c0c10]/75 border rounded-[6px] p-6 backdrop-blur-md relative overflow-hidden transition-all duration-500 ${rankStyle.border} ${rankStyle.aura}`}>
                
                {/* Floating Qi animations */}
                {showCheckinAnimation && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-violet-600/10 pointer-events-none">
                    <span className="text-amber-400 font-extrabold text-base tracking-widest animate-bounce">
                      ✨ Hấp Thu Linh Khí (+50 EXP, +10 Linh Thạch) ✨
                    </span>
                  </div>
                )}

                {/* Header User Title block */}
                <div className="flex items-center gap-5 border-b border-zinc-900/60 pb-5 mb-5">
                  <div className="w-16 h-16 rounded-[4px] bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-black flex items-center justify-center text-2xl shadow-lg ring-2 ring-violet-500/30">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-base font-black text-white tracking-tight">{user.email}</span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Mã số tu sĩ: {user.id}</span>
                  </div>
                </div>

                {/* Cultivation status block */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                  <div className="flex flex-col text-left p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-[4px]">
                    <span className="text-[9px] text-zinc-550 font-black uppercase tracking-widest">Cảnh Giới</span>
                    <span className={`text-base font-black mt-1 ${rankStyle.text}`}>{user.cultivationRank || 'Luyện Khí'}</span>
                  </div>

                  <div className="flex flex-col text-left p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-[4px]">
                    <span className="text-[9px] text-zinc-550 font-black uppercase tracking-widest">Cấp Độ Tu Vi</span>
                    <span className="text-base font-black text-white mt-1">Cấp {user.level}</span>
                  </div>

                  <div className="flex flex-col text-left p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-[4px] col-span-2 md:col-span-1">
                    <span className="text-[9px] text-zinc-550 font-black uppercase tracking-widest flex items-center gap-1">
                      <Gem className="w-3 h-3 text-violet-400" />
                      Linh Thạch (Coins)
                    </span>
                    <span className="text-base font-black text-violet-400 mt-1 flex items-center gap-1.5">
                      💎 {user.donghuaCoins}
                    </span>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="flex flex-col text-left mb-6">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">
                    <span>Tu Vi (EXP)</span>
                    <span className="text-amber-400">{user.exp} / {nextExpNeeded} EXP ({expPercent}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(139,92,246,0.5)]" 
                      style={{ width: `${expPercent}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed italic border-l border-zinc-800 pl-3">
                  &ldquo;{rankStyle.desc}&rdquo;
                </p>
              </div>

              {/* Tĩnh Tọa Meditate block */}
              <div className="bg-[#0c0c10]/75 border border-zinc-900 rounded-[6px] p-6 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-left">
                  <div className="p-3.5 rounded-[4px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Flame className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Tĩnh Tọa Hấp Thu Linh Khí</h3>
                    <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
                      Điểm danh hàng ngày giúp ngưng tụ linh lực, gia tăng 50 điểm Tu Vi (EXP) và thu thập 10 Linh Thạch.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCheckin}
                  disabled={checkinLoading}
                  className="px-6 py-4 w-full sm:w-auto rounded-[4px] bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-black text-xs uppercase tracking-wider transition-all duration-300 hover:scale-[1.03] active:scale-95 disabled:opacity-50 border-0 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {checkinLoading ? (
                    <Loader2 className="w-4 h-4 text-black animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-black text-black" />
                      Hấp Thu Linh Lực
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Right side: Cultivation details, dynamic tip or rules */}
            <div className="flex flex-col gap-6">
              
              <div className="bg-[#0c0c10]/75 border border-zinc-900 rounded-[6px] p-6 backdrop-blur-md text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-widest border-b border-zinc-900 pb-3 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-violet-400" />
                  Tiêu Chuẩn Đột Phá
                </h3>

                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Mỗi cấp độ tu vi tương ứng cần tích lũy số linh khí bằng <code className="text-violet-400 bg-zinc-950 px-1 py-0.5 rounded-[2px]">Cấp x 100 EXP</code>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Linh khí tự động thăng hoa khi tích lũy đủ vạch tiến độ, mở khóa cảnh giới tiếp theo dựa trên bảng phân bậc.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Linh Thạch tích lũy được có thể dùng để mở khóa các đặc quyền cao cấp (như Server 4K VIP).
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic decorative lore status */}
              <div className="bg-gradient-to-br from-violet-950/20 to-indigo-950/20 border border-violet-900/30 rounded-[6px] p-6 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Sparkles className="w-32 h-32 text-violet-400" />
                </div>
                <h3 className="text-xs font-black text-violet-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  Trang Bị Hộ Thể
                </h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Thiết lập hồ sơ tu sĩ bảo mật, cấp quyền cống hiến đánh giá phim được bảo toàn Rep. Trải nghiệm tốc độ tải tối ưu cùng server phát trực tiếp chuyên biệt của Donghua3D.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* -------------------- TAB 2: QUESTS (NHIỆM VỤ) -------------------- */}
        {activeTab === 'quests' && (
          <div className="bg-[#0c0c10]/75 border border-zinc-900 rounded-[6px] p-6 backdrop-blur-md text-left flex flex-col gap-6">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">📜 Bí Bản Nhiệm Vụ Tu Luyện</h2>
              <p className="text-xs text-zinc-500 mt-1">Hãy tham gia đóng góp và tương tác với cộng đồng Donghua3D để gia tăng tu vi nhanh chóng!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[4px] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[4px] bg-violet-650/10 text-violet-400 border border-violet-600/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-200 uppercase tracking-wide">Điểm Danh Hàng Ngày</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Tĩnh tọa hấp thu linh lực mỗi ngày.</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-[2px] uppercase">
                  +50 EXP / +10 Linh Thạch
                </span>
              </div>

              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[4px] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[4px] bg-violet-650/10 text-violet-400 border border-violet-600/20">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-200 uppercase tracking-wide">Viết Đánh Giá Phim</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Nhận xét khách quan chất lượng phim.</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-[2px] uppercase">
                  +30 EXP / +5 Linh Thạch
                </span>
              </div>

              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[4px] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[4px] bg-violet-650/10 text-violet-400 border border-violet-600/20">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-200 uppercase tracking-wide">Bình Luận Tập Phim</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Tham gia thảo luận dưới player xem phim.</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-[2px] uppercase">
                  +10 EXP / +2 Linh Thạch
                </span>
              </div>

              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[4px] flex items-center justify-between gap-4 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[4px] bg-violet-650/10 text-violet-400 border border-violet-600/20">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-200 uppercase tracking-wide">Báo Cáo Tập Phim Hỏng</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Giúp admin sửa lỗi phát video (sắp ra mắt).</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-[2px] uppercase">
                  +100 EXP / +20 Linh Thạch
                </span>
              </div>

            </div>
          </div>
        )}

        {/* -------------------- TAB 3: LORE (BẢNG CẢNH GIỚI) -------------------- */}
        {activeTab === 'lore' && (
          <div className="bg-[#0c0c10]/75 border border-zinc-900 rounded-[6px] p-6 backdrop-blur-md text-left flex flex-col gap-6">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">🌟 Hệ Thống Cảnh Giới Tu Tiên</h2>
              <p className="text-xs text-zinc-500 mt-1">Danh sách phân chia đẳng cấp tu vi từ Luyện Khí cho tới Tiên Nhân tối thượng.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(RANK_STYLES).map(([rankName, info], idx) => {
                const isCurrent = currentRank === rankName;
                return (
                  <div 
                    key={rankName} 
                    className={`p-4 rounded-[4px] border transition-all ${
                      isCurrent 
                        ? `${info.border} ${info.bg} ring-1 ring-amber-500/20 shadow-md` 
                        : 'bg-zinc-950/20 border-zinc-900/60'
                    } flex gap-4 items-start`}
                  >
                    <div className="text-[11px] font-black text-zinc-650 mt-1.5 w-6 text-right">
                      {idx + 1}.
                    </div>
                    <div className="flex flex-col flex-grow text-left">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black ${info.text}`}>{rankName}</span>
                        {isCurrent && (
                          <span className="text-[8px] font-black bg-amber-500 text-black px-1.5 py-0.5 rounded-[2px] uppercase tracking-wider">
                            Hiện Tại
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        {info.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
