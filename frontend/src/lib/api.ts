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
  leaderboard?: LeaderboardPayload;
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

