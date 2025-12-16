import React, { SyntheticEvent, useEffect, useRef, useState } from "react"
import './_iconList.scss'
import CounterIcon from "../icon/counterIcon/CounterIcon"
import ImageIcon from "../icon/imageIcon/ImageIcon"

// Base type constraint - items must have _id and icon.
interface IconItem {
  _id?: string
  icon: string
}

interface IconListProps<T extends IconItem> {
  items: T[]
  onItemClick?: (item: T) => void
  counterInverted?: boolean
  centered?: boolean
}

// Displays a row of icons with overflow counter.
// Automatically calculates how many icons fit based on container width.
function IconList<T extends IconItem>({ items, onItemClick, counterInverted, centered }: IconListProps<T>) {
  const [lastIcon, setLastIcon] = useState<number>(10)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate how many icons can fit in the container.
  useEffect(() => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width

    if (containerWidth) {
      setLastIcon(Math.floor(containerWidth / 37) - 1)
    }
  }, [])

  const className = `icon-list${centered ? ' centered' : ''}`

  return (
    <div ref={containerRef} className={className}>
      {items.map((item: T, i: number) => {
        if (i < lastIcon) {
          return (
            <ImageIcon
              key={item._id || i}
              src={item.icon}
              onClick={onItemClick ? (e: SyntheticEvent) => {
                e.stopPropagation()
                onItemClick(item)
              } : undefined}
            />
          )
        } else if (i === lastIcon) {
          return (
            <CounterIcon
              key={item._id || i}
              inverted={counterInverted}
              counter={items.length - lastIcon}
            />
          )
        } else {
          return null
        }
      })}
    </div>
  )
}

export default IconList
