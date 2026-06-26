import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({
  baseURL: API_URL,
});

export interface ChatResponse {
  answer: string;
  sources: { page: number; source: string }[];
}

export interface UploadResponse {
  message: string;
  stats: {
    chunks: number;
    pages: number;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

// Auth
export const loginAdmin = async (password: string): Promise<string> => {
    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    return data.token;
};

// Documents
export const getDocuments = async (): Promise<any[]> => {
    const token = localStorage.getItem('admin_token');
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/documents`, { headers });
    if (!res.ok) throw new Error("Failed to fetch documents");
    return res.json();
};

export const clearHistory = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error("Unauthorized: Login required");
    
    await fetch(`${API_URL}/history`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

export const uploadDocument = async (file: File) => {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error("Unauthorized: Login required");
    
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
};

export const toggleDocument = async (id: string, isActive: boolean) => {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error("Unauthorized");

    const res = await fetch(`${API_URL}/documents/${id}/toggle`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ isActive })
    });
    
    if (!res.ok) throw new Error("Toggle failed");
    return res.json();
};

export const reindexDocument = async (id: string) => {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error("Unauthorized");

    const res = await fetch(`${API_URL}/documents/${id}/reindex`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Re-index failed");
    return res.json();
};

export const deleteDocument = async (id: string) => {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error("Unauthorized");

    const res = await fetch(`${API_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Delete failed");
    return res.json();
};

export const flushVectorStore = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error("Unauthorized");

    const res = await fetch(`${API_URL}/vectors/flush`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Flush failed");
    return res.json();
};

export const chatWithAgent = async (message: string, sessionId?: string) => {
  return api.post<ChatResponse>('/chat', { message, sessionId }).then(res => res.data);
};

export const createSession = async (title: string) => {
  return api.post<ChatSession>('/sessions', { title }).then(res => res.data);
};

export const getSessions = async () => {
  return api.get<ChatSession[]>('/sessions').then(res => res.data);
};

export const getSessionMessages = async (sessionId: string) => {
  return api.get<any[]>(`/sessions/${sessionId}`).then(res => res.data);
};

export const getHistory = async () => {
    return api.get<any[]>('/history').then(res => res.data);
};

export const deleteSession = async (sessionId: string) => {
    return api.delete(`/sessions/${sessionId}`).then(res => res.data);
};

// ============ ANALYTICS ============

export interface AnalyticsStats {
    totalSessions: number;
    totalMessages: number;
    totalDocuments: number;
    activeDocuments: number;
    messagesThisWeek: number;
    sessionsThisWeek: number;
}

export interface TopQuestion {
    content: string;
    count: number;
}

export interface DailyActivity {
    date: string;
    messages: number;
    sessions: number;
}

export const getAnalyticsStats = async (): Promise<AnalyticsStats> => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_URL}/analytics/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch analytics stats');
    return res.json();
};

export const getTopQuestions = async (limit: number = 10): Promise<TopQuestion[]> => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_URL}/analytics/top-questions?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch top questions');
    return res.json();
};

export const getDailyActivity = async (days: number = 7): Promise<DailyActivity[]> => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_URL}/analytics/daily-activity?days=${days}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch daily activity');
    return res.json();
};

export const getRecentQuestions = async (limit: number = 20): Promise<{ content: string; created_at: string }[]> => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_URL}/analytics/recent-questions?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch recent questions');
    return res.json();
};

// ============ CAG CACHE ============

export interface CacheStats {
    contextCache: {
        entries: number;
        maxEntries: number;
        hits: number;
        misses: number;
        hitRate: number;
        ttlMinutes: number;
    };
    responseCache: {
        entries: number;
        totalHits: number;
    };
    documentSummaries: number;
    cagEnabled: boolean;
}

export const getCacheStats = async (): Promise<CacheStats> => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_URL}/cache/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch cache stats');
    return res.json();
};

export const flushCache = async (): Promise<any> => {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_URL}/cache/flush`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to flush cache');
    return res.json();
};
