import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import RagPage from './pages/RagPage';
import DocumentsPage from './pages/DocumentsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/LoginPage';
import PedomanTeknisPage from './pages/PedomanTeknisPage';

const queryClient = new QueryClient();

// Protected Route wrapper for admin-only pages
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p>Memuat...</p>
      </div>
    );
  }
  
  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chat/:id" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route 
        path="/rag" 
        element={
          <ProtectedRoute>
            <RagPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/documents" 
        element={
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/analytics" 
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/pedoman" 
        element={
          <ProtectedRoute>
            <PedomanTeknisPage />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { useState, createContext, useContext } from 'react';

// Context for Mobile Sidebar
interface LayoutContextType {
  isMobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType>({
  isMobileSidebarOpen: false,
  toggleMobileSidebar: () => {},
  closeMobileSidebar: () => {},
});

export const useLayout = () => useContext(LayoutContext);

function AppLayout() {
  const { isAdmin } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  return (
    <LayoutContext.Provider value={{ isMobileSidebarOpen, toggleMobileSidebar, closeMobileSidebar }}>
      <div className="app-container">
        <Sidebar 
          className="hidden md-flex" 
          isAdmin={isAdmin} 
          mobileOpen={isMobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
        />
        <div 
          className={`sidebar-overlay ${isMobileSidebarOpen ? 'mobile-open' : ''}`} 
          onClick={closeMobileSidebar}
        />
        <main className="main-content">
          <AppRoutes />
        </main>
      </div>
    </LayoutContext.Provider>
  );
}

import { ToastProvider } from './context/ToastContext';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
           <BrowserRouter>
             <AppLayout />
           </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
