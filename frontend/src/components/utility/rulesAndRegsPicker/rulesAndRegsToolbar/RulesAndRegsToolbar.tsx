import React from "react"
import './_rulesAndRegsToolbar.scss'
import { Button } from "@mui/material"
import { editStateType } from "../RulesAndRegsPicker"
import { ruleOrRegType, rulesAndRegsType } from "../../../../shared/types"
import { defaultRulesAndRegs, isDefaultRorR } from "../../../../shared/rulesAndRegs"
import { userType } from "../../../../shared/localStorage"
import AddButton from "../../button/addButton/AddButton"

interface rulesAndRegsFormErr {
  rulesAndRegs?: string
  [key: string]: string | undefined | number
}

interface rulesAndRegsToolbarType<T, U extends rulesAndRegsFormErr> {
  user: userType
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  setEdit: React.Dispatch<React.SetStateAction<editStateType>>
  setFormErr?: React.Dispatch<React.SetStateAction<U>>
}

const RulesAndRegsToolbar = <T extends { rulesAndRegs: rulesAndRegsType }, U extends rulesAndRegsFormErr>({
  user,
  form,
  setForm,
  setEdit,
  setFormErr,
}: rulesAndRegsToolbarType<T, U>) => {
  const hasDefs = form.rulesAndRegs.some((rr: ruleOrRegType) => isDefaultRorR(user, rr))

  // Adds or removes default rules.
  const defaultsHandler = () => {
    const isAdding = !hasDefs

    setForm(prevForm => {
      return {
        ...prevForm,
        rulesAndRegs: hasDefs
          ? prevForm.rulesAndRegs.filter((rr: ruleOrRegType) => !isDefaultRorR(user, rr))
          : [...prevForm.rulesAndRegs, ...defaultRulesAndRegs(user)]
      }
    })

    // Clear any rules validation error when adding defaults.
    if (isAdding && setFormErr) {
      setFormErr(prev => ({ ...prev, rulesAndRegs: "" }))
    }
  }

  return (
    <div className="rules-and-regs-toolbar">
      <Button 
        variant="contained" 
        size="small" 
        onClick={() => defaultsHandler()}
      >
        {`${hasDefs ? "Remove" : "Add"} Defaults`}
      </Button>
      <AddButton
        onClick={() => setEdit(prevEdit => {
          return {
            ...prevEdit,
            newRuleReg: true,
          }
        })}
      />
    </div>
  )
}

export default RulesAndRegsToolbar
