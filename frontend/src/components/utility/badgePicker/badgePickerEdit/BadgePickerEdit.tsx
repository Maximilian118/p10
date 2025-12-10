import React, { useState } from "react"
import './_badgePickerEdit.scss'
import DropZone from "../../dropZone/DropZone"
import { graphQLErrorType, initGraphQLError } from "../../../../shared/requests/requestsUtility"
import MUISlider from "../../muiSlider/MUISlider"
import { Diamond, Groups, ZoomInMap, ZoomOutMap } from "@mui/icons-material"
import BadgeOverlay, { getBadgeColour } from "../../badge/badgeOverlay/BadgeOverlay"
import { Button, CircularProgress, TextField } from "@mui/material"
import { inputLabel, updateForm } from "../../../../shared/formValidation"
import MUIAutocomplete from "../../muiAutocomplete/muiAutocomplete"
import { badgeOutcomeType, badgeRewardOutcomes } from "../../../../shared/badges"
import { badgeType } from "../../../../shared/types"
import { badgePickerErrors } from "../badgePickerUtility"
import { uplaodS3 } from "../../../../shared/requests/bucketRequests"
import { userType } from "../../../../shared/localStorage"
import { NavigateFunction } from "react-router-dom"

interface badgePickerEditType<T> {
  isEdit: boolean | badgeType
  setIsEdit: React.Dispatch<React.SetStateAction<boolean | badgeType>>
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  style?: React.CSSProperties
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  navigate: NavigateFunction
}

interface editFormType {
  badgeName: string
  icon: File | string | null
  profile_picture: File | string | null
}

export interface editFormErrType {
  dropzone: string
  awardedHow: string
  [key: string]: string
}

// If badge has a populated file key, init editForm.icon with that file.
const initIcon = (isEdit: boolean | badgeType): File | null => {
  if (typeof isEdit !== "boolean") {
    return isEdit.file ? isEdit.file : null
  } else {
    return null
  }
}

