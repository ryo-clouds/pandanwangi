import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Database } from 'lucide-react';
import { uploadDocument } from '../lib/api';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function RagPage() {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<{chunks: number, pages: number} | null>(null);
  
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/login');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) return null; // Or spinner

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    setUploading(true);
    setStatus('idle');
    try {
      const res = await uploadDocument(file);
      setStatus('success');
      setMessage(`Successfully indexed ${file.name}`);
      setStats(res.stats);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('Failed to process document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rag-page">
      <div className="rag-container">
        
        {/* Header */}
        <div className="rag-header">
            <h1>Knowledge Base Management</h1>
            <p>Upload PDF documents to train your AI Agent's specific knowledge.</p>
        </div>

        {/* Upload Card */}
        <div className="upload-card">
            <div className="upload-center">
                <div className="icon-box">
                    <Database size={32} />
                </div>
                
                <h3 className="upload-title">Add New Knowledge</h3>
                <p className="upload-desc">
                    Drag and drop your PDF files here, or click to browse. The system will automatically chunk and embed the content.
                </p>

                <label className={clsx(
                    "drop-zone",
                    uploading && "uploading"
                )}>
                    <div className="drop-content">
                        {uploading ? (
                            <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--brand-500)', borderTopColor: 'transparent', borderRadius: '50%' }}/>
                        ) : (
                            <Upload size={32} color={uploading ? "var(--brand-500)" : "var(--slate-400)"}/>
                        )}
                        <span className="drop-text">
                            {uploading ? "Analyzing & Indexing..." : "Select Document"}
                        </span>
                    </div>
                    <input type="file" className="hidden" accept=".pdf" onChange={handleUpload} disabled={uploading}/>
                </label>
            </div>

            {/* Status Feedback */}
            {status !== 'idle' && (
                <div 
                    className={clsx(
                        "status-card",
                        status === 'success' ? "success" : "error"
                    )}
                >
                    <div className="status-icon-box">
                        {status === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                    </div>
                    <div className="status-content">
                        <h4>
                            {status === 'success' ? "Ingestion Complete" : "Ingestion Failed"}
                        </h4>
                        <p>
                            {message}
                        </p>
                        {stats && (
                            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--emerald-600)' }}>
                                <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '4px', border: '1px solid var(--emerald-200)' }}>
                                    {stats.pages} Pages Processed
                                </span>
                                <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '4px', border: '1px solid var(--emerald-200)' }}>
                                    {stats.chunks} Vector Chunks Created
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Info Grid */}
        <div className="rag-grid">
            <div className="info-card">
                <div className="info-header">
                    <FileText size={20} color="var(--slate-400)"/>
                    <h3 className="info-title">Supported Formats</h3>
                </div>
                <p className="info-text">
                    Currently supporting <strong>PDF</strong> documents. Text extraction includes layout analysis to preserve context.
                </p>
            </div>
            <div className="info-card">
                <div className="info-header">
                    <Database size={20} color="var(--slate-400)"/>
                    <h3 className="info-title">Vector Storage</h3>
                </div>
                <p className="info-text">
                    Data is stored locally using <strong>HNSWLib</strong> for high-speed approximate nearest neighbor search.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
