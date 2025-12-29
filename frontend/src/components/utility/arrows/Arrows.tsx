import React from "react"
import "./_arrows.scss"
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft"
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight"

interface ArrowsProps {
  direction?: "left" | "right"
}

// Double arrow indicator with staggered positioning.
const Arrows: React.FC<ArrowsProps> = ({ direction = "right" }) => {
  const Icon = direction === "left" ? KeyboardArrowLeftIcon : KeyboardArrowRightIcon

  return (
    <div className={`arrows arrows--${direction}`}>
      <Icon className="arrow-1" />
      <Icon className="arrow-2" />
    </div>
  )
}

export default Arrows
