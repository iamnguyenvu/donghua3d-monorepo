export enum Role {
  USER = 'USER',
  EXPERT = 'EXPERT',
  ADMIN = 'ADMIN',
}

export enum Tier {
  S = 'S',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

export enum RatingType {
  USER = 'USER',
  EXPERT = 'EXPERT',
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Custom Response wrapper matches backend structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Standard API fetching wrapper that appends Auth token from localStorage
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Retrieve token securely from browser localStorage if available
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('donghua3d_token');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    const res = await fetch(url, mergedOptions);
    const data = await res.json();
    return data as ApiResponse<T>;
  } catch (err) {
    console.error(`[API Fetch Error] Endpoint ${endpoint} failed:`, err);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại đường truyền.',
      },
    };
  }
}

// ==============================================================================
// AUTHENTICATION ENDPOINTS
// ==============================================================================
export interface UserPayload {
  id: string;
  email: string;
  role: Role;
  reputationScore: number;
  veteranSince?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: UserPayload;
}

export const authApi = {
  async register(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const res = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.data?.token) {
      localStorage.setItem('donghua3d_token', res.data.token);
    }
    return res;
  },

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const res = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.data?.token) {
      localStorage.setItem('donghua3d_token', res.data.token);
    }
    return res;
  },

  async getMe(): Promise<ApiResponse<UserPayload>> {
    return apiFetch<UserPayload>('/auth/me');
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('donghua3d_token');
    }
  }
};

// ==============================================================================
// MOVIE & EPISODE CATALOG ENDPOINTS
// ==============================================================================
export interface LeaderboardPayload {
  globalTier: Tier;
  tierScore: number;
  rank?: number;
  s_tier_count?: number;
  a_tier_count?: number;
  b_tier_count?: number;
  c_tier_count?: number;
  d_tier_count?: number;
  f_tier_count?: number;
}

export interface MoviePayload {
  id: string;
  title: string;
  altTitles: string[];
  description?: string;
  studio?: string;
  releaseYear: number;
  posterUrl?: string;
  bannerUrl?: string;
  rating: number;
  expertRating: number;
  audienceRating: number;
  imdbRating?: number | null;
  createdAt: string;
  updatedAt?: string;
  leaderboard?: LeaderboardPayload;
  // New fields for premium card display
  episodeCount?: number;
  viewsCount?: number;
  airingDay?: string;
  seriesId?: string;
  seriesLabel?: string;
}

export interface EpisodePayload {
  id: string;
  movieId: string;
  episodeNumber: number;
  title: string;
  description?: string;
  videoUrl: string;
  videoUrl4k?: string | null;
  isVipOnly?: boolean;
  duration: number;
  introStart: number;
  introEnd: number;
  outroStart: number;
  outroEnd: number;
  thumbnail?: string;
  watchHistory?: {
    progress: number;
    completed: boolean;
  };
}

export interface MovieWithEpisodes extends MoviePayload {
  episodes: EpisodePayload[];
  seriesMovies?: MoviePayload[]; // Related parts in the same series (for switcher panel)
}

export const catalogApi = {
  async getMovies(filters?: { year?: number; search?: string; sort?: string }): Promise<ApiResponse<MoviePayload[]>> {
    let query = '';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', filters.year.toString());
      if (filters.search) params.set('search', filters.search);
      if (filters.sort) params.set('sort', filters.sort);
      query = `?${params.toString()}`;
    }
    return apiFetch<MoviePayload[]>(`/catalog/movies${query}`);
  },

  async getMovie(id: string): Promise<ApiResponse<MovieWithEpisodes>> {
    return apiFetch<MovieWithEpisodes>(`/catalog/movies/${id}`);
  },

  async getEpisode(id: string): Promise<ApiResponse<EpisodePayload>> {
    return apiFetch<EpisodePayload>(`/catalog/episodes/${id}`);
  },

  async saveWatchHistory(episodeId: string, progress: number, completed: boolean): Promise<ApiResponse<unknown>> {
    return apiFetch<unknown>(`/catalog/episodes/${episodeId}/watch-history`, {
      method: 'POST',
      body: JSON.stringify({ progress, completed }),
    });
  }
};

