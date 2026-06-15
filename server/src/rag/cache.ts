import crypto from 'crypto';
import { supabase } from '../lib/supabase';

// ============ QUERY NORMALIZATION ============

export const normalizeQuery = (query: string): string => {
    return query
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')        // collapse whitespace
        .replace(/[?!.,;:]+$/g, '')   // remove trailing punctuation
        .replace(/\b(tolong|bisa|coba|mohon|dong|ya|kah|lah|kan)\b/gi, '') // remove filler words
        .replace(/\s+/g, ' ')
        .trim();
};

export const hashQuery = (query: string): string => {
    const normalized = normalizeQuery(query);
    return crypto.createHash('md5').update(normalized).digest('hex');
};

// ============ IN-MEMORY CONTEXT CACHE (Layer 2) ============

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    hits: number;
}

class LRUCache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private maxEntries: number;
    private ttlMs: number;
    private stats = { hits: 0, misses: 0 };

    constructor(maxEntries: number = 200, ttlMinutes: number = 30) {
        this.maxEntries = maxEntries;
        this.ttlMs = ttlMinutes * 60 * 1000;
    }

    get(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check TTL
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        entry.hits++;
        this.cache.set(key, entry);
        this.stats.hits++;

        return entry.data;
    }

    set(key: string, data: T): void {
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxEntries) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            hits: 0
        });
    }

    clear(): number {
        const size = this.cache.size;
        this.cache.clear();
        this.stats = { hits: 0, misses: 0 };
        return size;
    }

    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            entries: this.cache.size,
            maxEntries: this.maxEntries,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: total > 0 ? Math.round((this.stats.hits / total) * 100) : 0,
            ttlMinutes: this.ttlMs / 60000
        };
    }
}

// Singleton cache instances
export const contextCache = new LRUCache<{ context: string; docs: any[] }>(200, 30);

// ============ RESPONSE CACHE (Layer 3 - Supabase) ============

export const getResponseCache = async (queryHash: string): Promise<{
    response: string;
    sources: any[];
} | null> => {
    try {
        const { data, error } = await supabase
            .from('response_cache')
            .select('response, sources, hit_count')
            .eq('query_hash', queryHash)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error || !data) return null;

        // Increment hit count
        await supabase
            .from('response_cache')
            .update({ hit_count: (data.hit_count || 0) + 1 })
            .eq('query_hash', queryHash);

        console.log(`🎯 [CAG] Response cache HIT for hash: ${queryHash}`);
        return { response: data.response, sources: data.sources || [] };
    } catch {
        return null;
    }
};

export const saveResponseCache = async (
    queryHash: string,
    queryText: string,
    response: string,
    sources: any[]
): Promise<void> => {
    try {
        await supabase
            .from('response_cache')
            .upsert({
                query_hash: queryHash,
                query_text: queryText,
                response,
                sources,
                hit_count: 0,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }, { onConflict: 'query_hash' });

        console.log(`💾 [CAG] Response cached for hash: ${queryHash}`);
    } catch (e: any) {
        console.warn('[CAG] Failed to save response cache:', e.message);
    }
};

export const clearResponseCache = async (): Promise<number> => {
    try {
        const { data } = await supabase
            .from('response_cache')
            .select('id');
        
        const count = data?.length || 0;
        
        await supabase
            .from('response_cache')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

        return count;
    } catch {
        return 0;
    }
};

// ============ COMBINED CACHE STATS ============

export const getCacheStats = async () => {
    const contextStats = contextCache.getStats();
    
    let responseCacheCount = 0;
    let responseCacheHits = 0;
    try {
        const { data } = await supabase
            .from('response_cache')
            .select('hit_count')
            .gt('expires_at', new Date().toISOString());
        
        if (data) {
            responseCacheCount = data.length;
            responseCacheHits = data.reduce((sum, r) => sum + (r.hit_count || 0), 0);
        }
    } catch {}

    let summaryCount = 0;
    try {
        const { data } = await supabase
            .from('document_summaries')
            .select('id');
        summaryCount = data?.length || 0;
    } catch {}

    return {
        contextCache: contextStats,
        responseCache: {
            entries: responseCacheCount,
            totalHits: responseCacheHits
        },
        documentSummaries: summaryCount,
        cagEnabled: true
    };
};
