import React, { useState } from "react"
import './_rulesAndRegsEdit.scss'
import { editStateType, initEditState } from "../RulesAndRegsPicker"
import { Button, TextField } from "@mui/material"
import { ruleOrRegType, ruleSubsectionType, rulesAndRegsType } from "../../../../shared/types"
import moment from "moment"
import { userType } from "../../../../shared/localStorage"
import RemoveButton from "../../button/removeButton/RemoveButton"
import { isDefaultRorR } from "../../../../shared/rulesAndRegs"

interface rulesAndRegsFormErr {
  rulesAndRegs?: string
  [key: string]: string | undefined | number
}

interface regsAndRulesEditType<T, U extends rulesAndRegsFormErr> {
  user: userType
  edit: editStateType
  setEdit: React.Dispatch<React.SetStateAction<editStateType>>
  setForm: React.Dispatch<React.SetStateAction<T>>
  setFormErr?: React.Dispatch<React.SetStateAction<U>>
}

// Initializes a new rule or regulation with default values.
const initruleReg = (user: userType, ruleReg?: ruleOrRegType | null): ruleOrRegType => {
  return {
    default: ruleReg?.default ?? false,
    text: ruleReg ? ruleReg.text : "",
    created_by: user,
    pendingChanges: [],
    history: [],
    subsections: ruleReg ? ruleReg.subsections : [],
    created_at: ruleReg ? ruleReg.created_at : moment().format(),
  }
}

// Initializes a new subsection with default values.
const initSubsection = (user: userType): ruleSubsectionType => {
  return {
    text: "",
    pendingChanges: [],
    history: [],
    created_by: user,
    created_at: moment().format(),
  }
}

type errorType = {
  msg: string,
  index: number | null
}

const initError = {
  msg: "",
  index: null
}

