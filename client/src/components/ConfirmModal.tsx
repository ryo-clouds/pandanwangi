import { useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'var(--rose-500)',
      iconBg: 'var(--rose-50)',
      button: 'confirm-btn-danger',
    },
    warning: {
      icon: 'var(--amber-500)',
      iconBg: 'var(--amber-50)',
      button: 'confirm-btn-warning',
    },
    info: {
      icon: 'var(--brand-500)',
      iconBg: 'var(--brand-50)',
      button: 'confirm-btn-info',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="confirm-modal-close" onClick={onCancel}>
          <X size={18} />
        </button>
        
        <div className="confirm-modal-icon" style={{ backgroundColor: styles.iconBg }}>
          <AlertTriangle size={24} style={{ color: styles.icon }} />
        </div>
        
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        
        <div className="confirm-modal-actions">
          <button className="confirm-btn confirm-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`confirm-btn ${styles.button}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for easy usage
interface UseConfirmModalReturn {
  isOpen: boolean;
  title: string;
  message: string;
  showConfirm: (title: string, message: string) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export function useConfirmModal(): UseConfirmModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showConfirm = useCallback((title: string, message: string): Promise<boolean> => {
    setTitle(title);
    setMessage(message);
    setIsOpen(true);
    
    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolvePromise?.(true);
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolvePromise?.(false);
  }, [resolvePromise]);

  return { isOpen, title, message, showConfirm, handleConfirm, handleCancel };
}
