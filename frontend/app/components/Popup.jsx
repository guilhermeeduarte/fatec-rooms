import { useEffect } from 'react';
import './Popup.css';

const Popup = ({ message, onClose, duration = 3000, type = 'success' }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [onClose, duration]);

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className={`popup-content ${type}`} onClick={(e) => e.stopPropagation()}>
                <p>{message}</p>
                <button className="popup-close" onClick={onClose}>×</button>
            </div>
        </div>
    );
};

export default Popup;