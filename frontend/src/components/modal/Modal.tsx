import React from "react"
import ReactDOM from "react-dom"
import "./_modal.scss"

interface ModalProps {
  children: React.ReactNode
  onClose: () => void
}

// Full-screen modal overlay that wraps any modal content configuration.
// Uses a portal to render at document.body, escaping any parent stacking contexts.
const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      {children}
    </div>,
    document.body
  )
}

export default Modal
