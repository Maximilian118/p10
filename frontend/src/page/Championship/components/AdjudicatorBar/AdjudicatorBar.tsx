import React from "react"
import './_adjudicatorBar.scss'
import { Visibility } from "@mui/icons-material"

const AdjudicatorBar: React.FC = () => {
  return (
    <div className="adjudicator-bar">
      <Visibility/>
      <h5>Adjudicator View</h5>
    </div>
  )
}

export default AdjudicatorBar