const RulesAndRegsEdit = <T extends { rulesAndRegs: rulesAndRegsType }, U extends rulesAndRegsFormErr>({
  user,
  edit,
  setEdit,
  setForm,
  setFormErr,
}: regsAndRulesEditType<T, U>) => {
  const [ delConfirm, SetDelConfirm ] = useState<boolean>(false)
  const [ ruleReg, setRuleReg ] = useState<ruleOrRegType>(initruleReg(user, edit.ruleReg))
  const [ error, setError ] = useState<errorType>(initError)

  // Delete the entire ruleReg.
  const deleteRRHandler = (setForm: React.Dispatch<React.SetStateAction<T>>): void => {
    setForm((prevForm: T) => {
      return {
        ...prevForm,
        rulesAndRegs: prevForm.rulesAndRegs.filter((_item: ruleOrRegType, i: number) => i + 1 !== edit.index)
      }
    })

    setEdit(initEditState)
  }

  // Delete a single subsection.
  const deleteSubsection = (setRuleReg: React.Dispatch<React.SetStateAction<ruleOrRegType>>, index: number) => {
    setRuleReg(prevRuleReg => {
      if (prevRuleReg.subsections) {
        return {
          ...prevRuleReg,
          subsections: prevRuleReg.subsections.filter((_item: ruleSubsectionType, i: number) => i !== index)
        }
      } else {
        return prevRuleReg
      }
    })
  }

  // Adds a new subsection.
  const newSubsection = (user: userType, setRuleReg: React.Dispatch<React.SetStateAction<ruleOrRegType>>) => {
    setRuleReg(prevRuleReg => {
      if (prevRuleReg.subsections) {
        const withNew = [...prevRuleReg.subsections]
        withNew.push(initSubsection(user))

        return {
          ...prevRuleReg,
          subsections: withNew
        }
      } else {
        return prevRuleReg
      }
    })

    // Fix for weird issue where when we setRuleReg above with a new empty subsection, form gets updated as well.
    setForm(prevForm => {
      return {
        ...prevForm,
        rulesAndRegs: prevForm.rulesAndRegs.map((item: ruleOrRegType, i: number) => {
          if (item.subsections && edit.index && edit.index - 1 === i) {
            return {
              ...item,
              subsections: item.subsections.filter((r: ruleSubsectionType) => r.text.trim() !== "")
            }
          } else {
            return item
          }
        })
      }
    })
  }

  // Update form with the ruleReg.
  const updateRRHandler = (
    setForm: React.Dispatch<React.SetStateAction<T>>,
    setEdit: React.Dispatch<React.SetStateAction<editStateType>>
  ): void => {
    if (ruleReg.subsections) {
      let hasErr: boolean = false

      if (ruleReg.text.trim() === "") {
        setError({
          msg: "Please enter text.",
          index: null
        })

        return
      }

      ruleReg.subsections.forEach((r: ruleSubsectionType, i: number) => {
        if (r.text.trim() === "") {
          setError({
            msg: "Please enter text.",
            index: i
          })
          hasErr = true
        }
      })

      if (hasErr) {
        return
      }
    }

    // Re-evaluate the default flag based on whether the rule still matches a predefined default.
    const updatedRuleReg = {
      ...ruleReg,
      default: isDefaultRorR(user, ruleReg),
    }

    if (edit.index) {
      setForm(prevForm => {
        return {
          ...prevForm,
          rulesAndRegs: prevForm.rulesAndRegs.map((item: ruleOrRegType, i: number) => {
            if (edit.index === i + 1) {
              return updatedRuleReg
            } else {
              return item
            }
          })
        }
      })
    } else {
      setForm(prevForm => {
        return {
          ...prevForm,
          rulesAndRegs: [...prevForm.rulesAndRegs, updatedRuleReg]
        }
      })
    }

    // Clear any rules validation error.
    if (setFormErr) {
      setFormErr(prev => ({ ...prev, rulesAndRegs: "" }))
    }

    setEdit(initEditState)
  }

  // JSX for the delete confirm button.
  const deleteConfirmButton = (): JSX.Element => (
    <div className="delete-confirm">
        <p>Are you sure?</p>
        <div className="delete-confirm-buttons">
          <Button
            className="mui-button-back"
            style={{ margin: "0 10px" }}
            variant="contained" 
            color="inherit"
            onClick={() => SetDelConfirm(false)}
          >Back</Button>
          <Button
            variant="contained" 
            color="error"
            onClick={() => deleteRRHandler(setForm)}
          >Delete</Button>
        </div>
    </div>
  )

  // JSX for a section.
  const section = (ruleReg: ruleOrRegType, index?: number): JSX.Element => {
    const isSub = typeof index === "number"
    const hasErr = (): boolean => {
      if (!isSub && error.msg && !error.index && ruleReg.text.trim() === "") {
        return true
      }

      if (index === error.index) {
        return true
      }

      return false
    }

    const label = (isSub: boolean, error: errorType, i?: number): string => {
      let ident = ""

      if (isSub) {
        ident = `Subsection ${i! + 1}`
      } else {
        ident = "Section"
      }

      return `${ident}${hasErr() ? `: ${error.msg}` : ""}`
    }

    return (
      <div key={index} className="rule-or-reg-edit">
        <TextField
          className="mui-multiline"
          label={label(isSub, error, index)}
          multiline
          rows={3}
          onChange={e => setRuleReg((prevRuleReg: ruleOrRegType) => {
            if (isSub && prevRuleReg.subsections) {
              return {
                ...prevRuleReg,
                subsections: prevRuleReg.subsections.map((sub, i) => {
                  if (index === i) {
                    if (error.index === index) {
                      setError(initError)
                    }

                    return {
                      ...sub,
                      text: e.target.value,
                    }
                  } else {
                    return sub
                  }
                })
              }
            }

            return {
              ...prevRuleReg,
              text: e.target.value,
            }
          })}
          value={isSub ? ruleReg.subsections![index].text : ruleReg.text}
          variant="filled"
          error={hasErr() ? true : false}
        />
        {isSub && <RemoveButton onClick={() => deleteSubsection(setRuleReg, index)}/>}
      </div>
    )
  }

  return (
    <div className="rules-and-regs-edit">
      <div className="rules-and-regs-title">
        <h4>{`${edit.newRuleReg ? `New` : `Edit`} Rule or Regulation`}</h4>
      </div>
      {section(ruleReg)}
      {ruleReg.subsections?.map((_rr: ruleSubsectionType, i: number) => section(ruleReg, i))}
      <div className="button-bar sub-btns">
        <Button
          className="sub-add-button"
          variant="contained"
          onClick={() => newSubsection(user, setRuleReg)}
        >New Subsection</Button>
      </div>
      <div className="button-bar">
        {delConfirm ? deleteConfirmButton() : 
        <>
          <Button
            className="mui-button-back"
            variant="contained" 
            color="inherit"
            onClick={() => setEdit(initEditState)}
          >Back</Button>
          {!edit.newRuleReg && <Button
            variant="contained" 
            color="error"
            onClick={() => SetDelConfirm(true)}
          >Delete</Button>}
          <Button
            variant="contained"
            onClick={() => updateRRHandler(setForm, setEdit)}
          >Submit</Button>
        </>}
      </div>
    </div>
  )
}

export default RulesAndRegsEdit
