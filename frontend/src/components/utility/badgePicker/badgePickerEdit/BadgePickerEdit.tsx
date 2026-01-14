import React, { useState, useCallback } from "react"
import './_badgePickerEdit.scss'
import DropZone from "../../dropZone/DropZone"
import { graphQLErrorType, initGraphQLError } from "../../../../shared/requests/requestsUtility"
import MUISlider from "../../muiSlider/MUISlider"
import { ZoomInMap, ZoomOutMap } from "@mui/icons-material"
import BadgeOverlay from "../../badge/badgeOverlay/BadgeOverlay"
import { Button, CircularProgress, TextField } from "@mui/material"
import { inputLabel, updateForm } from "../../../../shared/formValidation"
import MUIAutocomplete from "../../muiAutocomplete/muiAutocomplete"
import { badgeOutcomeType, badgeRewardOutcomes, getRarityByHow, getOutcomeByHow } from "../../../../shared/badges"
import { badgeType } from "../../../../shared/types"
import { badgePickerErrors } from "../badgePickerUtility"
import { uplaodS3 } from "../../../../shared/requests/bucketRequests"
import { userType } from "../../../../shared/localStorage"
import { NavigateFunction } from "react-router-dom"
import { useChampFlowForm } from "../../../../context/ChampFlowContext"

interface badgePickerEditType<T> {
  isEdit: boolean | badgeType
  setIsEdit: React.Dispatch<React.SetStateAction<boolean | badgeType>>
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  navigate: NavigateFunction
  embedded?: boolean
}

interface editFormType {
  customName: string
  icon: File | string | null
  profile_picture: File | string | null
}

export interface editFormErrType {
  dropzone: string
  awardedHow: string
  customName: string
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

const BadgePickerEdit = <T extends { champBadges: badgeType[] }>({ isEdit, setIsEdit, form, setForm, embedded = true }: badgePickerEditType<T>) => {
  const isNewBadge = typeof isEdit === "boolean"
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ editForm, setEditForm ] = useState<editFormType>({
    customName: isNewBadge ? "" : (isEdit.customName || ""),
    icon: initIcon(isEdit),
    profile_picture: null,
  })
  const [ editFormErr, setEditFormErr ] = useState<editFormErrType>({
    customName: "",
    awardedHow: "",
    dropzone: "",
  })
  const [ zoom, setZoom ] = useState<number>(isNewBadge ? 100 : isEdit.zoom)
  const [ how, setHow ] = useState<string | null>(isNewBadge ? null : isEdit.awardedHow)

  // Rarity is determined by the selected awardedHow outcome.
  const rarity = how ? getRarityByHow(how) : 0

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
      customName: editForm.customName,
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

      // Get the catchy name from the outcome.
      const outcome = getOutcomeByHow(how as string)
      const outcomeName = outcome?.name || ""

      // Add badge data to form (no DB call - backend creates it during createChamp).
      setForm(prevForm => ({
        ...prevForm,
        champBadges: [
          {
            url: s3Url,
            name: outcomeName,
            customName: editForm.customName || undefined,
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

      // Get the catchy name from the outcome.
      const editOutcome = getOutcomeByHow(how as string)
      const editOutcomeName = editOutcome?.name || ""

      setForm(prevForm => ({
        ...prevForm,
        champBadges: prevForm.champBadges.map((badge: badgeType): badgeType => {
          if (badge._id === isEdit._id) {
            return {
              ...badge,
              url: badgeUrl,
              name: editOutcomeName,
              customName: editForm.customName || undefined,
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
  const deleteBadgeHandler = useCallback(async () => {
    if (!isNewBadge) {
      setForm(prevForm => {
        return {
          ...prevForm,
          champBadges: prevForm.champBadges.filter((badge: badgeType) => badge._id !== isEdit._id)
        }
      })
    }

    setIsEdit(false)
  }, [isNewBadge, isEdit, setForm, setIsEdit])

  // Back handler for context.
  const handleBack = useCallback(() => setIsEdit(false), [setIsEdit])

  // Register form handlers with ChampFlowContext for parent ButtonBar to use.
  const { showButtonBar } = useChampFlowForm({
    submit: onSubmitHandler,
    back: handleBack,
    isEditing: !isNewBadge,
    loading,
    delLoading: false,
    canDelete: !isNewBadge,
    onDelete: deleteBadgeHandler,
  }, embedded)

  return (
    <div className="badge-picker-edit">
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
        style={{ padding: "0 20px", marginBottom: 30 }}
      />
      <TextField
        name="customName"
        inputProps={{ maxLength: 30 }}
        className="mui-form-el"
        label={inputLabel("customName", editFormErr, backendErr)}
        variant="filled"
        onChange={e => updateForm<editFormType, editFormErrType>(e, editForm, setEditForm, setEditFormErr, backendErr, setBackendErr)}
        value={editForm.customName}
        error={editFormErr.customName || backendErr.type === "customName" ? true : false}
        placeholder="Optional custom name"
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
        badgeMode={true}
      />
      {showButtonBar && (
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
      )}
    </div>
  )
}

export default BadgePickerEdit
