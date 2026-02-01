import React, { MouseEvent } from "react"
import './_badgeFilterDraw.scss'
import { Button, ClickAwayListener } from "@mui/material"
import { badgeType } from "../../../../shared/types"
import { badgeRarities, badgeRarityType } from "../../../../shared/badgeOutcomes"
import MUICheckbox from "../../muiCheckbox/MUICheckbox"

interface badgeFilterDrawType<T> {
  draw: boolean
  setDraw: React.Dispatch<React.SetStateAction<boolean>>
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  defaults: badgeType[]
  filtered: number[]
  setFiltered: React.Dispatch<React.SetStateAction<number[]>>
  defaultsButton?: boolean
}

const BadgeFilterDraw = <T extends { champBadges: badgeType[] }>({
  draw,
  setDraw,
  form,
  setForm,
  defaults,
  filtered,
  setFiltered,
  defaultsButton,
}: badgeFilterDrawType<T>) => {
  const hasDefbadges = (form: T) => form.champBadges.some(a => defaults.map(b => b._id).includes(a._id))

  const removeDefaultsHandler = (champBadges: badgeType[], setForm: React.Dispatch<React.SetStateAction<T>> ) => {
    setForm(prevForm => {
      return {
        ...prevForm,
        champBadges: champBadges.filter((badge: badgeType) => !badge.default)
      }
    })
  }

  // Add defaults, skipping any that conflict with existing badges by _id or awardedHow.
  const addDefaultsHandler = (defaults: badgeType[], setForm: React.Dispatch<React.SetStateAction<T>> ) => {
    setForm(prevForm => {
      return {
        ...prevForm,
        champBadges: [
          ...prevForm.champBadges,
          ...defaults.filter((badge: badgeType) =>
            !prevForm.champBadges.some(prevBadge =>
              prevBadge._id === badge._id || prevBadge.awardedHow === badge.awardedHow
            )
          )
        ]
      }
    })
  }

  const filterBadgesHandler = (e: MouseEvent, rarity: badgeRarityType) => {
    setFiltered((prevFiltered) => {
      const rareIndex = prevFiltered.indexOf(rarity.rarity)
      if (rareIndex !== -1) {
        // Remove the rarity index if it's already in the filtered array
        return prevFiltered.filter((_, index) => index !== rareIndex)
      } else {
        // Add the rarity index if it's not in the filtered array
        return [...prevFiltered, rarity.rarity]
      }
    })
  }

  const onDefaultClickHandler = (
    champBadges: badgeType[],
    defaults: badgeType[], 
    setForm: React.Dispatch<React.SetStateAction<T>>, 
    hasDefbadges: boolean,
  ): void => {
    if (!hasDefbadges) {
      return addDefaultsHandler(defaults, setForm)
    } else {
      return removeDefaultsHandler(champBadges, setForm)
    }
  }

  const handleClickAway = () => {
    if (draw) {
      setDraw(false)
    }
  }

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <div className={`badge-filter-draw ${draw ? "badge-draw-open" : ""}`}>
          <div className="badge-filter-options">
            {badgeRarities().map((rarity: badgeRarityType, i: number) => (
              <MUICheckbox
                key={i}
                text={rarity.rarityName}
                checked={filtered.includes(rarity.rarity)}
                onClick={(e: MouseEvent) => filterBadgesHandler(e, rarity)}
                checkedColour={rarity.colour}
              />
            ))}
          </div>
          {defaultsButton && (
            <div className="badge-filter-buttons">
              <Button
                variant="contained"
                size="small"
                onClick={() => onDefaultClickHandler(form.champBadges, defaults, setForm, hasDefbadges(form))}
              >{`${!hasDefbadges(form) ? "Add" : "Remove"} defaults`}</Button>
            </div>
          )}
      </div>
    </ClickAwayListener>
  )
}

export default BadgeFilterDraw
