import React from 'react'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'

interface MUISelectStyle {
  label: string
  items: string[]
  setState: React.Dispatch<React.SetStateAction<number>>
  handleSelectChange?: (i: number) => void
  filled?: boolean
  style?: {}
  error?: boolean
}

export const MUISelect: React.FC<MUISelectStyle> = ({ label, items, setState, handleSelectChange, filled, style, error }) => {
  const [ item, setItem ] = React.useState('1')

  const handleChange = (e: SelectChangeEvent) => {
    setItem(e.target.value as string)
    setState(Number(e.target.value))
    handleSelectChange && handleSelectChange(Number(e.target.value))
  }

  return (
    <FormControl variant='standard' style={{ ...style, minWidth: 110 }} error={error}>
      <Select
        labelId="demo-simple-select-label"
        id="demo-simple-select"
        variant={filled ? "filled" : "standard"}
        value={item}
        label={label}
        onChange={handleChange}
        error={error}
      >
        {items.map((item, i) => <MenuItem key={i} value={i}>{item}</MenuItem>)}
      </Select>
    </FormControl>
  )
}