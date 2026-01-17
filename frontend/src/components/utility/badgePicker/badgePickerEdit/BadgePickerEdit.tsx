import React, { useState, useCallback, useEffect, useRef } from "react"
import './_badgePickerEdit.scss'
import DropZone from "../../dropZone/DropZone"
import { graphQLErrorType, initGraphQLError } from "../../../../shared/requests/requestsUtility"
import MUISlider from "../../muiSlider/MUISlider"
import { ZoomInMap, ZoomOutMap } from "@mui/icons-material"
import BadgeOverlay from "../../badge/badgeOverlay/BadgeOverlay"
import { TextField } from "@mui/material"
import { inputLabel, updateForm } from "../../../../shared/formValidation"
import MUIAutocomplete from "../../muiAutocomplete/muiAutocomplete"
import { badgeOutcomeType, badgeRewardOutcomes, getRarityByHow, getOutcomeByHow } from "../../../../shared/badges"
import { badgeType } from "../../../../shared/types"
import { badgePickerErrors } from "../badgePickerUtility"
import { userType } from "../../../../shared/localStorage"
import { NavigateFunction } from "react-router-dom"
import { useChampFlowForm } from "../../../../context/ChampFlowContext"
import { newBadge, updateBadge, deleteBadge } from "../../../../shared/requests/badgeRequests"
import { uplaodS3 } from "../../../../shared/requests/bucketRequests"

interface badgePickerEditType<T> {
  isEdit: boolean | badgeType
  setIsEdit: React.Dispatch<React.SetStateAction<boolean | badgeType>>
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  navigate: NavigateFunction
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  championship?: string // Championship ID for badge association.
  embedded?: boolean // When true, registers handlers with ChampFlowContext.
  onHandlersReady?: (handlers: BadgePickerEditRef) => void // Callback to expose handlers to parent.
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

// Ref interface for exposing handlers to parent components.
export interface BadgePickerEditRef {
  submit: () => Promise<void>
  delete: () => Promise<void>
  loading: boolean
  isNewBadge: boolean
}

// If badge has a populated file key, init editForm.icon with that file.
const initIcon = (isEdit: boolean | badgeType): File | null => {
  if (typeof isEdit !== "boolean") {
    return isEdit.file ? isEdit.file : null
  } else {
    return null
  }
}

const BadgePickerEdit = <T extends { champBadges: badgeType[] }>({ isEdit, setIsEdit, form, setForm, user, setUser, navigate, backendErr, setBackendErr, championship, embedded = true, onHandlersReady }: badgePickerEditType<T>) => {
  const isNewBadge = typeof isEdit === "boolean"
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ delLoading, setDelLoading ] = useState<boolean>(false)
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

  // Controlled input value for autocomplete display (shows badge name instead of awardedHow).
  const getDisplayName = (awardedHow: string | null): string => {
    if (!awardedHow) return ""
    const outcome = getOutcomeByHow(awardedHow)
    return outcome?.name || awardedHow
  }
  const [ inputValue, setInputValue ] = useState<string>(getDisplayName(how))

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

    if (!isNewBadge && isEdit.awardedHow) {
      getHows.push(isEdit.awardedHow)
    }

