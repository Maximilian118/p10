import React from "react"
import './_imageError.scss'

interface ImageErrorProps {
  content?: string
}

// Error display component - renders when image cannot be displayed.
const ImageError: React.FC<ImageErrorProps> = ({ content = "err" }) => {
  return (
    <div className="image-error">
      <p>{content}</p>
    </div>
  )
}

export default ImageError
