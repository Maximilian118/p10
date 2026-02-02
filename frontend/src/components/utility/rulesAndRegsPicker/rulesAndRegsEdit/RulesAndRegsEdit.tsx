import React, { useState, useEffect, useRef } from "react"
import './_rulesAndRegsEdit.scss'
import { editStateType} from "../RulesAndRegsPicker"
import { Button, TextField } from "@mui/material"
import { ruleOrRegType, ruleSubsectionType, rulesAndRegsType } from "../../../../shared/types"
import moment from "moment"
import { userType } from "../../../../shared/localStorage"
import RemoveButton from "../../button/removeButton/RemoveButton"
import { isDefaultRorR } from "../../../../shared/rulesAndRegs"
import { initEditState } from "../rulesAndRegsUtility"
import ButtonBar from "../../buttonBar/ButtonBar"
import { Rule } from "@mui/icons-material"
import { useChampFlowForm } from "../../../../context/ChampFlowContext"

interface rulesAndRegsFormErr {
  rulesAndRegs?: string
  [key: string]: string | undefined | number
}

// Handlers exposed to parent for ChampToolbar integration.
export interface RulesAndRegsEditHandlers {
  onSubmit: () => void
  onDelete: () => void
  delConfirm: boolean
  setDelConfirm: (val: boolean) => void
  loading: boolean
  deleteLoading: boolean
}

interface regsAndRulesEditType<T, U extends rulesAndRegsFormErr> {
  user: userType
  edit: editStateType
  setEdit: React.Dispatch<React.SetStateAction<editStateType>>
  setForm: React.Dispatch<React.SetStateAction<T>>
  setFormErr?: React.Dispatch<React.SetStateAction<U>>
  onRuleAdd?: (ruleReg: ruleOrRegType) => Promise<void>
  onRuleUpdate?: (ruleIndex: number, ruleReg: ruleOrRegType) => Promise<void>
  onRuleDelete?: (ruleIndex: number) => Promise<void>
  buttonBar?: boolean  // Shows internal ButtonBar (only for CreateChamp context)
  onHandlersReady?: (handlers: RulesAndRegsEditHandlers) => void  // Callback to expose handlers
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
  onRuleAdd,
  onRuleUpdate,
  onRuleDelete,
  buttonBar,
  onHandlersReady,
}: regsAndRulesEditType<T, U>) => {
  const [ delConfirm, SetDelConfirm ] = useState<boolean>(false)
  const [ ruleReg, setRuleReg ] = useState<ruleOrRegType>(initruleReg(user, edit.ruleReg))
  const [ error, setError ] = useState<errorType>(initError)
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ deleteLoading, setDeleteLoading ] = useState<boolean>(false)

  // Ref to always have access to the latest ruleReg value (avoids stale closure issues).
  const ruleRegRef = useRef(ruleReg)
  useEffect(() => {
    ruleRegRef.current = ruleReg
  }, [ruleReg])

  // Delete the entire ruleReg.
  const deleteRRHandler = async (setForm: React.Dispatch<React.SetStateAction<T>>): Promise<void> => {
    // If API handler is provided, use it for championship context.
    if (onRuleDelete && edit.index) {
      setDeleteLoading(true)
      await onRuleDelete(edit.index - 1)
      setDeleteLoading(false)
      setEdit(initEditState)
      return
    }

    // Otherwise update local form state (CreateChamp context).
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
  const updateRRHandler = async (
    setForm: React.Dispatch<React.SetStateAction<T>>,
    setEdit: React.Dispatch<React.SetStateAction<editStateType>>
  ): Promise<void> => {
    // Use ref to always get the latest ruleReg value (avoids stale closure issues).
    const currentRuleReg = ruleRegRef.current

    if (currentRuleReg.subsections) {
      let hasErr: boolean = false

      if (currentRuleReg.text.trim() === "") {
        setError({
          msg: "Please enter text.",
          index: null
        })

        return
      }

      currentRuleReg.subsections.forEach((r: ruleSubsectionType, i: number) => {
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
      ...currentRuleReg,
      default: isDefaultRorR(user, currentRuleReg),
    }

    // If API handlers are provided, use them for championship context.
    if (edit.index && onRuleUpdate) {
      setLoading(true)
      await onRuleUpdate(edit.index - 1, updatedRuleReg)
      setLoading(false)
      setEdit(initEditState)
      return
    } else if (edit.newRuleReg && onRuleAdd) {
      setLoading(true)
      await onRuleAdd(updatedRuleReg)
      setLoading(false)
      setEdit(initEditState)
      return
    }

    // Otherwise update local form state (CreateChamp context).
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

  // Store handlers in ref to avoid stale closures when parent calls them (same pattern as BadgePickerEdit).
  const handlersRef = useRef({
    submit: () => updateRRHandler(setForm, setEdit),
    delete: () => deleteRRHandler(setForm),
  })
  useEffect(() => {
    handlersRef.current = {
      submit: () => updateRRHandler(setForm, setEdit),
      delete: () => deleteRRHandler(setForm),
    }
  })

  // Register handlers with parent ButtonBar when in CreateChamp context.
  const { showButtonBar } = useChampFlowForm({
    submit: async () => { await handlersRef.current.submit() },
    back: () => setEdit(initEditState),
    isEditing: !edit.newRuleReg,
    loading,
    delLoading: deleteLoading,
    canDelete: !edit.newRuleReg,
    canRemove: false,
    canSubmit: true,
    onDelete: async () => { await handlersRef.current.delete() },
  }, buttonBar === true)

  // Expose stable wrapper functions to parent for ChampToolbar integration.
  useEffect(() => {
    if (onHandlersReady) {
      onHandlersReady({
        onSubmit: () => handlersRef.current.submit(),
        onDelete: () => handlersRef.current.delete(),
        delConfirm,
        setDelConfirm: SetDelConfirm,
        loading,
        deleteLoading,
      })
    }
  }, [onHandlersReady, delConfirm, loading, deleteLoading])

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
      <Button
        variant="contained"
        className="full-width-btn"
        onClick={() => newSubsection(user, setRuleReg)}
        startIcon={<Rule/>}
      >
        New Subsection
      </Button>
      {buttonBar && showButtonBar && (
        delConfirm ? (
          <ButtonBar>
            <div className="delete-confirm">
              <p>Are you sure?</p>
              <ButtonBar
                buttons={[
                  {
                    label: "Back",
                    onClick: () => SetDelConfirm(false),
                    disabled: deleteLoading,
                    color: "inherit",
                  },
                  {
                    label: deleteLoading ? "Deleting..." : "Delete",
                    onClick: () => deleteRRHandler(setForm),
                    disabled: deleteLoading,
                    color: "error",
                  },
                ]}
              />
            </div>
          </ButtonBar>
        ) : (
          <ButtonBar
            buttons={[
              {
                label: "Back",
                onClick: () => setEdit(initEditState),
                disabled: loading || deleteLoading,
                color: "inherit",
              },
              ...(edit.newRuleReg ? [] : [{
                label: "Delete",
                onClick: () => SetDelConfirm(true),
                disabled: loading || deleteLoading,
                color: "error" as const,
              }]),
              {
                label: loading ? "Saving..." : "Submit",
                onClick: () => updateRRHandler(setForm, setEdit),
                disabled: loading || deleteLoading,
              },
            ]}
          />
        )
      )}
    </div>
  )
}

export default RulesAndRegsEdit
