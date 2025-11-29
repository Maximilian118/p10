import React, { useState } from "react"
import './_pointsPicker.scss'
import { createChampFormErrType, createChampFormType } from "../../../page/CreateChamp"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import { ResponsivePie } from '@nivo/pie'
import {nivoColours, presetArrays, presetNames} from "./ppPresets"
import { MUISelect } from "../../utility/muiSelect/MUISelect"

interface pointsPickerType<T> {
  setForm: React.Dispatch<React.SetStateAction<T>>
  formErr: createChampFormErrType
  backendErr: graphQLErrorType
}

const PointsPicker= <T extends createChampFormType>({ setForm, formErr, backendErr }: pointsPickerType<T>) => {
  const [ preset, setPreset ] = useState(1)

  const handleSelectChange = (i: number) => {
    setForm(prevForm => {
      return {
        ...prevForm,
        pointsStructure: presetArrays(i).map(item => {
          return {
            result: item.result,
            points: item.value,
          }
        })
      }
    })
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