const BadgePickerEdit = <T extends { champBadges: badgeType[] }>({ isEdit, setIsEdit, form, setForm, style, user, setUser, navigate }: badgePickerEditType<T>) => {
  const isNewBadge = typeof isEdit === "boolean"
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ editForm, setEditForm ] = useState<editFormType>({
    badgeName: isNewBadge ? "" : isEdit.name,
    icon: initIcon(isEdit),
    profile_picture: null,
  })
  const [ editFormErr, setEditFormErr ] = useState<editFormErrType>({
    badgeName: "",
    awardedHow: "",
    dropzone: "",
  })
  const [ zoom, setZoom ] = useState<number>(isNewBadge ? 100 : isEdit.zoom)
  const [ rarity, setRarity ] = useState<number>(isNewBadge ? 0 : isEdit.rarity)
  const [ how, setHow ] = useState<string | null>(isNewBadge ? null : isEdit.awardedHow)

  const displayOverlay = !isNewBadge || editForm.icon

  // Find the object that contains the awardedHow currently in how state and return the relevant awardedDesc string.
  const findDesc = (badgeRewardOutcomes: badgeOutcomeType[], how: string | null): string => {
    return badgeRewardOutcomes.filter((outcome: badgeOutcomeType) => outcome.awardedHow === how)[0].awardedDesc
  }

  // Remove all of the reward outcomes that currently exist in form.champBadges.
  // Also, ensure to include the current awardedHow for this badge.
  const isAvailable = () => {
    const getHows = badgeRewardOutcomes.filter((outcome: badgeOutcomeType) => 
      !form.champBadges.some((badge: badgeType) => badge.awardedHow === outcome.awardedHow)
    ).map((outcome: badgeOutcomeType) => outcome.awardedHow)

    if (!isNewBadge) {
      getHows.push(isEdit.awardedHow)
    }

    return getHows
  }

  // Depending on whether we're editing or creating a new badge, setForm accordingly.
  // For new badges: upload to S3, store badge data in form (backend creates in MongoDB during createChamp).
  // For editing: update form locally (S3 upload if new image).
  const onSubmitHandler = async () => {
    // Check for errors.
    const hasErr = badgePickerErrors(isNewBadge, {
      name: editForm.badgeName,
      awardedHow: how,
      icon: editForm.icon,
    }, setEditFormErr, form.champBadges)

    // If any strings in editFormErr are truthy, return.
    if (hasErr) {
      return
    }

    setLoading(true)

    if (isNewBadge) {
      // Upload badge image to S3 if it's a File.
      let s3Url = typeof editForm.icon === "string" ? editForm.icon : ""
      if (editForm.icon instanceof File) {
        const uploadedUrl = await uplaodS3("badges", "custom", "icon", editForm.icon, setBackendErr)
        if (!uploadedUrl) {
          setLoading(false)
          return
        }
        s3Url = uploadedUrl
        // Store uploaded URL in form state for retry.
        setEditForm(prev => ({ ...prev, icon: s3Url }))
      }

      // Add badge data to form (no DB call - backend creates it during createChamp).
      setForm(prevForm => ({
        ...prevForm,
        champBadges: [
          {
            url: s3Url,
            name: editForm.badgeName,
            rarity,
            awardedHow: how,
            awardedDesc: findDesc(badgeRewardOutcomes, how),
            zoom,
            default: false,
          } as badgeType,
          ...prevForm.champBadges,
        ]
      }))
    } else {
      // Editing existing badge - update form locally.
      // If a new image was uploaded, upload to S3 first.
      let badgeUrl = isEdit.url
      if (editForm.icon instanceof File) {
        const s3Url = await uplaodS3("badges", "custom", "icon", editForm.icon, setBackendErr)
        if (s3Url) {
          badgeUrl = s3Url
          // Store uploaded URL in form state for retry.
          setEditForm(prev => ({ ...prev, icon: s3Url }))
        }
      } else if (typeof editForm.icon === "string") {
        badgeUrl = editForm.icon
      }

      setForm(prevForm => ({
        ...prevForm,
        champBadges: prevForm.champBadges.map((badge: badgeType): badgeType => {
          if (badge._id === isEdit._id) {
            return {
              ...badge,
              url: badgeUrl,
              name: editForm.badgeName,
              zoom,
              rarity,
              awardedHow: how ? how : badge.awardedHow,
              awardedDesc: findDesc(badgeRewardOutcomes, how),
              default: false,
            }
          } else {
            return badge
          }
        })
      }))
    }

    setLoading(false)
    setIsEdit(false)
  }

  // Remove/delete a badge from form.champBadges.
  const deleteBadgeHandler = () => {
    if (!isNewBadge) {
      setForm(prevForm => {
        return {
          ...prevForm,
          champBadges: prevForm.champBadges.filter((badge: badgeType) => badge._id !== isEdit._id)
        }
      })
    }

    setIsEdit(false)
  }

  return (
    <div className="badge-picker-edit" style={style}>
      <h4>{`${isNewBadge ? `New` : `Edit`} Badge`}</h4>
      <div className="badge-wrapper">
        <BadgeOverlay 
          rarity={rarity} 
          thickness={10} 
          style={{ opacity: displayOverlay ? "" : 0 }} 
          error={editFormErr.dropzone || backendErr.type === "badge" ? true : false}
        />
        <DropZone<editFormType, editFormErrType>
          form={editForm}
          setForm={setEditForm}
          formErr={editFormErr}
          setFormErr={setEditFormErr}
          backendErr={backendErr}
          setBackendErr={setBackendErr}
          purposeText="Badge Image"
          zoom={zoom}
          thumbImg={isNewBadge ? false : isEdit.url}
          style={{ marginBottom: 0, width: "100%" }}
        />
      </div>
      <MUISlider
        ariaLabel="Zoom Level"
        value={zoom}
        setValue={setZoom}
        label="Zoom"
        iconLeft={<ZoomInMap/>}
        iconRight={<ZoomOutMap/>}
        min={25}
        max={175}
        style={{ padding: "0 20px" }}
      />
      <MUISlider
        ariaLabel="Rarity Level"
        value={rarity}
        setValue={setRarity}
        label="Rarity"
        iconLeft={<Groups/>}
        iconRight={<Diamond/>}
        steps={1}
        min={0}
        max={5}
        style={{ padding: "0 20px", marginBottom: 30 }}
        colour={getBadgeColour(rarity)}
      />
      <TextField
        name="badgeName"
        inputProps={{ maxLength: 30 }}
        className="mui-form-el"
        label={inputLabel("badgeName", editFormErr, backendErr)}
        variant="filled" 
        onChange={e => updateForm<editFormType, editFormErrType>(e, editForm, setEditForm, setEditFormErr, backendErr, setBackendErr)}
        value={editForm.badgeName}
        error={editFormErr.badgeName || backendErr.type === "badgeName" ? true : false}
      />
      <MUIAutocomplete
        label={inputLabel("awardedHow", editFormErr, backendErr)}
        options={isAvailable()}
        className="mui-el"
        value={how}
        setValue={setHow}
        error={editFormErr.awardedHow || backendErr.type === "awardedHow" ? true : false}
        onChange={() => setEditFormErr(prevErrs => {
          return {
            ...prevErrs,
            awardedHow: "",
          }
        })}
      />
      <div className="button-bar">
        <Button
          className="mui-button-back"
          variant="contained" 
          color="inherit"
          onClick={() => setIsEdit(false)}
        >Back</Button>
        {!isNewBadge && <Button
          variant="contained" 
          color="error"
          onClick={() => deleteBadgeHandler()}
        >Delete</Button>}
        <Button
          variant="contained"
          onClick={() => onSubmitHandler()}
          disabled={loading}
        >{loading ? <CircularProgress size={24} /> : "Submit"}</Button>
      </div>
    </div>
  )
}

export default BadgePickerEdit
