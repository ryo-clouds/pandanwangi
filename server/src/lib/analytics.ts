import { supabase } from './supabase';

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

export interface DocumentUsage {
    filename: string;
    accessCount: number;
}

export interface DailyActivity {
    date: string;
    messages: number;
    sessions: number;
}

// Get overall stats
export const getAnalyticsStats = async (): Promise<AnalyticsStats> => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoStr = oneWeekAgo.toISOString();

    // Get total sessions
    const { count: totalSessions } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true });
    
    // Get total messages
    const { count: totalMessages } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });
    
    // Get total documents
    const { count: totalDocuments } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });
    
    // Get active documents
    const { count: activeDocuments } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
    
    // Get messages this week
    const { count: messagesThisWeek } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgoStr);
    
    // Get sessions this week
    const { count: sessionsThisWeek } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgoStr);

    return {
        totalSessions: totalSessions || 0,
        totalMessages: totalMessages || 0,
        totalDocuments: totalDocuments || 0,
        activeDocuments: activeDocuments || 0,
        messagesThisWeek: messagesThisWeek || 0,
        sessionsThisWeek: sessionsThisWeek || 0
    };
};

// Get top questions asked by users
export const getTopQuestions = async (limit: number = 10): Promise<TopQuestion[]> => {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('content')
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(100);
    
    if (error || !data) return [];
    
    // Group similar questions (simple word matching)
    const questionCounts = new Map<string, number>();
    
    data.forEach(msg => {
        const content = msg.content.toLowerCase().trim();
        // Truncate to first 80 chars for grouping
        const key = content.slice(0, 80);
        questionCounts.set(key, (questionCounts.get(key) || 0) + 1);
    });
    
    // Sort and return top questions
    return Array.from(questionCounts.entries())
        .map(([content, count]) => ({ content, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
};

// Get document usage/access stats
export const getDocumentUsage = async (): Promise<DocumentUsage[]> => {
    // Get all documents with their usage based on references in message sources
    const { data: docs, error } = await supabase
        .from('documents')
        .select('id, filename, created_at')
        .order('created_at', { ascending: false });
    
    if (error || !docs) return [];
    
    // For now, return docs with placeholder access count
    // In future, could track actual access in a separate table
    return docs.map(doc => ({
        filename: doc.filename,
        accessCount: 0 // Placeholder - could be enhanced
    }));
};

// Get daily activity for chart
export const getDailyActivity = async (days: number = 7): Promise<DailyActivity[]> => {
    const result: DailyActivity[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();
        
        const { count: messages } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);
        
        const { count: sessions } = await supabase
            .from('chat_sessions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);
        
        result.push({
            date: date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
            messages: messages || 0,
            sessions: sessions || 0
        });
    }
    
    return result;
};

// Get recent user questions
export const getRecentQuestions = async (limit: number = 20): Promise<{ content: string; created_at: string }[]> => {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('content, created_at')
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error || !data) return [];
    return data;
};
