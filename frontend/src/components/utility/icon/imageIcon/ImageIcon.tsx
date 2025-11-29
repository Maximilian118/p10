import React, { useState } from "react"
import '../_icon.scss'
import './_imageIcon.scss'

interface iconType {
  src: string
  id?: string
  size?: "small" | "medium" | "large" | "contained"
  style?: React.CSSProperties
}

const ImageIcon: React.FC<iconType> = ({ src, id, size, style }) => {
  const [ error, setError ] = useState<boolean>(false)

  const iconContent = (error: boolean, src: string) => {
    if (!error) {
      return <img alt="Icon" onError={() => setError(true)} src={src}/>
    } else {
      return (
        <div className="image-error">
          <p>{`err`}</p>
        </div>
      )
    }
  }

  return (
    <div id={id} className={`icon-${size ? size : "medium"} image-icon`} style={style}>
      {iconContent(error, src)}
    </div>
  )
}

export default ImageIcon
