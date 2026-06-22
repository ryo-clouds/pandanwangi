import { useState } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { Database, LogIn, LogOut, MessageSquarePlus, History as HistoryIcon, PanelLeft, PanelRight, FileText, Trash2, BarChart3, BookOpen } from 'lucide-react';
import { getSessions, deleteSession } from '../lib/api';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { ConfirmModal, useConfirmModal } from './ConfirmModal';

interface SidebarProps {
  className?: string;
  mobileOpen?: boolean;
}

export default function Sidebar({ className, mobileOpen }: SidebarProps) {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Custom confirm modal hook
  const confirmModal = useConfirmModal();
  
  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
    refetchOnWindowFocus: true
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const confirmed = await confirmModal.showConfirm(
      'Hapus Percakapan',
      `Apakah Anda yakin ingin menghapus percakapan "${title}"? Tindakan ini tidak dapat dibatalkan.`
    );
    
    if (!confirmed) return;

    try {
      await deleteSession(sessionId);
      refetch();
      
      // Navigate to new chat if deleted current session
      if (location.pathname.includes(sessionId)) {
        navigate('/');
      }
    } catch (error) {
      console.error("Failed to delete session", error);
    }
  };

  return (
    <>
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
        onConfirm={confirmModal.handleConfirm}
        onCancel={confirmModal.handleCancel}
      />
      
      {/* Mobile Backdrop handled in App.tsx overlay */}
      
      <aside className={clsx("sidebar", isCollapsed && "collapsed", mobileOpen && "mobile-open", className)}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon">
          <img src="/logo.png" alt="Logo Cianjur" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div className="brand-text">
          <span className="brand-name">PANDAN WANGI</span>
          <span className="brand-tag">PEMKAB CIANJUR</span>
        </div>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="toggle-btn"
          style={{ 
            marginLeft: 'auto', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            color: 'var(--slate-400)',
            padding: '4px'
          }}
        >
          {isCollapsed ? <PanelRight size={18} /> : <PanelLeft size={18} />}
        </button>
      </div>

      {/* Main Navigation */}
      <div className="sidebar-nav">
        <div className="nav-section-title">Menu Utama</div>
        
        <NavLink 
          to="/"
          end
          className={({ isActive }: { isActive: boolean }) => clsx("nav-link", isActive && "active")}
        >
          {() => (
            <>
              <MessageSquarePlus size={18} className="nav-icon" />
              <span>Chat Baru</span>
            </>
          )}
        </NavLink>

        {isAdmin && (
          <>
            <NavLink 
              to="/rag"
              className={({ isActive }: { isActive: boolean }) => clsx("nav-link", isActive && "active")}
            >
              {() => (
                <>
                  <Database size={18} className="nav-icon" />
                  <span>Unggah Dokumen</span>
                </>
              )}
            </NavLink>
            <NavLink 
              to="/admin/documents"
              className={({ isActive }: { isActive: boolean }) => clsx("nav-link", isActive && "active")}
            >
              {() => (
                <>
                  <FileText size={18} className="nav-icon" />
                  <span>Manajemen Dokumen</span>
                </>
              )}
            </NavLink>
            <NavLink 
              to="/admin/analytics"
              className={({ isActive }: { isActive: boolean }) => clsx("nav-link", isActive && "active")}
            >
              {() => (
                <>
                  <BarChart3 size={18} className="nav-icon" />
                  <span>Laporan Penggunaan</span>
                </>
              )}
            </NavLink>
            <NavLink 
              to="/admin/pedoman"
              className={({ isActive }: { isActive: boolean }) => clsx("nav-link", isActive && "active")}
            >
              {() => (
                <>
                  <BookOpen size={18} className="nav-icon" />
                  <span>Pedoman Teknis</span>
                </>
              )}
            </NavLink>
          </>
        )}
      </div>

      {/* History Section */}
      <nav className="sidebar-history">
        <div className="nav-section-title">Riwayat Percakapan</div>
        
        {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px', marginTop: '8px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton" style={{ height: '28px', width: '100%', opacity: 0.6 }} />
                ))}
            </div>
        ) : sessions.map((session) => {
          // Format title: replace phone numbers with context or 'Chat WhatsApp'
          const formatTitle = (title: string) => {
            // Check if title looks like a phone number (only digits, or starts with WA:)
            const isPhoneNumber = /^(WA:\s*)?[\d]+$/.test(title.trim());
            if (isPhoneNumber) {
              return 'Chat WhatsApp';
            }
            // Remove WA: prefix if present
            return title.replace(/^WA:\s*/i, '');
          };
          const displayTitle = formatTitle(session.title);
          
          return (
          <div key={session.id} className="history-item-wrapper">
            <NavLink 
                to={`/chat/${session.id}`}
                className={({ isActive }: { isActive: boolean }) => clsx(
                    "history-item",
                    isActive && "active"
                )}
                title={displayTitle}
            >
                <HistoryIcon size={14} style={{ opacity: 0.5, flexShrink: 0 }}/>
                <span className="history-text">{displayTitle}</span>
            </NavLink>
            
            <button 
                onClick={(e) => handleDeleteSession(e, session.id, displayTitle)}
                className="history-delete-btn"
                title="Hapus Percakapan"
            >
                <Trash2 size={14} />
            </button>
          </div>
        )})}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        {isAdmin ? (
          <button onClick={handleLogout} className="nav-link" style={{ width: '100%', border: 'none', cursor: 'pointer' }}>
            <LogOut size={18} className="nav-icon" />
            <span>Keluar</span>
          </button>
        ) : (
          <NavLink to="/login" className="nav-link">
            <LogIn size={18} className="nav-icon" />
            <span>Login Admin</span>
          </NavLink>
        )}
      </div>
    </aside>
    </>
  );
}
