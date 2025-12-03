import React, { SyntheticEvent, useEffect, useRef, useState } from "react"
import './_champCard.scss'
import { champType } from "../../../shared/types"
import EditButton from "../../utility/button/editButton/EditButton"
import CounterIcon from "../../utility/icon/counterIcon/CounterIcon"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"

interface champCardType {
  champ: champType
  onClick?: (e: SyntheticEvent) => void
  selected?: boolean
  canEdit?: boolean
  onEditClicked?: (e: SyntheticEvent) => void
}

const ChampCard: React.FC<champCardType> = ({ champ, onClick, selected, canEdit, onEditClicked }) => {
  const [ lastIcon, setLastIcon ] = useState<number>(10) // Last Icon to be rendered before CounterIcon.
  const groupDriversRef = useRef<HTMLDivElement>(null) // Ref of the Icon list container.

  useEffect(() => {
    const dListWidth = groupDriversRef.current?.getBoundingClientRect().width

    if (dListWidth) {
      setLastIcon(Math.floor(dListWidth / 37) - 1) // -1 for 0 based indexing
    }
  }, [])

  return (
    <div className={`champ-card${selected ? "-selected" : ""}`} onClick={onClick}>
      <div className="main-icon-container">
        <ImageIcon src={champ.icon} size="contained"/>
        {canEdit && <EditButton
          inverted={selected}
          onClick={e => {
            e.stopPropagation()
            if (onEditClicked) {
              onEditClicked(e)
            }
          }}
        />}
      </div>
      <div className="champ-content">
        {selected && <p className="champ-selected">Selected</p>}
        <p className="champ-title">{champ.name}</p>
        <div ref={groupDriversRef} className="champ-drivers">
          {champ.standings.map((s, i) => {
            if (i < lastIcon ) {
              return <ImageIcon key={i} src={s.competitor.icon}/>
            } else if (i === lastIcon) {
              return (
                <CounterIcon 
                  key={i} 
                  inverted={selected} 
                  counter={champ.standings.length - lastIcon}
                />
              )
            } else {
              return null
            }
          })}
        </div>
      </div>
    </div>
  )
}

export default ChampCard
