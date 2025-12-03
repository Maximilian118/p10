import React from "react"
import { useParams } from "react-router-dom"
import './_championship.scss'

// Displays the detail page for a specific championship.
const Championship: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="content-container">
      <p>Championship ID: {id}</p>
    </div>
  )
}

export default Championship
