import React, { SyntheticEvent, useState } from "react"
import '../_icon.scss'
import './_imageIcon.scss'
import ImageError from "../utility/imageError/ImageError"
import { shouldShowImageError } from "../utility/iconUtility"

interface iconType {
  src: string
  id?: string
  size?: "small" | "medium" | "medium-large" | "large" | "x-large" | "xx-large" | "contained"
  imageSize?: number
  style?: React.CSSProperties
  onClick?: (e: SyntheticEvent) => void
  background?: boolean | string
  offsetHeight?: number
  offsetWidth?: number
  fallBack?: {
    text: number | string
    textColor: string
    backgroundColor: string
  }
}

const ImageIcon: React.FC<iconType> = ({ src, id, size, imageSize = 100, style, onClick, background, offsetHeight, offsetWidth, fallBack }) => {
  const [ error, setError ] = useState<boolean>(false)

  // Renders image, colored number fallback, or error state.
  const iconContent = (error: boolean, src: string) => {
    // Render colored number fallback when no valid image and fallback provided.
    if (shouldShowImageError(src, error) && fallBack) {
      return (
        <div className="image-icon-fallback" style={{ backgroundColor: fallBack.backgroundColor, color: fallBack.textColor }}>
          <span>{fallBack.text}</span>
        </div>
      )
    }
    if (shouldShowImageError(src, error)) {
      return <ImageError />
    }
    // Apply vertical offset to reposition the image (positive = up, negative = down).
    const offHeight = offsetHeight ? { bottom: `${offsetHeight}px` } : {}
    const offWidth = offsetWidth ? { left: `${offsetWidth}px` } : {}
    return <img alt="Icon" onError={() => setError(true)} src={src} style={{...offHeight, ...offWidth, width: `${imageSize}%`, height: `${imageSize}%`}}/>
  }

  // Enable pointer events and cursor when onClick is provided.
  const clickableStyle = onClick ? { pointerEvents: 'auto' as const, cursor: 'pointer' } : {}

  // Build class name with optional background (true = white via CSS class).
  const className = `icon-${size ? size : "medium"} image-icon${background === true ? " image-icon-background" : ""}`

  // Apply custom background color when a string is provided.
  const backgroundStyle = typeof background === 'string' ? { background } : {}

  return (
    <div id={id} className={className} style={{...style, ...clickableStyle, ...backgroundStyle}} onClick={onClick}>
      {iconContent(error, src)}
    </div>
  )
}

export default ImageIcon
