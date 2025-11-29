import { Slider, Stack } from "@mui/material"
import React from "react"
import './mui-slider.scss'

interface MUISliderType {
  ariaLabel: string
  value: number
  setValue: React.Dispatch<React.SetStateAction<number>>
  label?: string
  valueLabelDisplay?: "auto" | "on" | "off"
  steps?: number
  iconLeft?: JSX.Element
  iconRight?: JSX.Element
  min?: number
  max?: number
  colour?: string
  style?: {}
}

const MUISlider: React.FC<MUISliderType> = ({ 
  ariaLabel, 
  value, 
  setValue, 
  label, 
  valueLabelDisplay,
  steps,
  iconLeft, 
  iconRight,
  min,
  max,
  colour,
  style 
}): JSX.Element => {
  const handleChange = (event: Event, newValue: number | number[]) => {
    setValue(newValue as number)
  }

  const slider = (iconLeft?: JSX.Element, iconRight?: JSX.Element): JSX.Element => {
    if (iconLeft || iconRight) {
      return (
        <Stack spacing={2} direction="row" alignItems="center">
          {iconLeft}
          <Slider 
            aria-label={ariaLabel} 
            value={value} 
            onChange={handleChange} 
            valueLabelDisplay={valueLabelDisplay ? valueLabelDisplay : "off"}
            marks={steps ? true : false}
            step={steps}
            min={min}
            max={max}
            sx={ colour ? {
              '& .MuiSlider-thumb': {
                  color: colour
              },
              '& .MuiSlider-track': {
                  color: colour
              },
              '& .MuiSlider-rail': {
                  color: colour
              },
              '& .MuiSlider-active': {
                  color: colour
              }
            } : {}} 
          />
          {iconRight}
        </Stack>
      )
    } else {
      return (
        <Slider 
          aria-label={ariaLabel} 
          value={value} 
          onChange={handleChange} 
          valueLabelDisplay={valueLabelDisplay ? valueLabelDisplay : "off"}
          marks={steps ? true : false}
          step={steps}
          min={min}
          max={max}
          sx={ colour ? {
            '& .MuiSlider-thumb': {
                color: colour
            },
            '& .MuiSlider-track': {
                color: colour
            },
            '& .MuiSlider-rail': {
                color: colour
            },
            '& .MuiSlider-active': {
                color: colour
            }
          } : {}} 
        />
      )
    }
  }

  return (
    <div className="mui-slider" style={style}>
      {label && <p>{label}</p>}
      {slider(iconLeft, iconRight)}
    </div>
  )
}

export default MUISlider
