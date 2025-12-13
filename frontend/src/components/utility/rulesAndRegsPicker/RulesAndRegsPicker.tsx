import React, { useState } from "react"
import './_rulesAndRegsPicker.scss'
import RuleOrReg from "./ruleOrReg/RuleOrReg"
import { isDefaultRorR } from "../../../shared/rulesAndRegs"
import { userType } from "../../../shared/localStorage"
import { ruleOrRegType, rulesAndRegsType } from "../../../shared/types"
import RulesAndRegsEdit from "./rulesAndRegsEdit/RulesAndRegsEdit"
import RulesAndRegsToolbar from "./rulesAndRegsToolbar/RulesAndRegsToolbar"

interface rulesAndRegsPickerType<T> {
  user: userType
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
}

export interface editStateType {
  newRuleReg: boolean
  index: number | null
  ruleReg: ruleOrRegType | null
}

export const initEditState = {
  newRuleReg: false,
  index: null,
  ruleReg: null,
}

const RulesAndRegsPicker = <T extends { rulesAndRegs: rulesAndRegsType }>({
  user,
  form,
  setForm,
}: rulesAndRegsPickerType<T>) => {
  const [ edit, setEdit ] = useState<editStateType>(initEditState)

  const isEdit = edit.newRuleReg || edit.ruleReg

  return isEdit ?
    <RulesAndRegsEdit<T>
      user={user}
      edit={edit}
      setEdit={setEdit}
      setForm={setForm}
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
      <RulesAndRegsToolbar
        user={user}
        form={form}
        setForm={setForm}
        setEdit={setEdit}
      />
    </div>
  )
}

export default RulesAndRegsPicker