    return getHows
  }

  // Submit handler - makes direct API calls for badge operations.
  // For new badges: upload to S3 → call newBadge API.
  // For editing: optionally upload to S3 → call updateBadge API.
  const onSubmitHandler = useCallback(async () => {
    // Prevent double-clicks while loading.
    if (loading) return

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

    // Get the catchy name from the outcome.
    const outcome = getOutcomeByHow(how as string)
    const outcomeName = outcome?.name || ""

    if (isNewBadge) {
      // Upload badge image to S3.
      const badgeName = editForm.customName || outcomeName || "badge"
      const s3Url = await uplaodS3("badges", badgeName, "icon", editForm.icon, setBackendErr)

      // If S3 upload failed, stop.
      if (!s3Url && editForm.icon instanceof File) {
        setLoading(false)
        return
      }

      // Call newBadge API.
      const createdBadge = await newBadge({
        url: s3Url,
        name: outcomeName,
        customName: editForm.customName || undefined,
        rarity,
        awardedHow: how as string,
        awardedDesc: findDesc(badgeRewardOutcomes, how),
        zoom,
        championship: championship || undefined,
      } as badgeType, user, setUser, navigate, setBackendErr, setLoading)

      // If newBadge succeeded, add to form state.
      if (createdBadge) {
        setForm(prevForm => ({
          ...prevForm,
          champBadges: [createdBadge, ...prevForm.champBadges]
        }))
        setIsEdit(false)
      }
    } else {
      // Editing existing badge.
      // Upload new image to S3 if changed.
      let s3Url = isEdit.url
      if (editForm.icon instanceof File) {
        const badgeName = editForm.customName || outcomeName || "badge"
        s3Url = await uplaodS3("badges", badgeName, "icon", editForm.icon, setBackendErr)
        if (!s3Url) {
          setLoading(false)
          return
        }
      }

      // Call updateBadge API.
      await updateBadge({
        _id: isEdit._id,
        url: s3Url,
        name: outcomeName,
        customName: editForm.customName || undefined,
        rarity,
        awardedHow: how as string,
        awardedDesc: findDesc(badgeRewardOutcomes, how),
        zoom,
      } as badgeType, user, setUser, navigate, setLoading, setBackendErr)

      // Update form state with new badge data.
      setForm(prevForm => ({
        ...prevForm,
        champBadges: prevForm.champBadges.map((badge: badgeType): badgeType => {
          if (badge._id === isEdit._id) {
            return {
              ...badge,
              url: s3Url,
              name: outcomeName,
              customName: editForm.customName || undefined,
              zoom,
              rarity,
              awardedHow: how ? how : badge.awardedHow,
              awardedDesc: findDesc(badgeRewardOutcomes, how),
            }
          } else {
            return badge
          }
        })
      }))
      setIsEdit(false)
    }

    setLoading(false)
  }, [loading, isNewBadge, editForm, how, zoom, rarity, form, setForm, setIsEdit, user, setUser, navigate, setBackendErr, championship, isEdit])

  // Delete a badge from database and S3 via API call.
  const deleteBadgeHandler = useCallback(async () => {
    if (!isNewBadge && isEdit._id) {
      setDelLoading(true)

      // Call deleteBadge API (deletes from DB and S3).
      const deleted = await deleteBadge(isEdit._id, user, setUser, navigate, setDelLoading, setBackendErr)

      // If delete succeeded, remove from form state.
      if (deleted) {
        setForm(prevForm => ({
          ...prevForm,
          champBadges: prevForm.champBadges.filter((badge: badgeType) => badge._id !== isEdit._id)
        }))
        setIsEdit(false)
      }

      setDelLoading(false)
    }
  }, [isNewBadge, isEdit, setForm, setIsEdit, user, setUser, navigate, setBackendErr])

  // Back handler for context.
  const handleBack = useCallback(() => setIsEdit(false), [setIsEdit])

  // Register form handlers with ChampFlowContext for parent ButtonBar to use.
  useChampFlowForm({
    submit: onSubmitHandler,
    back: handleBack,
    isEditing: !isNewBadge,
    loading,
    delLoading,
    canDelete: !isNewBadge && !!isEdit._id,
    onDelete: deleteBadgeHandler,
  }, embedded)

  // Store current handlers in a ref to avoid stale closures when parent calls them.
  const handlersRef = useRef({ submit: onSubmitHandler, delete: deleteBadgeHandler })
  useEffect(() => {
    handlersRef.current = { submit: onSubmitHandler, delete: deleteBadgeHandler }
  }, [onSubmitHandler, deleteBadgeHandler])

  // Expose stable wrapper functions to parent component (only called once on mount).
  useEffect(() => {
    if (onHandlersReady) {
      onHandlersReady({
        submit: () => handlersRef.current.submit(),
        delete: () => handlersRef.current.delete(),
        loading,
        isNewBadge,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onHandlersReady, loading, isNewBadge])

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
          thumbImg={isNewBadge ? false : (isEdit.url || isEdit.previewUrl)}
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
        inputValue={inputValue}
        onInputChange={setInputValue}
        error={editFormErr.awardedHow || backendErr.type === "awardedHow" ? true : false}
        onChange={() => setEditFormErr(prevErrs => {
          return {
            ...prevErrs,
            awardedHow: "",
          }
        })}
        badgeMode={true}
      />
    </div>
  )
}

export default BadgePickerEdit