// ==============================================================================
// RATING / REVIEW SYSTEM ENDPOINTS
// ==============================================================================
export interface ReviewPayload {
  id: string;
  userId: string;
  movieId: string;
  episodeId?: string;
  ratingType: RatingType;
  value: number;
  review?: string;
  isCredible: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: Role;
    reputationScore: number;
  };
}

export const ratingApi = {
  async submitRating(movieId: string, episodeId: string | null, value: number, review?: string): Promise<ApiResponse<ReviewPayload>> {
    return apiFetch<ReviewPayload>('/ratings', {
      method: 'POST',
      body: JSON.stringify({ movieId, episodeId, value, review }),
    });
  },

  async getReviews(movieId: string): Promise<ApiResponse<ReviewPayload[]>> {
    return apiFetch<ReviewPayload[]>(`/ratings/movie/${movieId}`);
  }
};

// ==============================================================================
// COMMENT SYSTEM ENDPOINTS
// ==============================================================================
export interface CommentPayload {
  id: string;
  userId: string;
  movieId: string;
  episodeId?: string;
  parentId?: string;
  content: string;
  isSpoiler: boolean;
  isFlagged: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: Role;
    reputationScore: number;
  };
}

export const commentApi = {
  async getComments(movieId: string, episodeId?: string): Promise<ApiResponse<CommentPayload[]>> {
    const query = episodeId ? `?episodeId=${episodeId}` : '';
    return apiFetch<CommentPayload[]>(`/comments/movie/${movieId}${query}`);
  },

  async postComment(movieId: string, episodeId: string | null, parentId: string | null, content: string, isSpoiler: boolean): Promise<ApiResponse<CommentPayload>> {
    return apiFetch<CommentPayload>('/comments', {
      method: 'POST',
      body: JSON.stringify({ movieId, episodeId, parentId, content, isSpoiler }),
    });
  },

  async toggleSpoiler(id: string, isSpoiler?: boolean): Promise<ApiResponse<CommentPayload>> {
    return apiFetch<CommentPayload>(`/comments/${id}/spoiler`, {
      method: 'PUT',
      body: JSON.stringify({ isSpoiler }),
    });
  },

  async flagComment(id: string): Promise<ApiResponse<unknown>> {
    return apiFetch<unknown>(`/comments/${id}/flag`, {
      method: 'POST',
    });
  },

  async deleteComment(id: string): Promise<ApiResponse<unknown>> {
    return apiFetch<unknown>(`/comments/${id}`, {
      method: 'DELETE',
    });
  }
};

// ==============================================================================
// TIER LIST & LEADERBOARD ENDPOINTS
// ==============================================================================
export interface PersonalTierPayload {
  id: string;
  userId: string;
  movieId: string;
  tier: Tier;
  notes?: string;
  movie: {
    id: string;
    title: string;
    posterUrl: string;
    bannerUrl?: string;
    rating: number;
  };
}

export interface LeaderboardRowPayload {
  id: string;
  movieId: string;
  s_tier_count: number;
  a_tier_count: number;
  b_tier_count: number;
  c_tier_count: number;
  d_tier_count: number;
  f_tier_count: number;
  tierScore: number;
  globalTier: Tier;
  rank: number;
  movie: {
    id: string;
    title: string;
    posterUrl: string;
    bannerUrl?: string;
    rating: number;
    studio: string;
    releaseYear: number;
  };
}

export const tierApi = {
  async getPersonalTiers(): Promise<ApiResponse<PersonalTierPayload[]>> {
    return apiFetch<PersonalTierPayload[]>('/tiers/personal');
  },

  async savePersonalTier(movieId: string, tier: Tier, notes?: string): Promise<ApiResponse<PersonalTierPayload>> {
    return apiFetch<PersonalTierPayload>('/tiers/personal', {
      method: 'POST',
      body: JSON.stringify({ movieId, tier, notes }),
    });
  },

  async getLeaderboard(): Promise<ApiResponse<LeaderboardRowPayload[]>> {
    return apiFetch<LeaderboardRowPayload[]>('/tiers/leaderboard');
  }
};

