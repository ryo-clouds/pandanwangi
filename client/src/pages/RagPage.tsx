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
        
        <div className="rag-header">
            <h1>Manajemen Basis Pengetahuan</h1>
            <p>Unggah dokumen PDF untuk melatih pengetahuan spesifik Asisten AI Anda.</p>
        </div>

        {/* Upload Card */}
        <div className="upload-card">
            <div className="upload-center">
                <div className="icon-box">
                    <Database size={32} />
                </div>
                
                <h3 className="upload-title">Tambah Pengetahuan Baru</h3>
                <p className="upload-desc">
                    Tarik dan lepas file PDF Anda di sini, atau klik untuk menelusuri. Sistem akan otomatis memotong dan membuat embedding konten.
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
                            {uploading ? "Menganalisis & Mengindeks..." : "Pilih Dokumen"}
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
                            {status === 'success' ? "Proses Selesai" : "Proses Gagal"}
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
                    <h3 className="info-title">Format Didukung</h3>
                </div>
                <p className="info-text">
                    Saat ini hanya mendukung file PDF. Teks dan metadata akan diekstrak untuk Retrieval Augmented Generation (RAG).
                </p>
            </div>
            <div className="info-card">
                <div className="info-header">
                    <Database size={20} color="var(--slate-400)"/>
                    <h3 className="info-title">Penyimpanan Vektor</h3>
                </div>
                <p className="info-text">
                    Dokumen akan diproses menjadi chunks berukuran 1000 karakter, dikonversi menjadi vektor embeddings (12B), dan disimpan secara lokal menggunakan HNSWLib.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
