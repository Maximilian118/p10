import React from "react"
import './_champToolbar.scss'
import { Button } from "@mui/material"
import { FilterList } from "@mui/icons-material"

interface champToolbarType {
  style?: React.CSSProperties
}

// Toolbar with action buttons for the championship page.
const ChampToolbar: React.FC<champToolbarType> = ({ style }) => (
  <div className="champ-toolbar" style={style}>
    <Button
      variant="contained"
      size="small"
      onClick={e => {
        e.stopPropagation()
      }}
      endIcon={<FilterList />}
    >
      Actions
    </Button>
  </div>
)

export default ChampToolbar
