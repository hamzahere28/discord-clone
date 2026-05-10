export default function Modal({ title, children, onClose }) {
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-header">
            <h2>{title}</h2>
            <button onClick={onClose}>×</button>
          </div>
  
          {children}
        </div>
      </div>
    );
  }