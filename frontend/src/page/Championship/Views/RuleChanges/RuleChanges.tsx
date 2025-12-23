import React from "react"
import "./_ruleChanges.scss"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { ChampView } from "../ChampSettings/ChampSettings"
import { initGraphQLError } from "../../../../shared/requests/requestsUtility"
import { RuleChangesFormType, RuleChangesFormErrType } from "../../../../shared/formValidation"
import MUISwitch from "../../../../components/utility/muiSwitch/MUISwitch"
import FormElContainer from "../../../../components/utility/formElContainer/FormElContainer"
import { Pagination } from "@mui/material"

interface RuleChangesProps {
  champ: ChampType
  user: userType
  setView: (view: ChampView) => void
  ruleChangesForm: RuleChangesFormType
  setRuleChangesForm: React.Dispatch<React.SetStateAction<RuleChangesFormType>>
  ruleChangesFormErr: RuleChangesFormErrType
  setRuleChangesFormErr: React.Dispatch<React.SetStateAction<RuleChangesFormErrType>>
}

// Rule changes settings view for managing rule change proposal behavior.
const RuleChanges: React.FC<RuleChangesProps> = ({ ruleChangesForm, setRuleChangesForm, ruleChangesFormErr }) => {
  // Handle expiry pagination change with validation.
  const handleExpiryChange = (_e: React.ChangeEvent<unknown>, value: number) => {
    if (value < 1 || value > 30) return
    setRuleChangesForm(prev => ({ ...prev, expiry: value }))
  }

  return (
    <div className="rule-changes-view">
      <MUISwitch
        text="Always Vote"
        fullWidth
        checked={ruleChangesForm.alwaysVote}
        onChange={(checked) => setRuleChangesForm(prev => ({ ...prev, alwaysVote: checked }))}
      />
      <MUISwitch
        text="Allow Multiple"
        fullWidth
        checked={ruleChangesForm.allowMultiple}
        onChange={(checked) => setRuleChangesForm(prev => ({ ...prev, allowMultiple: checked }))}
      />
      <FormElContainer
        name="ruleChangesExpiry"
        content={
          <Pagination
            count={30}
            page={ruleChangesForm.expiry}
            className="mui-form-pagination"
            color="primary"
            onChange={handleExpiryChange}
            siblingCount={1}
            boundaryCount={1}
          />
        }
        formErr={ruleChangesFormErr}
        backendErr={initGraphQLError}
      />
    </div>
  )
}

export default RuleChanges
