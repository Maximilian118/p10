import React from "react"
import './_rulesAndRegsToolbar.scss'
import { Button } from "@mui/material"
import { editStateType } from "../RulesAndRegsPicker"
import { ruleOrRegType, rulesAndRegsType } from "../../../../shared/types"
import { defaultRulesAndRegs, isDefaultRorR } from "../../../../shared/rulesAndRegs"
import { userType } from "../../../../shared/localStorage"
import AddButton from "../../button/addButton/AddButton"

interface rulesAndRegsToolbarType<T> {
  user: userType
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  setEdit: React.Dispatch<React.SetStateAction<editStateType>>
  style?: React.CSSProperties
}

const RulesAndRegsToolbar = <T extends { rulesAndRegs: rulesAndRegsType }>({
  user,
  form,
  setForm,
  setEdit,
  style
}: rulesAndRegsToolbarType<T>) => {
  const hasDefs = form.rulesAndRegs.some((rr: ruleOrRegType) => isDefaultRorR(user, rr))

  // Adds or removes default rules.
  const defaultsHandler = () => {
    setForm(prevForm => {
      return {
        ...prevForm,
        rulesAndRegs: hasDefs
          ? prevForm.rulesAndRegs.filter((rr: ruleOrRegType) => !isDefaultRorR(user, rr))
          : [...prevForm.rulesAndRegs, ...defaultRulesAndRegs(user)]
      }
    })
  }

  return (
    <div className="rules-and-regs-toolbar" style={style}>
      <Button 
        variant="contained" 
        size="small" 
        onClick={() => defaultsHandler()}
      >
        {`${hasDefs ? "Remove" : "Add"} Defaults`}
      </Button>
      <AddButton
        onClick={e => setEdit(prevEdit => {
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
