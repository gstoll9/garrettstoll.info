import ReactDOM from 'react-dom';

type InfoPopupProps = {
  name: string;
  onClose: () => void;
};

export default function InfoPopup({ name, onClose }: InfoPopupProps) {
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '8px',
        zIndex: 1000,
      }}
    >
      <strong>{name}</strong>
      <p>Click again to dismiss</p>
      <button onClick={onClose}>Close</button>
    </div>,
    document.body // Render the popup in the <body> element
  );
}
