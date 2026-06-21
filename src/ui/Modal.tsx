import { useRef, type ReactNode } from 'react'

// Modal shell. Closes only when the press *starts and ends* on the backdrop — so selecting text in a
// field and releasing the mouse outside the dialog (over the overlay) doesn't dismiss it.
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const startedOnOverlay = useRef(false)
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        startedOnOverlay.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && startedOnOverlay.current) onClose()
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
