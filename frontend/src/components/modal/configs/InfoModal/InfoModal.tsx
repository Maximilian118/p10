import React from "react"
import Modal from "../../Modal"
import "./_info-modal.scss"

interface InfoModalProps {
  title: string
  description: string[]
  onClose: () => void
}

// Contextual help modal that explains a concept when the user taps an info icon.
const InfoModal: React.FC<InfoModalProps> = ({ title, description, onClose }) => {
  return (
    <Modal onClose={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="info-modal__title">{title}</h2>
        {description.map((paragraph, i) => (
          <p key={i} className="info-modal__description">{paragraph}</p>
        ))}
      </div>
      <p className="info-modal__close-hint">Click anywhere to close</p>
    </Modal>
  )
}

export default InfoModal
