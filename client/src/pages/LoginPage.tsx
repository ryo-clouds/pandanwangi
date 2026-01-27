import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import '../styles.css';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { showToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(password);
      showToast('Login Berhasil!', 'success');
      navigate('/rag'); // Go to upload page after login
    } catch (err) {
      setError('Password salah. Silakan coba lagi.');
      showToast('Password salah!', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
            <div className="login-icon-box">
                <Lock className="text-white w-8 h-8" />
            </div>
            <h1 className="login-title">Admin Login</h1>
            <p className="login-subtitle">Masuk untuk mengelola dokumen</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
            {error && (
                <div className="login-error">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            <div className="form-group">
                <label className="form-label">Password Admin</label>
                <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="Masukkan password admin..."
                    autoFocus
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="login-button"
            >
                {loading ? 'Memverifikasi...' : 'Masuk Dashboard'}
            </button>

            <div className="mt-6 text-center">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="back-link"
                >
                    <ArrowLeft size={16} />
                    Kembali ke Chat
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
