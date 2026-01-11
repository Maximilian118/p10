import React from "react"
import "./_automation.scss"
import { ChampType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { ChampView } from "../ChampSettings/ChampSettings"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import MUISwitch from "../../../../components/utility/muiSwitch/MUISwitch"
import FormElContainer from "../../../../components/utility/formElContainer/FormElContainer"
import { Pagination } from "@mui/material"

// Form type for automation settings.
export interface AutomationFormType {
  enabled: boolean
  autoOpen: boolean
  autoOpenTime: number
  autoClose: boolean
  autoCloseTime: number
  autoNextRound: boolean
  autoNextRoundTime: number
}

// Form error type for automation settings.
export interface AutomationFormErrType {
  autoOpenTime: string
  autoCloseTime: string
  autoNextRoundTime: string
  [key: string]: string
}

interface AutomationProps {
  champ: ChampType
  user: userType
  setView: (view: ChampView) => void
  automationForm: AutomationFormType
  setAutomationForm: React.Dispatch<React.SetStateAction<AutomationFormType>>
  automationFormErr: AutomationFormErrType
  setAutomationFormErr: React.Dispatch<React.SetStateAction<AutomationFormErrType>>
  backendErr: graphQLErrorType
}

// Automation view for F1 championship automation features.
const Automation: React.FC<AutomationProps> = ({ automationForm, setAutomationForm, automationFormErr, backendErr }) => {
  // Handle auto open time pagination change with validation.
  const handleAutoOpenTimeChange = (_e: React.ChangeEvent<unknown>, value: number) => {
    if (value < 1 || value > 30) return
    setAutomationForm(prev => ({ ...prev, autoOpenTime: value }))
  }

  // Handle auto close time pagination change with validation.
  const handleAutoCloseTimeChange = (_e: React.ChangeEvent<unknown>, value: number) => {
    if (value < 1 || value > 10) return
    setAutomationForm(prev => ({ ...prev, autoCloseTime: value }))
  }

  // Handle auto next round time pagination change with validation.
  const handleAutoNextRoundTimeChange = (_e: React.ChangeEvent<unknown>, value: number) => {
    if (value < 1 || value > 99) return
    setAutomationForm(prev => ({ ...prev, autoNextRoundTime: value }))
  }

  return (
    <div className="automation-view">
      <MUISwitch
        text="Automation Active"
        fullWidth
        borderBottom
        checked={automationForm.enabled}
        onChange={(checked) => setAutomationForm(prev => ({ ...prev, enabled: checked }))}
      />
      <MUISwitch
        text="Betting Window Auto Open"
        fullWidth
        checked={automationForm.autoOpen}
        onChange={(checked) => setAutomationForm(prev => ({ ...prev, autoOpen: checked }))}
        disabled={!automationForm.enabled}
      />
      <FormElContainer
        name="autoOpenTime"
        content={
          <Pagination
            count={30}
            page={automationForm.autoOpenTime}
            className="mui-form-pagination"
            color="primary"
            onChange={handleAutoOpenTimeChange}
            siblingCount={1}
            boundaryCount={1}
            disabled={!automationForm.enabled}
          />
        }
        formErr={automationFormErr}
        backendErr={backendErr}
      />
      <MUISwitch
        text="Betting Window Auto Close"
        fullWidth
        checked={automationForm.autoClose}
        onChange={(checked) => setAutomationForm(prev => ({ ...prev, autoClose: checked }))}
        disabled={!automationForm.enabled}
      />
      <FormElContainer
        name="autoCloseTime"
        content={
          <Pagination
            count={10}
            page={automationForm.autoCloseTime}
            className="mui-form-pagination"
            color="primary"
            onChange={handleAutoCloseTimeChange}
            siblingCount={1}
            boundaryCount={1}
            disabled={!automationForm.enabled}
          />
        }
        formErr={automationFormErr}
        backendErr={backendErr}
      />
      <div className="extended-divider" />
      <MUISwitch
        text="Auto Next Round"
        fullWidth
        checked={automationForm.autoNextRound}
        onChange={(checked) => setAutomationForm(prev => ({ ...prev, autoNextRound: checked }))}
        disabled={!automationForm.enabled}
      />
      <FormElContainer
        name="autoNextRoundTime"
        content={
          <Pagination
            count={99}
            page={automationForm.autoNextRoundTime}
            className="mui-form-pagination"
            color="primary"
            onChange={handleAutoNextRoundTimeChange}
            siblingCount={1}
            boundaryCount={1}
            disabled={!automationForm.enabled}
          />
        }
        formErr={automationFormErr}
        backendErr={backendErr}
      />
    </div>
  )
}

export default Automation
