import React, { useEffect } from "react"
import './_champBasicsCard.scss'
import DropZone from "../../utility/dropZone/DropZone"
import MUITextField from "../../utility/muiTextField/MUITextField"
import FormElContainer from "../../utility/formElContainer/FormElContainer"
import { Pagination } from "@mui/material"
import PointsPicker from "../../utility/pointsPicker/PointsPicker"
import { inputLabel, updateForm } from "../../../shared/formValidation"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import { createChampFormErrType, createChampFormType } from "../../../page/CreateChamp/CreateChamp"

interface champBaiscsCard<T, U> {
  form: T,
  setForm: React.Dispatch<React.SetStateAction<T>>
  formErr: U
  setFormErr: React.Dispatch<React.SetStateAction<U>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
}

const ChampBasicsCard = <T extends createChampFormType, U extends createChampFormErrType>({
  form,
  setForm,
  formErr,
  setFormErr,
  backendErr,
  setBackendErr,
}: champBaiscsCard<T, U>) => {
  // Whether the selected series locks the round count.
  const seriesLocksRounds = !!form.series?.rounds

  // Sync rounds to the series' round count when the series defines one.
  useEffect(() => {
    if (form.series?.rounds) {
      setForm(prev => ({ ...prev, rounds: form.series!.rounds! }))
    }
  }, [form.series, setForm])

  const paginationHandler = (e: React.ChangeEvent<unknown>, value: number) => {
    setForm(prevForm => {
      return {
        ...prevForm,
        rounds: value
      }
    })
  }

  return (
    <div className="champ-basics-card">
      <DropZone<T, U> 
        form={form}
        setForm={setForm} 
        formErr={formErr}
        setFormErr={setFormErr} 
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="Championship Icon"
      />
      <MUITextField
        inputProps={{ maxLength: 50 }}
        className="mui-form-el"
        name="champName"
        label={inputLabel("champName", formErr, backendErr)}
        value={form.champName}
        onBlur={e => updateForm<T, U>(e, form, setForm, setFormErr, backendErr, setBackendErr)}
        error={formErr.champName || backendErr.type === "champName" ? true : false}
      />
      <FormElContainer
        name="rounds"
        label={seriesLocksRounds ? "Number of rounds for the selected series" : undefined}
        disabled={seriesLocksRounds}
        content={
          <Pagination
            count={99}
            page={form.rounds as number}
            className="mui-form-pagination"
            color="primary"
            onChange={paginationHandler}
            disabled={seriesLocksRounds}
          />
        }
        formErr={formErr}
        backendErr={backendErr}
      />
      <FormElContainer
        name="pointsStructure"
        content={
          <PointsPicker
            setForm={setForm}
            formErr={formErr}
            setFormErr={setFormErr}
            backendErr={backendErr}
          />
        }
        formErr={formErr}
        backendErr={backendErr}
      />
    </div>
  )
}

export default ChampBasicsCard
