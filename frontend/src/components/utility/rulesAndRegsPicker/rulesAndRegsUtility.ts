import { ruleOrRegType } from "../../../shared/types"

// Edit state for rules and regulations picker.
export interface editStateType {
  newRuleReg: boolean
  index: number | null
  ruleReg: ruleOrRegType | null
}

// Initial edit state - no rule selected, not creating new.
export const initEditState: editStateType = {
  newRuleReg: false,
  index: null,
  ruleReg: null,
}
