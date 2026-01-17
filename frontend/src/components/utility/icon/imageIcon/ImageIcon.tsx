import React, { SyntheticEvent, useState } from "react"
import '../_icon.scss'
import './_imageIcon.scss'
import ImageError from "../utility/imageError/ImageError"
import { shouldShowImageError } from "../utility/iconUtility"

interface iconType {
  src: string
  id?: string
  size?: "small" | "medium" | "large" | "x-large" | "contained"
  style?: React.CSSProperties
  onClick?: (e: SyntheticEvent) => void
  background?: boolean
}

const ImageIcon: React.FC<iconType> = ({ src, id, size, style, onClick, background }) => {
  const [ error, setError ] = useState<boolean>(false)

  // Renders image or error fallback if src is missing/invalid.
  const iconContent = (error: boolean, src: string) => {
    if (shouldShowImageError(src, error)) {
      return <ImageError />
    }
    return <img alt="Icon" onError={() => setError(true)} src={src}/>
  }

  // Enable pointer events and cursor when onClick is provided.
  const clickableStyle = onClick ? { pointerEvents: 'auto' as const, cursor: 'pointer' } : {}

  // Build class name with optional background.
  const className = `icon-${size ? size : "medium"} image-icon${background ? " image-icon-background" : ""}`

  return (
    <div id={id} className={className} style={{...style, ...clickableStyle}} onClick={onClick}>
      {iconContent(error, src)}
    </div>
  )
}

export default ImageIcon