// ==============================================================================
// WATCHLIST / FAVORITES SYSTEM ENDPOINTS
// ==============================================================================
export const watchlistApi = {
  async getWatchlist(): Promise<ApiResponse<MoviePayload[]>> {
    return apiFetch<MoviePayload[]>('/watchlist');
  },

  async addToWatchlist(movieId: string): Promise<ApiResponse<unknown>> {
    return apiFetch<unknown>(`/watchlist/${movieId}`, {
      method: 'POST',
    });
  },

  async removeFromWatchlist(movieId: string): Promise<ApiResponse<unknown>> {
    return apiFetch<unknown>(`/watchlist/${movieId}`, {
      method: 'DELETE',
    });
  },

  async checkInWatchlist(movieId: string): Promise<ApiResponse<{ isAdded: boolean }>> {
    return apiFetch<{ isAdded: boolean }>(`/watchlist/check/${movieId}`);
  }
};

/**
 * Returns a customized Tailwind object position class based on movie title to ensure
 * optimal framing and cropping of poster images on various card ratios and mobile viewports.
 */
export function getPosterPosition(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('kiếm lai')) return 'object-[28%_15%]';
  if (t.includes('còn ra thể thống')) return 'object-center';
  if (t.includes('to be hero')) return 'object-center';
  if (t.includes('chúa tể huyền bí')) return 'object-[50%_25%]';
  if (t.includes('mục thần ký')) return 'object-[50%_25%]';
  if (t.includes('đấu phá thương khung')) return 'object-center';
  return 'object-top'; // default fallback for standard upright portraits
}

/**
 * Clean up scraped raw/ugly titles dynamically before rendering them in the UI.
 * e.g., "EP01_ The Swords - Free - China - Comic - - -" => "Tập 1"
 */
export function cleanEpisodeTitle(title: string, episodeNumber?: number): string {
  if (!title) return episodeNumber ? `Tập ${episodeNumber}` : '';
  
  let clean = title;

  // Remove common video file extensions first
  clean = clean.replace(/\.(mp4|m3u8|mkv|avi|flv|ts)$/i, '');

  // Detect and clean ugly video filenames (containing dots/underscores/dashes and video quality terms)
  const lower = clean.toLowerCase();
  const isUglyFile = (clean.split('.').length > 3 || clean.split('_').length > 3 || clean.split('-').length > 3) && (
    lower.includes('hevc') ||
    lower.includes('h264') ||
    lower.includes('h265') ||
    lower.includes('x264') ||
    lower.includes('x265') ||
    lower.includes('4k') ||
    lower.includes('1080p') ||
    lower.includes('720p') ||
    lower.includes('engsub') ||
    lower.includes('vietsub') ||
    lower.includes('tvh') ||
    lower.includes('gb88') ||
    lower.includes('sub') ||
    /s\d+e\d+/i.test(lower) ||
    /s\d+/i.test(lower)
  );

  if (isUglyFile) {
    if (episodeNumber) {
      return `Tập ${episodeNumber}`;
    }
  }
  
  // Remove common ugly prefixes (like EP01, EP_01, Tập 1, etc.)
  clean = clean.replace(/^(?:ep|episode|tập)\s*\d+[\s_:\-]*/i, '');
  
  // Remove common ugly suffixes (like - Free, - China, - Comic, etc.)
  // Handles multiple combinations of these strings, with optional dashes or separators
  clean = clean.replace(/\s*(?:-|\||\s)\s*(?:free|china|comic|vietsub|raw|hoathinh|sub|cartoon|anime|thuyetminh|lồng tiếng|longtieng).*$/gi, '');
  
  // Clean trailing punctuation or separators
  clean = clean.replace(/[\s\-\|:_]+$/, '');
  
  // If the title is left empty, or matches generic anime words (e.g., "The Swords" for Kiếm Lai, "Lord of Mysteries" for Chúa Tể Huyền Bí, etc.)
  // we default to "Tập [episodeNumber]" to look clean and neat.
  const lowerClean = clean.toLowerCase().trim();
  if (!clean || 
      lowerClean === 'the swords' || 
      lowerClean === 'lord of mysteries' || 
      lowerClean === 'lord of the mysteries' ||
      lowerClean === 'kiếm lai' || 
      lowerClean === 'chúa tể huyền bí' ||
      lowerClean === 'mục thần ký' ||
      lowerClean === 'tập' || 
      lowerClean === 'episode' ||
      (/^[a-z0-9\s_\-\.]+$/i.test(lowerClean) && (lowerClean.includes('episode') || lowerClean.includes('ep') || lowerClean.includes('tap')))) {
    if (episodeNumber) {
      return `Tập ${episodeNumber}`;
    }
  }
  
  return clean.trim() || (episodeNumber ? `Tập ${episodeNumber}` : '');
}

