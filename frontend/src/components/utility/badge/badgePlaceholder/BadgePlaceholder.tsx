import React from 'react'
import './_badgePlaceholder.scss'

interface BadgePlaceholderProps {
  position: number // 1-6 position for the featured badge slot
  isActive?: boolean // Highlight when drag target is over
  onDragOver?: (e: React.DragEvent) => void // Handler when drag enters
  onDragLeave?: (e: React.DragEvent) => void // Handler when drag leaves
  onDrop?: (e: React.DragEvent) => void // Handler for drop event
}

// Placeholder component for empty featured badge slots.
// Displays a circular target area with corner brackets and a plus icon.
// Supports drag-and-drop from badge items.
const BadgePlaceholder: React.FC<BadgePlaceholderProps> = ({
  position,
  isActive = false,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  return (
    <div
      className={`badge-placeholder ${isActive ? 'badge-placeholder--active' : ''}`}
      data-position={position}
      data-droppable="true"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Corner bracket elements */}
      <span className="badge-placeholder__corner badge-placeholder__corner--top-left" />
      <span className="badge-placeholder__corner badge-placeholder__corner--top-right" />
      <span className="badge-placeholder__corner badge-placeholder__corner--bottom-left" />
      <span className="badge-placeholder__corner badge-placeholder__corner--bottom-right" />

      {/* Plus icon in the center */}
      <span className="badge-placeholder__plus" />
    </div>
  )
}

export default BadgePlaceholder
