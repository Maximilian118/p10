import React, { useState, useEffect } from "react"
import './_pointsPicker.scss'
import { pointsStructureType } from "../../../shared/types"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import { ResponsivePie } from '@nivo/pie'
import {nivoColours, presetArrays, presetNames} from "./ppPresets"
import { MUISelect } from "../../utility/muiSelect/MUISelect"

// Base type for forms that have points structure.
interface PointsStructureForm {
  pointsStructure: pointsStructureType
}

interface pointsPickerFormErr {
  pointsStructure?: string
  [key: string]: string | undefined | number
}

interface pointsPickerType<T extends PointsStructureForm, U extends pointsPickerFormErr> {
  setForm: React.Dispatch<React.SetStateAction<T>>
  formErr: U
  setFormErr?: React.Dispatch<React.SetStateAction<U>>
  backendErr: graphQLErrorType
  disabled?: boolean
  initialPreset?: number
}

const PointsPicker= <T extends PointsStructureForm, U extends pointsPickerFormErr>({ setForm, formErr, setFormErr, backendErr, disabled, initialPreset }: pointsPickerType<T, U>) => {
  const [ preset, setPreset ] = useState(initialPreset ?? 1)

  // Sync preset state when initialPreset prop changes.
  useEffect(() => {
    if (initialPreset !== undefined) {
      setPreset(initialPreset)
    }
  }, [initialPreset])

  // Updates the form's points structure when a preset is selected.
  const handleSelectChange = (i: number) => {
    setForm(prevForm => {
      return {
        ...prevForm,
        pointsStructure: presetArrays(i).map(item => {
          return {
            position: item.result,
            points: item.value,
          }
        })
      }
    })

    // Clear any points structure validation error.
    if (setFormErr) {
      setFormErr(prev => ({ ...prev, pointsStructure: "" }))
    }
  }

  const error = formErr.pointsStructure || backendErr.type === "pointsStructure" ? true : false

  return (
    <div className="points-picker">
      <MUISelect
        label="Preset"
        items={presetNames}
        setState={setPreset}
        handleSelectChange={handleSelectChange}
        style={{ position: "absolute", zIndex: 1 }}
        error={error}
        disabled={disabled}
        initialValue={initialPreset}
      />
      <ResponsivePie
        data={presetArrays(preset)}
        margin={{ top: 25, left: 60, bottom: 25, right: 60 }}
        sortByValue={true}
        innerRadius={0.8}
        padAngle={1}
        cornerRadius={5}
        activeOuterRadiusOffset={8}
        colors={nivoColours(30, error)}
        borderWidth={1}
        borderColor={{
            from: 'color',
            modifiers: [
                [
                    'darker',
                    0.2
                ]
            ]
        }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{
            from: 'color',
            modifiers: [
                [
                    'darker',
                    2
                ]
            ]
        }}
        legends={[]}
      />  
    </div>
  )
}

export default PointsPicker
