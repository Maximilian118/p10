import React from "react"
import './_badgePickerToolbar.scss'
import { Button } from "@mui/material"
import { FilterList } from "@mui/icons-material"
import { badgeType } from "../../../../shared/types"
import AddButton from "../../button/addButton/AddButton"

interface badgePickerToolbarType {
  setIsEdit: React.Dispatch<React.SetStateAction<boolean | badgeType>>
  draw: boolean
  setDraw: React.Dispatch<React.SetStateAction<boolean>>
  style?: React.CSSProperties
}

const BadgePickerToolbar: React.FC<badgePickerToolbarType> = ({ setIsEdit, draw, setDraw, style }) => (
  <div className="badge-picker-toolbar" style={style}>
    <Button 
      variant="contained" 
      size="small" 
      onClick={e => {
        e.stopPropagation()
        setDraw(!draw)
      }}
      endIcon={<FilterList/>}>
      Filter
    </Button>
    <AddButton onClick={e => setIsEdit(true)}/>
  </div>
)

export default BadgePickerToolbar
