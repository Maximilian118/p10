import React, { useState } from 'react'
import { TextField } from '@mui/material'

interface MUITextFieldType{
  name: string
  label: string
  value: string
  error: boolean // non-optional just because I want to force us to ensure we handle errors on the element.
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  inputProps?: {}
  className?: string
}
// Mainly exists for perfomance purposes. E.G if each keystroke is a little big laggy on a normal TextField.
// TextField updates itself with a local state instead of in form.
// If the form is heavy and the page is lacking performance on keystrokes, onBlur can be used to apply state to the form when user selects something else.
// onChange is preseved for original UX if the form is light and we can afford to update state per keystroke.
const MUITextField: React.FC<MUITextFieldType> = ({ name, label, value, error, onBlur, onChange, required, inputProps, className }) => {
  const [ localValue, setLocalValue ] = useState(value)

  const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)

    if (onChange) {
      onChange(e)
    }
  }

  return (
    <TextField
      name={name}
      label={label}
      value={localValue}
      onChange={onChangeHandler}
      onBlur={onBlur}
      error={error}
      required={required}
      inputProps={inputProps}
      className={className}
      variant="filled"
    />
  )
}

export default MUITextField