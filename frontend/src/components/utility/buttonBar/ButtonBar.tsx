import React from "react"
import { Button, CircularProgress } from "@mui/material"
import "./_buttonBar.scss"

interface ButtonBarProps {
  onBack?: () => void
  onDelete?: () => void
  onSubmit?: () => void
  showDelete?: boolean
  backDisabled?: boolean
  submitDisabled?: boolean
  submitLabel?: string
  loading?: boolean
  delLoading?: boolean
  backLabel?: string
}

// Button bar for form pages (back, delete, submit buttons).
// Used in create/edit pages like CreateChamp, CreateSeries, etc.
const ButtonBar: React.FC<ButtonBarProps> = ({
  onBack,
  onDelete,
  onSubmit,
  showDelete = false,
  backDisabled = false,
  submitDisabled = false,
  submitLabel = "Submit",
  loading = false,
  delLoading = false,
  backLabel = "Back",
}) => {
  return (
    <div className="button-bar">
      {onBack && (
        <Button
          variant="contained"
          color="inherit"
          disabled={backDisabled}
          onClick={onBack}
        >
          {backLabel}
        </Button>
      )}
      {showDelete && onDelete && (
        <Button
          variant="contained"
          color="error"
          onClick={onDelete}
          startIcon={delLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
        >
          Delete
        </Button>
      )}
      {onSubmit && (
        <Button
          variant="contained"
          disabled={submitDisabled}
          onClick={onSubmit}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
        >
          {submitLabel}
        </Button>
      )}
    </div>
  )
}

export default ButtonBar
