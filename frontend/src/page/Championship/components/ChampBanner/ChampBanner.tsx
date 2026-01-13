import React, { useState } from "react"
import './_champBanner.scss'
import DropZone from "../../../../components/utility/dropZone/DropZone"
import { graphQLErrorType } from "../../../../shared/requests/requestsUtility"
import { userType } from "../../../../shared/localStorage"
import { ChampType, formErrType, formType } from "../../../../shared/types"
import { Button, CircularProgress } from "@mui/material"
import { updateChampPP } from "../../../../shared/requests/champRequests"
import { useNavigate } from "react-router-dom"
import ImageIcon from "../../../../components/utility/icon/imageIcon/ImageIcon"
import { getCompetitors } from "../../../../shared/utility"
import SportsMotorsportsIcon from "@mui/icons-material/SportsMotorsports"
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium"
import RotateRightIcon from "@mui/icons-material/RotateRight"
import AutoModeIcon from "@mui/icons-material/AutoMode"
import PersonIcon from "@mui/icons-material/Person"
import ChampBannerStats from "../ChampBannerStats/ChampBannerStats"

// Props for editable championship banner (when user is adjudicator).
interface champBannerEditableType<T, U> {
  champ: ChampType
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  formErr: U
  setFormErr: React.Dispatch<React.SetStateAction<U>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  onBannerClick?: () => void
  readOnly?: false
  settingsMode?: boolean // When true, hide confirmation UI (Save Changes button handles submission).
  openRef?: React.MutableRefObject<(() => void) | null> // Ref to expose DropZone's open function.
  shrinkRatio?: number // 0-1 ratio for scroll-based shrinking animation.
  viewedRoundNumber?: number // When provided, shows this round number instead of current.
}

// Props for read-only championship banner (when user is not adjudicator).
interface champBannerReadOnlyType {
  champ: ChampType
  onBannerClick?: () => void
  readOnly: true
  shrinkRatio?: number // 0-1 ratio for scroll-based shrinking animation.
  viewedRoundNumber?: number // When provided, shows this round number instead of current.
}

type champBannerType<T, U> = champBannerEditableType<T, U> | champBannerReadOnlyType

// Generates the bottom stats array for the championship banner.
const getBottomStats = (champ: ChampType, viewedRoundNumber?: number) => {
  const displayedRound = viewedRoundNumber ?? 0
  const autoNextRound = champ.settings.automation?.enabled && champ.settings.automation?.round?.autoNextRound

  return [
    { icon: autoNextRound ? <AutoModeIcon style={{ width: 16, height: 16 }}/> : <RotateRightIcon />, value: `${displayedRound}/${champ.rounds.length}` },
    { icon: <PersonIcon />, value: `${getCompetitors(champ).length}/${champ.settings.maxCompetitors}` },
    { icon: <SportsMotorsportsIcon />, value: champ.series.drivers.length },
    { icon: <WorkspacePremiumIcon />, value: champ.champBadges.length }
  ]
}

// Displays championship banner with profile picture, name, and stats.
// Editable mode allows adjudicator to update the profile picture.
const ChampBanner = <T extends formType, U extends formErrType>(props: champBannerType<T, U>) => {
  const [ loading, setLoading ] = useState<boolean>(false)
  const navigate = useNavigate()

  // Read-only mode for non-adjudicators.
  if (props.readOnly) {
    const { champ, onBannerClick, shrinkRatio, viewedRoundNumber } = props
    return (
      <div className="champ-banner" style={{ '--shrink-ratio': shrinkRatio ?? 0 } as React.CSSProperties}>
        <div className="champ-banner-icon-container" onClick={onBannerClick}>
          <ImageIcon src={champ.icon} size="contained" />
        </div>
        <div className="champ-banner-info" onClick={onBannerClick}>
          <div className={`champ-name-container ${(shrinkRatio ?? 0) > 0.5 ? 'shrunk' : ''}`}>
            <p>{champ.name}</p>
          </div>
          <ChampBannerStats stats={getBottomStats(champ, viewedRoundNumber)} />
        </div>
      </div>
    )
  }

  // Editable mode for adjudicator.
  const { champ, setChamp, user, setUser, form, setForm, formErr, setFormErr, backendErr, setBackendErr, onBannerClick, settingsMode, openRef, shrinkRatio, viewedRoundNumber } = props

  // Is the "Are you sure" check dispalying or not?
  const isNormalView = !form.icon && !form.profile_picture

  // Handles profile picture upload for championship.
  const uploadPPHandler = async () => {
    await updateChampPP(champ._id, form, setForm, setChamp, user, setUser, navigate, setLoading, setBackendErr)
  }

  // Renders content based on whether files are selected and current mode.
  const filesInForm = (): JSX.Element => {
    // In settings mode, always show stats (Save Changes button handles submission).
    if (settingsMode) {
      return (
        <>
          <div className={`champ-name-container ${(shrinkRatio ?? 0) > 0.5 ? 'shrunk' : ''}`}>
            <p>{champ.name}</p>
          </div>
          <ChampBannerStats stats={getBottomStats(champ, viewedRoundNumber)} />
        </>
      )
    }

    // In normal mode, show confirmation UI when files are selected.
    if (isNormalView) {
      return (
        <>
          <div className={`champ-name-container ${(shrinkRatio ?? 0) > 0.5 ? 'shrunk' : ''}`}>
            <p>{champ.name}</p>
          </div>
          <ChampBannerStats stats={getBottomStats(champ, viewedRoundNumber)} />
        </>
      )
    } else {
      return (
        <>
          <p style={{ marginBottom: 10 }}>Are you sure?</p>
          <Button
            variant="contained"
            className="mui-form-btn"
            style={{ margin: "5px 0 0 0" }}
            startIcon={loading && <CircularProgress size={20} color={"inherit"}/>}
            onClick={() => uploadPPHandler()}
          >Confirm</Button>
        </>
      )
    }
  }

  const isShrunk = (shrinkRatio ?? 0) > 0
  return (
    <div className="champ-banner" style={{ '--shrink-ratio': shrinkRatio ?? 0 } as React.CSSProperties}>
      <DropZone<T, U>
        form={form}
        setForm={setForm}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="Championship"
        thumbImg={champ.icon}
        openRef={openRef}
        disabled={isShrunk}
      />
      <div className="champ-banner-info" style={{ justifyContent: isNormalView ? "space-between" : "center" }} onClick={onBannerClick}>
        {filesInForm()}
      </div>
    </div>
  )
}

export default ChampBanner
