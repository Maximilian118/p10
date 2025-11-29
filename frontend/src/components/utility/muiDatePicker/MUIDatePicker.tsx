import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment"
import { Moment } from "moment"
import React from "react"

interface MUIDatePickerType {
  label: string
  value: Moment | null
  error: boolean
  onChange: (newValue: Moment | null) => void
  disabled?: boolean
  className?: string
}

const MUIDatePicker: React.FC<MUIDatePickerType> = ({ label, value, error, onChange, disabled, className }) => {
  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <DatePicker
        label={label}
        disabled={disabled}
        className={className}
        slotProps={{ textField: { 
          error: error,
          variant: "filled",
        }}}
        value={value}
        format="DD/MM/YYYY"
        onChange={onChange}
      />
    </LocalizationProvider>
  )
}

export default MUIDatePicker
