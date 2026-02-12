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
import ChampBannerStats from "../ChampBannerStats/ChampBannerStats"
import SessionStats from "../SessionStats/SessionStats"
import { SessionBannerData } from "../../../../api/openAPI/useSessionBanner"
import { buildChampBannerStats } from "../../champUtility"

// Shrink state from useScrollShrink hook.
interface ShrinkState {
  isShrunk: boolean  // True when ratio > 0.5 (for text truncation)
  isActive: boolean  // True when ratio > 0 (for disabled states)
}

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
  bannerRef?: React.RefObject<HTMLDivElement> // Ref for CSS variable updates (from useScrollShrink).
  shrinkState?: ShrinkState // Shrink state for class/disabled toggling.
  viewedRoundNumber?: number // When provided, shows this round number instead of current.
  sessionBanner?: SessionBannerData // When provided, renders SessionStats instead of ChampBannerStats.
}

// Props for read-only championship banner (when user is not adjudicator).
interface champBannerReadOnlyType {
  champ: ChampType
  onBannerClick?: () => void
  readOnly: true
  bannerRef?: React.RefObject<HTMLDivElement> // Ref for CSS variable updates (from useScrollShrink).
  shrinkState?: ShrinkState // Shrink state for class/disabled toggling.
  viewedRoundNumber?: number // When provided, shows this round number instead of current.
  sessionBanner?: SessionBannerData // When provided, renders SessionStats instead of ChampBannerStats.
}

type champBannerType<T, U> = champBannerEditableType<T, U> | champBannerReadOnlyType

// Displays championship banner with profile picture, name, and stats.
// Editable mode allows adjudicator to update the profile picture.
const ChampBanner = <T extends formType, U extends formErrType>(props: champBannerType<T, U>) => {
  const [ loading, setLoading ] = useState<boolean>(false)
  const navigate = useNavigate()

  // Read-only mode for non-adjudicators.
  if (props.readOnly) {
    const { champ, onBannerClick, bannerRef, shrinkState, viewedRoundNumber, sessionBanner } = props
    return (
      <div className="champ-banner" ref={bannerRef}>
        <div className="champ-banner-icon-container" onClick={onBannerClick}>
          <ImageIcon src={champ.icon} size="contained" />
        </div>
        <div className="champ-banner-info" onClick={onBannerClick}>
          <div className={`champ-name-container ${shrinkState?.isShrunk ? 'shrunk' : ''}`}>
            <p>{champ.name}</p>
          </div>
          {sessionBanner
            ? <SessionStats flag={sessionBanner.currentFlag} remainingMs={sessionBanner.remainingMs} />
            : <ChampBannerStats stats={buildChampBannerStats(champ, viewedRoundNumber)} />}
        </div>
      </div>
    )
  }

  // Editable mode for adjudicator.
  const { champ, setChamp, user, setUser, form, setForm, formErr, setFormErr, backendErr, setBackendErr, onBannerClick, settingsMode, openRef, bannerRef, shrinkState, viewedRoundNumber, sessionBanner } = props

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
          <div className={`champ-name-container ${shrinkState?.isShrunk ? 'shrunk' : ''}`}>
            <p>{champ.name}</p>
          </div>
          {sessionBanner
            ? <SessionStats flag={sessionBanner.currentFlag} remainingMs={sessionBanner.remainingMs} />
            : <ChampBannerStats stats={buildChampBannerStats(champ, viewedRoundNumber)} />}
        </>
      )
    }

    // In normal mode, show confirmation UI when files are selected.
    if (isNormalView) {
      return (
        <>
          <div className={`champ-name-container ${shrinkState?.isShrunk ? 'shrunk' : ''}`}>
            <p>{champ.name}</p>
          </div>
          {sessionBanner
            ? <SessionStats flag={sessionBanner.currentFlag} remainingMs={sessionBanner.remainingMs} />
            : <ChampBannerStats stats={buildChampBannerStats(champ, viewedRoundNumber)} />}
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

  return (
    <div className="champ-banner" ref={bannerRef}>
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
        disabled={shrinkState?.isActive}
      />
      <div className="champ-banner-info" style={{ justifyContent: isNormalView ? "space-between" : "center" }} onClick={onBannerClick}>
        {filesInForm()}
      </div>
    </div>
  )
}

export default ChampBanner
