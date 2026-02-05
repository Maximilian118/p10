import React from "react"
import "./_modal.scss"

interface ModalProps {
  children: React.ReactNode
  onClose: () => void
}

// Full-screen modal overlay that wraps any modal content configuration.
const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      {children}
    </div>
  )
}

export default Modal
