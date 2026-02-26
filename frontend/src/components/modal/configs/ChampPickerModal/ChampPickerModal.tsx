import React, { useState } from "react"
import Modal from "../../Modal"
import "./_champPickerModal.scss"
import ImageIcon from "../../../utility/icon/imageIcon/ImageIcon"
import { CircularProgress } from "@mui/material"
import { ChampType } from "../../../../shared/types"

// Enriched championship with eligibility info for the picker.
export interface PickerChamp {
  champ: ChampType
  eligible: boolean
  reason?: string
}

interface ChampPickerModalProps {
  championships: PickerChamp[]
  onSelect: (champ: ChampType) => void
  onClose: () => void
  loading?: boolean
}

// Modal for selecting a championship from a list (e.g. when joining a league with multiple eligible champs).
const ChampPickerModal: React.FC<ChampPickerModalProps> = ({
  championships,
  onSelect,
  onClose,
  loading,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Handle championship selection — only allowed for eligible champs.
  const handleSelect = (pc: PickerChamp) => {
    if (!pc.eligible) return
    setSelectedId(pc.champ._id)
    onSelect(pc.champ)
  }

  return (
    <Modal onClose={onClose}>
      <div className="champ-picker-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="champ-picker-modal__title">Select Championship</h2>
        <p className="champ-picker-modal__subtitle">Choose which championship to enroll in this league.</p>
        <div className="champ-picker-modal__list">
          {championships.map((pc) => (
            <div
              key={pc.champ._id}
              className={`champ-picker-modal__item${!pc.eligible ? " champ-picker-modal__item--ineligible" : ""}${selectedId === pc.champ._id ? " champ-picker-modal__item--selected" : ""}`}
              onClick={() => !loading && handleSelect(pc)}
            >
              {/* Row 1: icon and name. */}
              <div className="champ-picker-modal__item-row">
                <ImageIcon src={pc.champ.icon} size="medium-large" />
                <span className="champ-picker-modal__item-name">{pc.champ.name}</span>
                {loading && selectedId === pc.champ._id && <CircularProgress size={24} />}
              </div>
              {/* Row 2: eligibility chip. */}
              <div className={`champ-picker-modal__item-chip${pc.eligible ? " champ-picker-modal__item-chip--eligible" : " champ-picker-modal__item-chip--ineligible"}`}>
                {pc.eligible ? "Eligible" : `Ineligible: ${pc.reason}`}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="champ-picker-modal__close-hint">Click anywhere to close</p>
    </Modal>
  )
}

export default ChampPickerModal
