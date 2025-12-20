import React from "react"
import "./_champSettings.scss"
import { ChampType, pointsStructureType } from "../../../../shared/types"
import { userType } from "../../../../shared/localStorage"
import { initGraphQLError } from "../../../../shared/requests/requestsUtility"
import { getCompetitors } from "../../../../shared/utility"
import { Button, Pagination } from "@mui/material"
import DeleteForeverIcon from "@mui/icons-material/DeleteForever"
import ImageIcon from "@mui/icons-material/Image"
import MUITextField from "../../../../components/utility/muiTextField/MUITextField"
import FormElContainer from "../../../../components/utility/formElContainer/FormElContainer"
import PointsPicker from "../../../../components/utility/pointsPicker/PointsPicker"
import { inputLabel, updateSettingsForm } from "../../../../shared/formValidation"
import { identifyPresetFromStructure } from "../../../../components/utility/pointsPicker/ppPresets"

// View type for the Championship page.
export type ChampView = "competitors" | "settings" | "deleteChamp"

// Form type for championship settings.
export interface ChampSettingsFormType {
  champName: string
  rounds: number
  maxCompetitors: number
  pointsStructure: pointsStructureType
  icon: File | string | null
  profile_picture: File | string | null
}

// Form error type for championship settings.
export interface ChampSettingsFormErrType {
  champName: string
  rounds: string
  maxCompetitors: string
  pointsStructure: string
  dropzone: string
  [key: string]: string
}

interface ChampSettingsProps {
  champ: ChampType
  user: userType
  setView: (view: ChampView) => void
  settingsForm: ChampSettingsFormType
  setSettingsForm: React.Dispatch<React.SetStateAction<ChampSettingsFormType>>
  settingsFormErr: ChampSettingsFormErrType
  setSettingsFormErr: React.Dispatch<React.SetStateAction<ChampSettingsFormErrType>>
  dropzoneOpenRef: React.MutableRefObject<(() => void) | null>
}

// Championship settings component - card-based layout.
const ChampSettings: React.FC<ChampSettingsProps> = ({
  champ,
  user,
  setView,
  settingsForm,
  setSettingsForm,
  settingsFormErr,
  setSettingsFormErr,
  dropzoneOpenRef,
}) => {
  // Check if user has permission to delete (admin or adjudicator).
  const isAdmin = user.permissions?.admin === true
  const isAdjudicator = champ.adjudicator?.current?._id === user._id
  const canDelete = isAdmin || isAdjudicator

  // Calculate round constraints for mid-season editing.
  const nonWaitingRounds = champ.rounds.filter(r => r.status !== "waiting").length
  const minRounds = nonWaitingRounds + 1

  // Check if all rounds are "waiting" (season hasn't started).
  const allRoundsWaiting = champ.rounds.every(r => r.status === "waiting")

  // Identify current preset from champ's points structure.
  const currentPreset = identifyPresetFromStructure(champ.pointsStructure)

  // Handle round pagination change with validation.
  const handleRoundsChange = (_e: React.ChangeEvent<unknown>, value: number) => {
    if (value < minRounds) return
    if (value > 30) return
    setSettingsForm(prev => ({ ...prev, rounds: value }))
  }

  // Handle max competitors pagination change with validation.
  const handleMaxCompetitorsChange = (_e: React.ChangeEvent<unknown>, value: number) => {
    // Can't set below current competitor count.
    const currentCompetitors = getCompetitors(champ).length
    if (value < currentCompetitors) return
    if (value > 99) return
    setSettingsForm(prev => ({ ...prev, maxCompetitors: value }))
  }

  return (
    <div className="champ-settings-card">
      <MUITextField
        inputProps={{ maxLength: 50 }}
        className="mui-form-el"
        name="champName"
        label={inputLabel("champName", settingsFormErr, initGraphQLError)}
        value={settingsForm.champName}
        onBlur={e => updateSettingsForm(e, settingsForm, setSettingsForm, setSettingsFormErr)}
        error={!!settingsFormErr.champName}
      />
      <FormElContainer
        name="rounds"
        content={
          <Pagination
            count={30}
            page={settingsForm.rounds}
            className="mui-form-pagination"
            color="primary"
            onChange={handleRoundsChange}
            siblingCount={1}
            boundaryCount={1}
          />
        }
        formErr={settingsFormErr}
        backendErr={initGraphQLError}
      />

      <FormElContainer
        name="maxCompetitors"
        content={
          <Pagination
            count={99}
            page={settingsForm.maxCompetitors}
            className="mui-form-pagination"
            color="primary"
            onChange={handleMaxCompetitorsChange}
            siblingCount={1}
            boundaryCount={1}
          />
        }
        formErr={settingsFormErr}
        backendErr={initGraphQLError}
      />

      <FormElContainer
        name="pointsStructure"
        content={
          <PointsPicker
            setForm={setSettingsForm}
            formErr={settingsFormErr}
            backendErr={initGraphQLError}
            disabled={!allRoundsWaiting}
            initialPreset={currentPreset}
          />
        }
        formErr={settingsFormErr}
        backendErr={initGraphQLError}
      />
      <Button
        variant="contained"
        className="champ-settings-card__icon-btn"
        onClick={() => dropzoneOpenRef.current?.()}
        startIcon={<ImageIcon />}
      >
        Change Championship Icon
      </Button>
      {canDelete && (
        <Button
          variant="contained"
          className="champ-settings-card__delete-btn"
          onClick={() => setView("deleteChamp")}
          startIcon={<DeleteForeverIcon />}
        >
          Delete Championship
        </Button>
      )}
    </div>
  )
}

export default ChampSettings
