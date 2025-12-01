import { Button } from "@mui/material"
import React, { useEffect, useRef } from "react"
import './_updatePPCard.scss'

const UpdatePPCard: React.FC = () => {
  const dropzoneRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    dropzoneRef.current = document.getElementsByClassName("dropzone")[0] as HTMLElement
  }, [])

  return (
    <div className="update-pp-card">
      <Button
        variant="contained"
        onClick={() => dropzoneRef.current && dropzoneRef.current.click()}
      >Change Profile Picture</Button>
    </div>
  )
}

export default UpdatePPCard