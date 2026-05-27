import { useEffect } from 'react';
import './Popup.css';

const CheckIcon = () => (
  <svg className="popup-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12l3 3 5-5" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="popup-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const Popup = ({ message, onClose, duration, type = 'success' }) => {
  const defaultDuration = type === 'error' ? 8000 : 3000;
  const resolvedDuration = duration ?? defaultDuration;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, resolvedDuration);
    return () => clearTimeout(timer);
  }, [onClose, resolvedDuration]);

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className={`popup-content ${type}`} onClick={(e) => e.stopPropagation()}>
        <div className="popup-body">
          {type === 'error' ? <ErrorIcon /> : <CheckIcon />}
          <p className="popup-message">{message}</p>
        </div>
        <button className="popup-close" onClick={onClose} aria-label="Fechar">×</button>
      </div>
    </div>
  );
};

export default Popup;