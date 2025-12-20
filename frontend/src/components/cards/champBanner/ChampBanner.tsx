import React, { useState } from "react"
import './_champBanner.scss'
import DropZone from "../../utility/dropZone/DropZone"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import { userType } from "../../../shared/localStorage"
import { ChampType, formErrType, formType } from "../../../shared/types"
import { Button, CircularProgress } from "@mui/material"
import { updateChampPP } from "../../../shared/requests/champRequests"
import { useNavigate } from "react-router-dom"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import { getCompetitors } from "../../../shared/utility"
import SportsMotorsportsIcon from "@mui/icons-material/SportsMotorsports"
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium"
import RotateRightIcon from "@mui/icons-material/RotateRight"
import PersonIcon from "@mui/icons-material/Person"

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
}

// Props for read-only championship banner (when user is not adjudicator).
interface champBannerReadOnlyType {
  champ: ChampType
  onBannerClick?: () => void
  readOnly: true
}

type champBannerType<T, U> = champBannerEditableType<T, U> | champBannerReadOnlyType

// Renders quick stats for the championship banner.
const ChampBannerStats = ({ champ }: { champ: ChampType }) => (
  <div className="champ-banner-stats">
    <div className="champ-stat">
      <RotateRightIcon />
      <span>{champ.rounds.find(r => r.status !== "completed")?.round || champ.rounds.length}/{champ.rounds.length}</span>
    </div>
    <div className="champ-stat">
      <PersonIcon />
      <span>{getCompetitors(champ).length}/{champ.settings.maxCompetitors}</span>
    </div>
    <div className="champ-stat">
      <SportsMotorsportsIcon />
      <span>{champ.series.drivers.length}</span>
    </div>
    <div className="champ-stat">
      <WorkspacePremiumIcon />
      <span>{champ.champBadges.length}</span>
    </div>
  </div>
)

// Displays championship banner with profile picture, name, and stats.
// Editable mode allows adjudicator to update the profile picture.
const ChampBanner = <T extends formType, U extends formErrType>(props: champBannerType<T, U>) => {
  const [ loading, setLoading ] = useState<boolean>(false)
  const navigate = useNavigate()

  // Read-only mode for non-adjudicators.
  if (props.readOnly) {
    const { champ, onBannerClick } = props
    return (
      <div className="champ-banner">
        <div className="champ-banner-icon-container" onClick={onBannerClick}>
          <ImageIcon src={champ.icon} size="contained" />
        </div>
        <div className="champ-banner-info" onClick={onBannerClick}>
          <p>{champ.name}</p>
          <ChampBannerStats champ={champ} />
        </div>
      </div>
    )
  }

  // Editable mode for adjudicator.
  const { champ, setChamp, user, setUser, form, setForm, formErr, setFormErr, backendErr, setBackendErr, onBannerClick, settingsMode, openRef } = props

  // Handles profile picture upload for championship.
  const uploadPPHandler = async () => {
    await updateChampPP(champ._id, form, setForm, setChamp, user, setUser, navigate, setLoading, setBackendErr)
  }

  // Renders content based on whether files are selected and current mode.
  const filesInForm = (form: T): JSX.Element => {
    // In settings mode, always show stats (Save Changes button handles submission).
    if (settingsMode) {
      return (
        <>
          <p>{champ.name}</p>
          <ChampBannerStats champ={champ} />
        </>
      )
    }

    // In normal mode, show confirmation UI when files are selected.
    if (!form.icon && !form.profile_picture) {
      return (
        <>
          <p>{champ.name}</p>
          <ChampBannerStats champ={champ} />
        </>
      )
    } else {
      return (
        <>
          <p>Are you sure?</p>
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
    <div className="champ-banner">
      <DropZone<T, U>
        form={form}
        setForm={setForm}
        formErr={formErr}
        setFormErr={setFormErr}
        backendErr={backendErr}
        setBackendErr={setBackendErr}
        purposeText="Championship"
        thumbImg={champ.icon}
        style={{ width: 100, margin: 20 }}
        openRef={openRef}
      />
      <div className="champ-banner-info" onClick={onBannerClick}>
        {filesInForm(form)}
      </div>
    </div>
  )
}

export default ChampBanner
