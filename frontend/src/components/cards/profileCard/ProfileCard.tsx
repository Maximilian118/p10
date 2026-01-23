import React, { useState, useMemo } from "react"
import './_profileCard.scss'
import DropZone from "../../utility/dropZone/DropZone"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import { userType } from "../../../shared/localStorage"
import { getPermLevel, getPermLevelFromPermissions } from "../../../shared/utility"
import moment from "moment"
import { formErrType, formType, SelectionModeState, userProfileType } from "../../../shared/types"
import { Button, CircularProgress } from "@mui/material"
import { updatePP } from "../../../shared/requests/userRequests"
import { useNavigate } from "react-router-dom"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import BadgePlaceholder from "../../utility/badge/badgePlaceholder/BadgePlaceholder"
import Badge from "../../utility/badge/Badge"
import AuraRingWrapper from "../../utility/auraRing/AuraRingWrapper"
import { getBadgeColour } from "../../utility/badge/badgeOverlay/badgeOverlayUtility"

// Props for editable profile (own profile).
interface profileCardEditableType<T, U> {
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  formErr: U
  setFormErr: React.Dispatch<React.SetStateAction<U>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  selectionMode: SelectionModeState
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionModeState>>
  featuredBadgeLoading: boolean
  readOnly?: false
}

// Props for read-only profile (viewing other users).
interface profileCardReadOnlyType {
  user: userProfileType
  readOnly: true
}

type profileCardType<T, U> = profileCardEditableType<T, U> | profileCardReadOnlyType

const ProfileCard = <T extends formType, U extends formErrType>(props: profileCardType<T, U>) => {
  const [ loading, setLoading ] = useState<boolean>(false)
  const navigate = useNavigate()

  // Collect colors from featured badges for the AuraRing (must be before early return)
  const featuredBadgeColors = useMemo(() => {
    return props.user.badges
      .filter(b => b.featured !== null && b.featured !== undefined)
      .map(b => getBadgeColour(b.rarity))
  }, [props.user.badges])

  // Read-only mode for viewing other users.
  if (props.readOnly) {
    const { user } = props

    // Renders a featured badge slot showing actual badge if featured, placeholder if empty.
    const renderReadOnlySlot = (position: number) => {
      const featuredBadge = user.badges.find(b => b.featured === position)
      if (featuredBadge) {
        return <Badge key={position} badge={featuredBadge} zoom={featuredBadge.zoom} showEditButton={false} />
      }
      return <BadgePlaceholder key={position} position={position} />
    }

    return (
      <div className="profile-card">
        <AuraRingWrapper colors={featuredBadgeColors} className="profile-icon-container">
          <ImageIcon src={user.icon} size="contained" />
        </AuraRingWrapper>
        <div className="profile-info">
          <p>{user.name}</p>
          <h5 style={{ textTransform: "capitalize" }}>
            {`${getPermLevelFromPermissions(user.permissions)} since: ${moment(user.created_at).format("Do MMM YYYY")}`}
          </h5>
          <div className="featured-badges">
            {[1, 2, 3, 4, 5, 6].map(renderReadOnlySlot)}
          </div>
        </div>
      </div>
    )
  }

  // Editable mode for own profile.
  const { user, setUser, form, setForm, formErr, setFormErr, backendErr, setBackendErr, selectionMode, setSelectionMode, featuredBadgeLoading } = props

  const uploadPPHandler = async () => {
    await updatePP(form, setForm, user, setUser, navigate, setLoading, setBackendErr)
  }

  // Enters selection mode for a specific slot position.
  const handleSlotClick = (position: number) => {
    setSelectionMode({ active: true, targetSlot: position })
  }

  // Renders a featured badge slot showing actual badge if featured, placeholder if empty.
  // Both are clickable to enter selection mode.
  const renderFeaturedSlot = (position: number) => {
    const featuredBadge = user.badges.find(b => b.featured === position)
    const isSelected = selectionMode.active && selectionMode.targetSlot === position

    // Show spinner on the target slot while featured badge mutation is in progress.
    if (featuredBadgeLoading && selectionMode.targetSlot === position) {
      return <CircularProgress key={position} size="small"/>
    }

    if (featuredBadge) {
      return (
        <div
          key={position}
          className={`featured-slot ${isSelected ? 'featured-slot--selected' : ''}`}
          onClick={() => handleSlotClick(position)}
        >
          <Badge badge={featuredBadge} zoom={featuredBadge.zoom} showEditButton={false} />
        </div>
      )
    }

    return (
      <BadgePlaceholder
        key={position}
        position={position}
        isSelected={isSelected}
        onClick={() => handleSlotClick(position)}
      />
    )
  }

  const filesInForm = (form: T): JSX.Element => {
    if (!form.icon && !form.profile_picture) {
      return (
        <>
          <p>{user.name}</p>
          <h5 style={{ textTransform: "capitalize" }}>
            {`${getPermLevel(user)} since: ${moment(user.created_at).format("Do MMM YYYY")}`}
          </h5>
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
    <div className="profile-card">
      <AuraRingWrapper colors={featuredBadgeColors} className="profile-dropzone-container">
        <DropZone<T, U>
          form={form}
          setForm={setForm}
          user={user}
          formErr={formErr}
          setFormErr={setFormErr}
          backendErr={backendErr}
          setBackendErr={setBackendErr}
          purposeText="User"
          thumbImg={user.icon}
          style={{ width: 100 }}
        />
      </AuraRingWrapper>
      <div className="profile-info">
        {filesInForm(form)}
        <div className="featured-badges">
          {[1, 2, 3, 4, 5, 6].map(renderFeaturedSlot)}
        </div>
      </div>
    </div>
  )
}

export default ProfileCard
