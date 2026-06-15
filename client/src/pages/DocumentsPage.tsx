import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';
import { getDocuments, toggleDocument, deleteDocument, reindexDocument, flushVectorStore } from '../lib/api'; 
import { useToast } from '../context/ToastContext';
import { Trash2, FileText, Loader2, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import clsx from 'clsx';
import { ConfirmModal, useConfirmModal } from '../components/ConfirmModal';
import { LoadingModal } from '../components/LoadingModal';

export default function DocumentsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  // Custom confirm modal hook
  const confirmModal = useConfirmModal();
  const [pendingAction, setPendingAction] = useState<{ type: 'delete' | 'reindex', id: string } | null>(null);
  const [reindexingDoc, setReindexingDoc] = useState<{ id: string, filename: string } | null>(null);

  // Queries
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: getDocuments
  });

  // Mutations
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      toggleDocument(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast('Status dokumen diperbarui', 'success');
    },
    onError: () => showToast('Gagal mengubah status', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast('Dokumen dihapus', 'success');
    },
    onError: () => showToast('Gagal menghapus dokumen', 'error')
  });

  const reindexMutation = useMutation({
      mutationFn: reindexDocument,
      onSuccess: () => {
          setReindexingDoc(null);
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          showToast('Dokumen berhasil diproses ulang', 'success');
      },
      onError: (err) => {
          setReindexingDoc(null);
          showToast('Gagal memproses ulang dokumen', 'error');
          console.error(err);
      }
  });

  const flushMutation = useMutation({
      mutationFn: flushVectorStore,
      onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ['documents'] });
          showToast(`Berhasil menghapus ${data.deleted} vector chunks`, 'success');
      },
      onError: () => showToast('Gagal menghapus vector store', 'error')
  });

  const handleFlushVectors = useCallback(async () => {
    const confirmed = await confirmModal.showConfirm(
      'Flush Vector Store',
      'Apakah Anda yakin ingin menghapus SEMUA data vector? Ini akan menghapus semua chunk yang sudah diindeks. Tindakan ini tidak dapat dibatalkan.'
    );
    
    if (confirmed) {
      flushMutation.mutate();
    }
  }, [confirmModal, flushMutation]);

  const handleDelete = useCallback(async (id: string, filename: string) => {
    setPendingAction({ type: 'delete', id });
    const confirmed = await confirmModal.showConfirm(
      'Hapus Dokumen',
      `Apakah Anda yakin ingin menghapus dokumen "${filename}"? Tindakan ini tidak dapat dibatalkan.`
    );
    
    if (confirmed) {
      deleteMutation.mutate(id);
    }
    setPendingAction(null);
  }, [confirmModal, deleteMutation]);

  const handleReindex = useCallback(async (id: string, filename: string) => {
    setPendingAction({ type: 'reindex', id });
    const confirmed = await confirmModal.showConfirm(
      'Proses Ulang Dokumen',
      `Proses ini akan membaca ulang dokumen "${filename}" untuk meningkatkan kualitas ekstraksi teks. Lanjutkan?`
    );
    
    if (confirmed) {
      setReindexingDoc({ id, filename });
      reindexMutation.mutate(id);
    }
    setPendingAction(null);
  }, [confirmModal, reindexMutation]);

  const handleToggle = (id: string, currentStatus: boolean) => {
      toggleMutation.mutate({ id, isActive: !currentStatus });
  };

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filtered & Paginated Data
    const sortedDocuments = useMemo(() => {
        return documents ? [...documents].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];
    }, [documents]);

    const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage);
    const displayedDocuments = sortedDocuments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (isLoading) return (
        <div className="loading-container">
            <div className="loading-content">
                <Loader2 className="loading-spinner" size={40} />
                <p className="loading-text">Memuat dokumen...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="error-container">
            <div className="error-card">
                <AlertTriangle className="mb-4" size={48} />
                <h3 className="text-lg font-bold mb-2">Gagal Memuat Data</h3>
                <p>Terjadi kesalahan saat mengambil daftar dokumen. Silakan coba muat ulang halaman.</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="btn-retry"
                >
                  Muat Ulang
                </button>
            </div>
        </div>
    );

  return (
    <div className="docs-page-container">
        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={pendingAction?.type === 'delete' ? 'Hapus' : 'Proses Ulang'}
          cancelText="Batal"
          variant={pendingAction?.type === 'delete' ? 'danger' : 'warning'}
          onConfirm={confirmModal.handleConfirm}
          onCancel={confirmModal.handleCancel}
        />
        
        {/* Loading Modal for Re-indexing */}
        <LoadingModal
          isOpen={reindexingDoc !== null}
          message="Memproses Dokumen..."
          subMessage={reindexingDoc ? `Re-indexing: ${reindexingDoc.filename}` : undefined}
        />
        
        <div className="docs-content-wrapper">
            {/* Hero Section */}
            <header className="documents-hero">
                <div className="hero-content">
                    <div className="hero-title-group">
                        <h1 className="hero-title">
                            <FileText className="text-yellow-400" size={32} />
                            Manajemen Dokumen
                        </h1>
                        <p className="hero-subtitle">
                            Kelola dokumen sumber pengetahuan AI. Dokumen yang aktif akan digunakan sebagai referensi untuk menjawab pertanyaan masyarakat.
                        </p>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{documents?.length || 0}</div>
                        <div className="stat-label">Total Dokumen</div>
                    </div>
                    <button 
                        className="btn-flush-vectors"
                        onClick={handleFlushVectors}
                        disabled={flushMutation.isPending}
                        title="Hapus semua data vector"
                    >
                        <Database size={18} />
                        {flushMutation.isPending ? 'Menghapus...' : 'Flush Vectors'}
                    </button>
                </div>
                
                {/* Background Decorations */}
                <div className="hero-blob-1"></div>
                <div className="hero-blob-2"></div>
            </header>

            {/* Content Card */}
            <div className="docs-card">
                <div className="overflow-x-auto">
                    <table className="docs-table">
                        <thead>
                            <tr>
                                <th>Nama File</th>
                                <th style={{ width: '150px' }}>Statistik</th>
                                <th style={{ width: '150px' }}>Diunggah</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                                <th style={{ width: '80px', textAlign: 'center' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedDocuments.map((doc: any) => (
                                <tr key={doc.id}>
                                    <td>
                                        <div className="doc-info">
                                            <div className="doc-icon">
                                                <FileText size={24} />
                                            </div>
                                            <div className="doc-details">
                                                <div className="doc-name">{doc.filename}</div>
                                                <div className="doc-id">ID: {doc.id.substring(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="doc-stats">
                                            <span className="doc-stat-item">
                                                <span className="dot-blue"></span>
                                                {doc.pages_count} Halaman
                                            </span>
                                            <span className="doc-stat-item">
                                                <span className="dot-purple"></span>
                                                {doc.chunks_count} Chunks
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-sm text-slate-500 font-medium">
                                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleToggle(doc.id, doc.is_active ?? true)}
                                            className={clsx("toggle-switch", (doc.is_active ?? true) && "active")}
                                            title={(doc.is_active ?? true) ? "Non-aktifkan" : "Aktifkan"}
                                        >
                                            <span className="toggle-knob" />
                                        </button>
                                        <div className={clsx("status-label", (doc.is_active ?? true) && "active")}>
                                            {(doc.is_active ?? true) ? "Aktif" : "Non-Aktif"}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            {/* Re-index button - available for all documents */}
                                            <button
                                                onClick={() => handleReindex(doc.id, doc.filename)}
                                                style={{
                                                    padding: '8px',
                                                    color: '#059669',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#ecfdf5';
                                                    e.currentTarget.style.color = '#047857';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = '#059669';
                                                }}
                                                title="Re-index Dokumen"
                                            >
                                                <RefreshCw size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(doc.id, doc.filename)}
                                                style={{
                                                    padding: '8px',
                                                    color: '#94a3b8',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#ffe4e6';
                                                    e.currentTarget.style.color = '#f43f5e';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = '#94a3b8';
                                                }}
                                                title="Hapus Dokumen Permanen"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            
                            {displayedDocuments.length === 0 && (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="empty-state">
                                            <div className="empty-icon">
                                                <FileText size={48} />
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-700 mb-1">Belum ada dokumen</h3>
                                            <p>Silakan unggah dokumen PDF di menu Upload.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="pagination-container">
                        <div className="pagination-info">
                            Menampilkan <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, sortedDocuments.length)}</span> dari <span className="font-semibold text-slate-700">{sortedDocuments.length}</span> dokumen
                        </div>
                        <div className="pagination-controls">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="btn-pagination"
                            >
                                Sebelumnya
                            </button>
                            <div className="page-numbers">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={clsx("page-number-btn", currentPage === page && "active")}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="btn-pagination"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
