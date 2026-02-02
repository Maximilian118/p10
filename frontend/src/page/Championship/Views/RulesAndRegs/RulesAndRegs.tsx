import React, { useState, useEffect } from "react"
import "./_rulesAndRegs.scss"
import { ChampType, ruleOrRegType, rulesAndRegsType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import RulesAndRegsPicker from "../../../../components/utility/rulesAndRegsPicker/RulesAndRegsPicker"
import { NavigateFunction } from "react-router-dom"
import { addRule, updateRule, deleteRule } from "../../../../shared/requests/champRequests"
import { editStateType } from "../../../../components/utility/rulesAndRegsPicker/rulesAndRegsUtility"
import { RulesAndRegsEditHandlers } from "../../../../components/utility/rulesAndRegsPicker/rulesAndRegsEdit/RulesAndRegsEdit"

// Re-export the handlers type for Championship.tsx to use.
export type { RulesAndRegsEditHandlers }

interface RulesAndRegsProps {
  champ: ChampType
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  navigate: NavigateFunction
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  isAdjudicator: boolean
  isAdmin: boolean
  isEdit: editStateType
  setIsEdit: React.Dispatch<React.SetStateAction<editStateType>>
  onEditHandlersReady?: (handlers: RulesAndRegsEditHandlers | null) => void
}

// RulesAndRegs view component for championship rules display and editing.
const RulesAndRegs: React.FC<RulesAndRegsProps> = ({
  champ,
  setChamp,
  user,
  setUser,
  navigate,
  setBackendErr,
  isAdjudicator,
  isAdmin,
  isEdit,
  setIsEdit,
  onEditHandlersReady,
}) => {
  // Determine if user can edit.
  const canEdit = isAdjudicator || isAdmin

  // State to hold handlers from RulesAndRegsEdit.
  const [editHandlers, setEditHandlers] = useState<RulesAndRegsEditHandlers | null>(null)

  // Forward handlers to parent when they change.
  useEffect(() => {
    if (onEditHandlersReady) {
      onEditHandlersReady(editHandlers)
    }
  }, [editHandlers, onEditHandlersReady])

  // Handler to update champ state when rules are modified locally.
  const setRulesForm = (updater: React.SetStateAction<{ rulesAndRegs: rulesAndRegsType }>) => {
    if (typeof updater === "function") {
      setChamp((prev) => {
        if (!prev) return prev
        const newRulesForm = updater({ rulesAndRegs: prev.rulesAndRegs || [] })
        return { ...prev, rulesAndRegs: newRulesForm.rulesAndRegs }
      })
    } else {
      setChamp((prev) => (prev ? { ...prev, rulesAndRegs: updater.rulesAndRegs } : prev))
    }
  }

  // API handler for adding a new rule.
  const handleRuleAdd = async (ruleReg: ruleOrRegType) => {
    const subsections = ruleReg.subsections?.map(sub => ({ text: sub.text })) || []
    const result = await addRule(
      champ._id,
      ruleReg.text,
      subsections,
      user,
      setUser,
      navigate,
      setBackendErr,
    )
    if (result) {
      setChamp(prev => prev ? { ...prev, rulesAndRegs: result } : prev)
    }
  }

  // API handler for updating an existing rule.
  const handleRuleUpdate = async (ruleIndex: number, ruleReg: ruleOrRegType) => {
    const subsections = ruleReg.subsections?.map(sub => ({ text: sub.text })) || []
    const result = await updateRule(
      champ._id,
      ruleIndex,
      ruleReg.text,
      subsections,
      user,
      setUser,
      navigate,
      setBackendErr,
    )
    if (result) {
      setChamp(prev => prev ? { ...prev, rulesAndRegs: result } : prev)
    }
  }

  // API handler for deleting a rule.
  const handleRuleDelete = async (ruleIndex: number) => {
    const result = await deleteRule(
      champ._id,
      ruleIndex,
      user,
      setUser,
      navigate,
      setBackendErr,
    )
    if (result) {
      setChamp(prev => prev ? { ...prev, rulesAndRegs: result } : prev)
    }
  }

  return (
    <div className="rules-and-regs-view">
      <RulesAndRegsPicker
        user={user}
        form={{ rulesAndRegs: champ.rulesAndRegs || [] }}
        setForm={setRulesForm}
        readOnly={!canEdit}
        buttonBar={false}
        externalEdit={isEdit}
        onExternalEditChange={setIsEdit}
        onRuleAdd={handleRuleAdd}
        onRuleUpdate={handleRuleUpdate}
        onRuleDelete={handleRuleDelete}
        onHandlersReady={setEditHandlers}
      />
    </div>
  )
}

export default RulesAndRegs
