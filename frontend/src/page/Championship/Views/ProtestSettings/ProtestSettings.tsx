import React from "react"
import "./_protestSettings.scss"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { ChampView } from "../ChampSettings/ChampSettings"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { ProtestsFormType, ProtestsFormErrType } from "../../../../shared/formValidation"
import MUISwitch from "../../../../components/utility/muiSwitch/MUISwitch"
import FormElContainer from "../../../../components/utility/formElContainer/FormElContainer"
import { Pagination } from "@mui/material"

interface ProtestSettingsProps {
  champ: ChampType
  user: userType
  setView: (view: ChampView) => void
  protestsForm: ProtestsFormType
  setProtestsForm: React.Dispatch<React.SetStateAction<ProtestsFormType>>
  protestsFormErr: ProtestsFormErrType
  setProtestsFormErr: React.Dispatch<React.SetStateAction<ProtestsFormErrType>>
  backendErr: graphQLErrorType
}

// Protest settings view for managing protest behavior.
const ProtestSettings: React.FC<ProtestSettingsProps> = ({ protestsForm, setProtestsForm, protestsFormErr, backendErr }) => {
  // Handle expiry pagination change with validation.
  const handleExpiryChange = (_e: React.ChangeEvent<unknown>, value: number) => {
    if (value < 1 || value > 30) return
    setProtestsForm(prev => ({ ...prev, expiry: value }))
  }

  return (
    <div className="protest-settings-view">
      <MUISwitch
        text="Always Vote"
        fullWidth
        checked={protestsForm.alwaysVote}
        onChange={(checked) => setProtestsForm(prev => ({ ...prev, alwaysVote: checked }))}
      />
      <MUISwitch
        text="Allow Multiple"
        fullWidth
        checked={protestsForm.allowMultiple}
        onChange={(checked) => setProtestsForm(prev => ({ ...prev, allowMultiple: checked }))}
      />
      <FormElContainer
        name="protestsExpiry"
        content={
          <Pagination
            count={30}
            page={protestsForm.expiry}
            className="mui-form-pagination"
            color="primary"
            onChange={handleExpiryChange}
            siblingCount={1}
            boundaryCount={1}
          />
        }
        formErr={protestsFormErr}
        backendErr={backendErr}
      />
    </div>
  )
}

export default ProtestSettings
