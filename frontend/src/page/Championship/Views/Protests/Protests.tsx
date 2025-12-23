import React from "react"
import "./_protests.scss"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { ChampView } from "../ChampSettings/ChampSettings"
import { initGraphQLError } from "../../../../shared/requests/requestsUtility"
import { ProtestsFormType, ProtestsFormErrType } from "../../../../shared/formValidation"
import MUISwitch from "../../../../components/utility/muiSwitch/MUISwitch"
import FormElContainer from "../../../../components/utility/formElContainer/FormElContainer"
import { Pagination } from "@mui/material"

interface ProtestsProps {
  champ: ChampType
  user: userType
  setView: (view: ChampView) => void
  protestsForm: ProtestsFormType
  setProtestsForm: React.Dispatch<React.SetStateAction<ProtestsFormType>>
  protestsFormErr: ProtestsFormErrType
  setProtestsFormErr: React.Dispatch<React.SetStateAction<ProtestsFormErrType>>
}

// Protests settings view for managing protest behavior.
const Protests: React.FC<ProtestsProps> = ({ protestsForm, setProtestsForm, protestsFormErr }) => {
  // Handle expiry pagination change with validation.
  const handleExpiryChange = (_e: React.ChangeEvent<unknown>, value: number) => {
    if (value < 1 || value > 30) return
    setProtestsForm(prev => ({ ...prev, expiry: value }))
  }

  return (
    <div className="protests-view">
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
        backendErr={initGraphQLError}
      />
    </div>
  )
}

export default Protests