// ==============================================================================
// ADMIN MANAGEMENT ENDPOINTS
// ==============================================================================
export interface AdminStatsPayload {
  totalUsers: number;
  totalMovies: number;
  totalComments: number;
  totalRatings: number;
  flaggedCommentsCount: number;
}

export interface AdminUserPayload {
  id: string;
  email: string;
  role: Role;
  reputationScore: number;
  createdAt: string;
  veteranSince?: string;
}

export interface FlaggedCommentPayload {
  id: string;
  userId: string;
  movieId: string;
  episodeId?: string;
  content: string;
  isSpoiler: boolean;
  isFlagged: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
  movie: {
    id: string;
    title: string;
  };
  episode?: {
    id: string;
    episodeNumber: number;
  };
}

export interface ScrapingQueueItem {
  id: string;
  sourceUrl: string;
  targetMovieId?: string;
  targetEpisodeNumber?: number;
  audioTrack: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  errorMessage?: string;
  createdAt: string;
}

export const adminApi = {
  async getStats(): Promise<ApiResponse<AdminStatsPayload>> {
    return apiFetch<AdminStatsPayload>('/admin/stats');
  },

  async getUsers(): Promise<ApiResponse<AdminUserPayload[]>> {
    return apiFetch<AdminUserPayload[]>('/admin/users');
  },

  async updateUserRole(id: string, role: Role): Promise<ApiResponse<{ id: string; email: string; role: Role }>> {
    return apiFetch<{ id: string; email: string; role: Role }>(`/admin/users/${id}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async banUser(id: string): Promise<ApiResponse<{ id: string; email: string; reputationScore: number }>> {
    return apiFetch<{ id: string; email: string; reputationScore: number }>(`/admin/users/${id}/ban`, {
      method: 'POST',
    });
  },

  async unbanUser(id: string): Promise<ApiResponse<{ id: string; email: string; reputationScore: number }>> {
    return apiFetch<{ id: string; email: string; reputationScore: number }>(`/admin/users/${id}/unban`, {
      method: 'POST',
    });
  },

  async getFlaggedComments(): Promise<ApiResponse<FlaggedCommentPayload[]>> {
    return apiFetch<FlaggedCommentPayload[]>('/admin/comments/flagged');
  },

  async dismissCommentFlag(id: string): Promise<ApiResponse<unknown>> {
    return apiFetch<unknown>(`/admin/comments/${id}/dismiss-flag`, {
      method: 'POST',
    });
  },

  async deleteComment(id: string): Promise<ApiResponse<unknown>> {
    return apiFetch<unknown>(`/admin/comments/${id}`, {
      method: 'DELETE',
    });
  },

  async getScrapingQueue(): Promise<ApiResponse<ScrapingQueueItem[]>> {
    return apiFetch<ScrapingQueueItem[]>('/admin/scraping-queue');
  },

  async triggerScraperWorker(): Promise<ApiResponse<{ message: string; processedCount: number }>> {
    return apiFetch<{ message: string; processedCount: number }>('/admin/scraping-queue/trigger', {
      method: 'POST',
    });
  },

  async addScrapingTask(payload: { sourceUrl: string; audioTrack: string; targetMovieId?: string; targetEpisodeNumber?: number }): Promise<ApiResponse<ScrapingQueueItem>> {
    return apiFetch<ScrapingQueueItem>('/admin/scraping-queue/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
};
