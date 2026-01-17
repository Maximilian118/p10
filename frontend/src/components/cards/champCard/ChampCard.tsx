import React, { SyntheticEvent } from "react"
import { useNavigate } from "react-router-dom"
import './_champCard.scss'
import { ChampType } from "../../../shared/types"
import { userType } from "../../../shared/localStorage"
import EditButton from "../../utility/button/editButton/EditButton"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import IconList from "../../utility/iconList/IconList"

interface champCardType {
  champ: ChampType
  onClick?: (e: SyntheticEvent) => void
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
}

const ChampCard: React.FC<champCardType> = ({ champ, onClick, canEdit, onEditClicked }) => {
  const navigate = useNavigate()

  // Championship-level competitors for the icon list.
  const competitors = champ.competitors

  // Navigate to competitor profile.
  const handleCompetitorClick = (competitor: userType) => {
    navigate(`/profile/${competitor._id}`)
  }

  return (
    <div className="champ-card" onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={champ.icon} size="contained"/>
        {canEdit && <EditButton
          onClick={e => {
            e.stopPropagation()
            if (onEditClicked) {
              onEditClicked(e)
            }
          }}
        />}
      </div>
      <div className="champ-content">
        <p className="champ-title">{champ.name}</p>
        <IconList items={competitors} onItemClick={handleCompetitorClick} />
      </div>
    </div>
  )
}

export default ChampCard
