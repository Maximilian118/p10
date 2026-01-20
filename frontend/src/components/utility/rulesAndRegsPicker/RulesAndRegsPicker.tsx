import React, { useState } from "react"
import './_rulesAndRegsPicker.scss'
import { Button } from "@mui/material"
import RuleOrReg from "./ruleOrReg/RuleOrReg"
import { defaultRulesAndRegs, isDefaultRorR } from "../../../shared/rulesAndRegs"
import { userType } from "../../../shared/localStorage"
import { ruleOrRegType, rulesAndRegsType } from "../../../shared/types"
import RulesAndRegsEdit from "./rulesAndRegsEdit/RulesAndRegsEdit"
import ButtonBar from "../buttonBar/ButtonBar"
import AddButton from "../button/addButton/AddButton"
import { initEditState } from "./rulesAndRegsUtility"

interface rulesAndRegsFormErr {
  rulesAndRegs?: string
  [key: string]: string | undefined | number
}

interface rulesAndRegsPickerType<T, U extends rulesAndRegsFormErr> {
  user: userType
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  formErr?: U
  setFormErr?: React.Dispatch<React.SetStateAction<U>>
}

export interface editStateType {
  newRuleReg: boolean
  index: number | null
  ruleReg: ruleOrRegType | null
}

const RulesAndRegsPicker = <T extends { rulesAndRegs: rulesAndRegsType }, U extends rulesAndRegsFormErr>({
  user,
  form,
  setForm,
  setFormErr,
}: rulesAndRegsPickerType<T, U>) => {
  const [ edit, setEdit ] = useState<editStateType>(initEditState)

  const isEdit = edit.newRuleReg || edit.ruleReg
  const hasDefs = form.rulesAndRegs.some((rr: ruleOrRegType) => isDefaultRorR(user, rr))

  // Adds or removes default rules.
  const defaultsHandler = () => {
    const isAdding = !hasDefs
    setForm(prevForm => ({
      ...prevForm,
      rulesAndRegs: hasDefs
        ? prevForm.rulesAndRegs.filter((rr: ruleOrRegType) => !isDefaultRorR(user, rr))
        : [...prevForm.rulesAndRegs, ...defaultRulesAndRegs(user)]
    }))
    // Clear any rules validation error when adding defaults.
    if (isAdding && setFormErr) {
      setFormErr(prev => ({ ...prev, rulesAndRegs: "" }))
    }
  }

  return isEdit ?
    <RulesAndRegsEdit<T, U>
      user={user}
      edit={edit}
      setEdit={setEdit}
      setForm={setForm}
      setFormErr={setFormErr}
    /> : (
    <div className="rules-and-regs-picker">
      {form.rulesAndRegs.length > 0 ?
        <div className="rules-and-regs-list">
          {form.rulesAndRegs.map((item: ruleOrRegType, i: number) =>
            <RuleOrReg
              key={i}
              index={i + 1}
              item={item}
              setEdit={setEdit}
              isDefault={isDefaultRorR(user, item)}
            />
          )}
        </div> :
        <div className="rules-and-regs-empty">
          <p>You need some Rules and Regulations. This is simply illegal!</p>
        </div>
      }
      <ButtonBar position="sticky">
        <div className="button-group">
          <Button variant="contained" size="small" onClick={defaultsHandler}>
            {`${hasDefs ? "Remove" : "Add"} Defaults`}
          </Button>
          <AddButton onClick={() => setEdit(prev => ({ ...prev, newRuleReg: true }))} />
        </div>
      </ButtonBar>
    </div>
  )
}

export default RulesAndRegsPicker
