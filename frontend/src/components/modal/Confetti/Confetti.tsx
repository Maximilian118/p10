import React, { useMemo } from "react"
import { getBadgeColour } from "../../utility/badge/badgeOverlay/badgeOverlayUtility"
import "./_confetti.scss"

interface ConfettiProps {
  count?: number
  rarity?: number
}

interface ConfettiPiece {
  id: number
  left: number
  delay: number
  color: string
  size: number
  rotation: number
  isCircle: boolean
}

// Default multi-color palette used when no rarity is specified.
const DEFAULT_COLORS = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"]

// Converts a hex color string to HSL values.
const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l: l * 100 }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return { h: h * 360, s: s * 100, l: l * 100 }
}

// Converts HSL values back to a hex color string.
const hslToHex = (h: number, s: number, l: number): string => {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100

  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, "0")
  }

  return `#${f(0)}${f(8)}${f(4)}`
}

// Generates a palette of 6 color variations around a base rarity color.
const generateRarityPalette = (rarity: number): string[] => {
  const baseHex = getBadgeColour(rarity)
  const { h, s, l } = hexToHSL(baseHex)

  return [
    hslToHex(h, s, l + 15),
    hslToHex(h + 5, s, l + 8),
    hslToHex(h - 5, s, l - 10),
    hslToHex(h, s, l - 20),
    hslToHex(h + 12, s, l + 5),
    hslToHex(h - 10, s, l - 5),
  ]
}

// Generates an array of randomized confetti pieces.
const generateConfetti = (count: number, colors: string[]): ConfettiPiece[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 8 + Math.random() * 8,
    rotation: Math.random() * 360,
    isCircle: Math.random() > 0.5,
  }))
}

// Reusable confetti animation with optional rarity-based color palette.
const Confetti: React.FC<ConfettiProps> = ({ count = 50, rarity }) => {
  // Select color palette based on rarity prop.
  const colors = useMemo(() => {
    if (rarity !== undefined) {
      return generateRarityPalette(rarity)
    }
    return DEFAULT_COLORS
  }, [rarity])

  // Generate confetti pieces (stable for the lifetime of the component).
  const pieces = useMemo(() => generateConfetti(count, colors), [count, colors])

  return (
    <div className="confetti">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti__piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            backgroundColor: piece.color,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            borderRadius: piece.isCircle ? "50%" : "0",
            transform: `rotate(${piece.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}

export default Confetti
