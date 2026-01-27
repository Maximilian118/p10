import React from "react"
import './_banner.scss'

interface BannerProps {
  text: string
  colour?: "default" | "error" | "success" | "highlight"
  className?: string
  fontSize?: number
}

const Banner: React.FC<BannerProps> = ({ text, colour, className, fontSize }) => {
  return (
    <span className={`
      banner banner--${colour}
      ${className ? ` ${className}` : ""}
    `} style={{ fontSize: fontSize }}>
      {text}
    </span>
  )
}

export default Banner
