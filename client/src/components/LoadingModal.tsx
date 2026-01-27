import { Loader2 } from 'lucide-react';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
  subMessage?: string;
}

export function LoadingModal({ 
  isOpen, 
  message = 'Memproses...', 
  subMessage 
}: LoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="loading-modal-overlay">
      <div className="loading-modal">
        <div className="loading-modal-spinner">
          <Loader2 size={40} className="animate-spin" />
        </div>
        <h3 className="loading-modal-title">{message}</h3>
        {subMessage && (
          <p className="loading-modal-subtitle">{subMessage}</p>
        )}
      </div>
    </div>
  );
}
