import { useQuery } from '@tanstack/react-query';
import { 
    getAnalyticsStats, 
    getTopQuestions, 
    getDailyActivity, 
    getRecentQuestions,
    getCacheStats as fetchCacheStats,
    flushCache
} from '../lib/api';
import { 
    BarChart3, 
    MessageSquare, 
    FileText, 
    Users, 
    TrendingUp,
    Clock,
    RefreshCw,
    Download,
    Zap,
    Database,
    Trash2,
    Brain
} from 'lucide-react';
import './AnalyticsPage.css';

export default function AnalyticsPage() {
    // Fetch all analytics data
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: getAnalyticsStats
    });

    const { data: topQuestions = [], isLoading: questionsLoading } = useQuery({
        queryKey: ['analytics-top-questions'],
        queryFn: () => getTopQuestions(10)
    });

    const { data: dailyActivity = [], isLoading: activityLoading } = useQuery({
        queryKey: ['analytics-daily-activity'],
        queryFn: () => getDailyActivity(7)
    });

    const { data: recentQuestions = [], isLoading: recentLoading } = useQuery({
        queryKey: ['analytics-recent-questions'],
        queryFn: () => getRecentQuestions(15)
    });

    // CAG Cache Stats
    const { data: cacheStats, refetch: refetchCache } = useQuery({
        queryKey: ['cache-stats'],
        queryFn: fetchCacheStats
    });

    const handleRefresh = () => {
        refetchStats();
        refetchCache();
    };

    const handleFlushCache = async () => {
        if (!window.confirm('Hapus semua cache CAG? Ini akan memperlambat query berikutnya sampai cache dibangun kembali.')) return;
        try {
            await flushCache();
            refetchCache();
            alert('Cache CAG berhasil dihapus!');
        } catch {
            alert('Gagal menghapus cache');
        }
    };

    const handleExport = () => {
        // Build CSV content with proper Excel formatting
        const rows: string[][] = [];
        const today = new Date().toLocaleDateString('id-ID', { 
            day: 'numeric', month: 'long', year: 'numeric' 
        });
        
        // Header
        rows.push(['LAPORAN PENGGUNAAN APLIKASI']);
        rows.push([`Tanggal Export: ${today}`]);
        rows.push([]);
        
        // Stats section
        rows.push(['STATISTIK UMUM', '', '']);
        rows.push(['Metrik', 'Nilai', 'Keterangan']);
        rows.push(['Total Sesi Chat', String(stats?.totalSessions ?? 0), '']);
        rows.push(['Total Pesan', String(stats?.totalMessages ?? 0), '']);
        rows.push(['Total Dokumen', String(stats?.totalDocuments ?? 0), '']);
        rows.push(['Dokumen Aktif', String(stats?.activeDocuments ?? 0), '']);
        rows.push(['Sesi Minggu Ini', String(stats?.sessionsThisWeek ?? 0), '+baru']);
        rows.push(['Pesan Minggu Ini', String(stats?.messagesThisWeek ?? 0), '+baru']);
        rows.push([]);
        
        // Daily activity
        rows.push(['AKTIVITAS 7 HARI TERAKHIR', '', '']);
        rows.push(['Hari', 'Jumlah Pesan', 'Jumlah Sesi']);
        dailyActivity.forEach(d => {
            rows.push([d.date, String(d.messages), String(d.sessions)]);
        });
        rows.push([]);
        
        // Top questions
        rows.push(['TOP 10 PERTANYAAN POPULER', '', '']);
        rows.push(['No', 'Pertanyaan', 'Frekuensi']);
        topQuestions.forEach((q, i) => {
            rows.push([String(i + 1), q.content, `${q.count}x`]);
        });
        rows.push([]);
        
        // Recent questions
        rows.push(['PERTANYAAN TERBARU', '', '']);
        rows.push(['No', 'Waktu', 'Pertanyaan']);
        recentQuestions.forEach((q, i) => {
            const date = new Date(q.created_at).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            rows.push([String(i + 1), date, q.content]);
        });
        
        // Convert to CSV with proper escaping
        const csvContent = rows.map(row => 
            row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                const escaped = String(cell).replace(/"/g, '""');
                if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
                    return `"${escaped}"`;
                }
                return escaped;
            }).join(';') // Use semicolon for better Excel compatibility
        ).join('\r\n');
        
        // Add BOM for UTF-8 Excel compatibility
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Laporan_Penggunaan_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const isLoading = statsLoading || questionsLoading || activityLoading || recentLoading;

    // Calculate max for chart scaling
    const maxMessages = Math.max(...dailyActivity.map(d => d.messages), 1);

    return (
        <div className="analytics-page">
            <header className="analytics-header">
                <div className="analytics-title">
                    <BarChart3 size={28} />
                    <h1>Laporan Penggunaan</h1>
                </div>
                <div className="analytics-actions">
                    <button className="export-btn" onClick={handleExport} disabled={isLoading}>
                        <Download size={18} />
                        Export CSV
                    </button>
                    <button className="refresh-btn" onClick={handleRefresh} disabled={isLoading}>
                        <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
                        Refresh
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <section className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon sessions">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Sesi Chat</span>
                        <span className="stat-value">{stats?.totalSessions ?? '-'}</span>
                        <span className="stat-sub">+{stats?.sessionsThisWeek ?? 0} minggu ini</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon messages">
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Pesan</span>
                        <span className="stat-value">{stats?.totalMessages ?? '-'}</span>
                        <span className="stat-sub">+{stats?.messagesThisWeek ?? 0} minggu ini</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon documents">
                        <FileText size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Dokumen</span>
                        <span className="stat-value">{stats?.totalDocuments ?? '-'}</span>
                        <span className="stat-sub">{stats?.activeDocuments ?? 0} aktif</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon trend">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Aktivitas Mingguan</span>
                        <span className="stat-value">{(stats?.messagesThisWeek ?? 0) + (stats?.sessionsThisWeek ?? 0)}</span>
                        <span className="stat-sub">pesan + sesi</span>
                    </div>
                </div>
            </section>

            {/* Charts and Lists */}
            <div className="analytics-content">
                {/* Daily Activity Chart */}
                <section className="analytics-card activity-chart">
                    <h2>Aktivitas 7 Hari Terakhir</h2>
                    <div className="chart-container">
                        {dailyActivity.map((day, i) => (
                            <div key={i} className="chart-bar-group">
                                <div className="chart-bars">
                                    <div 
                                        className="chart-bar messages-bar" 
                                        style={{ height: `${(day.messages / maxMessages) * 100}%` }}
                                        title={`${day.messages} pesan`}
                                    />
                                </div>
                                <span className="chart-label">{day.date}</span>
                                <span className="chart-value">{day.messages}</span>
                            </div>
                        ))}
                    </div>
                    <div className="chart-legend">
                        <span className="legend-item">
                            <span className="legend-dot messages" />
                            Pesan
                        </span>
                    </div>
                </section>

                {/* Top Questions */}
                <section className="analytics-card top-questions">
                    <h2>Pertanyaan Populer</h2>
                    {topQuestions.length === 0 ? (
                        <p className="empty-state">Belum ada data pertanyaan</p>
                    ) : (
                        <ul className="questions-list">
                            {topQuestions.map((q, i) => (
                                <li key={i} className="question-item">
                                    <span className="question-rank">#{i + 1}</span>
                                    <span className="question-text">{q.content}</span>
                                    <span className="question-count">{q.count}x</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Recent Questions */}
                <section className="analytics-card recent-questions">
                    <h2>
                        <Clock size={18} />
                        Pertanyaan Terbaru
                    </h2>
                    {recentQuestions.length === 0 ? (
                        <p className="empty-state">Belum ada pertanyaan</p>
                    ) : (
                        <ul className="recent-list">
                            {recentQuestions.map((q, i) => (
                                <li key={i} className="recent-item">
                                    <span className="recent-text">{q.content}</span>
                                    <span className="recent-time">
                                        {new Date(q.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {/* CAG Cache Stats Section */}
            <section className="analytics-card cag-section">
                <div className="cag-header">
                    <h2>
                        <Zap size={18} />
                        CAG (Cache Augmented Generation)
                    </h2>
                    <button className="flush-cache-btn" onClick={handleFlushCache}>
                        <Trash2 size={14} />
                        Flush Cache
                    </button>
                </div>

                <div className="cag-grid">
                    <div className="cag-card">
                        <div className="cag-icon context">
                            <Database size={20} />
                        </div>
                        <div className="cag-info">
                            <span className="cag-label">Context Cache</span>
                            <span className="cag-value">{cacheStats?.contextCache.entries ?? 0}/{cacheStats?.contextCache.maxEntries ?? 200}</span>
                            <span className="cag-sub">Hit Rate: {cacheStats?.contextCache.hitRate ?? 0}%</span>
                        </div>
                    </div>

                    <div className="cag-card">
                        <div className="cag-icon response">
                            <Zap size={20} />
                        </div>
                        <div className="cag-info">
                            <span className="cag-label">Response Cache</span>
                            <span className="cag-value">{cacheStats?.responseCache.entries ?? 0}</span>
                            <span className="cag-sub">{cacheStats?.responseCache.totalHits ?? 0} total hits</span>
                        </div>
                    </div>

                    <div className="cag-card">
                        <div className="cag-icon summaries">
                            <Brain size={20} />
                        </div>
                        <div className="cag-info">
                            <span className="cag-label">Document Summaries</span>
                            <span className="cag-value">{cacheStats?.documentSummaries ?? 0}</span>
                            <span className="cag-sub">pre-processed</span>
                        </div>
                    </div>

                    <div className="cag-card">
                        <div className="cag-icon status">
                            <TrendingUp size={20} />
                        </div>
                        <div className="cag-info">
                            <span className="cag-label">Cache Performance</span>
                            <div className="cag-gauge">
                                <div 
                                    className="cag-gauge-fill" 
                                    style={{ width: `${cacheStats?.contextCache.hitRate ?? 0}%` }}
                                />
                            </div>
                            <span className="cag-sub">
                                {cacheStats?.contextCache.hits ?? 0} hits / {cacheStats?.contextCache.misses ?? 0} misses
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
