import React, { useState, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { TextField } from "@mui/material"
import { ChampType, ProtestType } from "../../../../../shared/types"
import { userType } from "../../../../../shared/localStorage"
import { graphQLErrorType, initGraphQLError } from "../../../../../shared/requests/requestsUtility"
import { createProtest } from "../../../../../shared/requests/champRequests"
import { inputLabel, validateRequired } from "../../../../../shared/formValidation"
import MUIAutocomplete from "../../../../../components/utility/muiAutocomplete/muiAutocomplete"
import FloatingUserCard from "../../../../../components/cards/floatingUserCard/FloatingUserCard"
import "./_createProtest.scss"

interface CreateProtestProps {
  champ: ChampType
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  onSuccess: (protest: ProtestType) => void
  onCancel: () => void
  onSubmitRef?: React.MutableRefObject<(() => Promise<void>) | null>
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
}

// Form state type.
interface CreateProtestFormType {
  accusedId: string
  title: string
  description: string
}

// Form error type (index signature for formErrType compatibility).
interface CreateProtestFormErrType {
  accused: string
  title: string
  description: string
  [key: string]: string | undefined | number
}

// Option type for accused selector.
interface AccusedOption {
  _id: string
  name: string
  icon?: string
}

// CreateProtest component for filing a new protest.
const CreateProtest: React.FC<CreateProtestProps> = ({
  champ,
  user,
  setUser,
  setBackendErr,
  onSuccess,
  onSubmitRef,
  setLoading,
}) => {
  const navigate = useNavigate()

  const [form, setForm] = useState<CreateProtestFormType>({
    accusedId: "",
    title: "",
    description: "",
  })

  const [formErr, setFormErr] = useState<CreateProtestFormErrType>({
    accused: "",
    title: "",
    description: "",
  })

  const [submitLoading, setSubmitLoading] = useState(false)
  const [selectedAccused, setSelectedAccused] = useState<AccusedOption | null>(null)

  // Get available competitors (excluding self) for accused selection.
  const accusedOptions = useMemo((): AccusedOption[] => {
    return champ.competitors
      .filter((c) => c._id !== user._id)
      .map((c) => ({
        _id: c._id,
        name: c.name,
        icon: c.icon,
      }))
  }, [champ.competitors, user._id])

  // Handle title change with live validation.
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, title: value }))

    if (value.length > 100) {
      setFormErr((prev) => ({ ...prev, title: "Maximum 100 characters." }))
    } else {
      setFormErr((prev) => ({ ...prev, title: "" }))
    }
  }, [])

  // Handle description change with live validation.
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, description: value }))

    if (value.length > 1000) {
      setFormErr((prev) => ({ ...prev, description: "Maximum 1000 characters." }))
    } else {
      setFormErr((prev) => ({ ...prev, description: "" }))
    }
  }, [])

  // Handle accused object selection via setObjValue.
  const handleAccusedObjChange = useCallback((value: React.SetStateAction<AccusedOption | null>) => {
    const newValue = typeof value === "function" ? value(selectedAccused) : value
    setSelectedAccused(newValue)
    setForm((prev) => ({ ...prev, accusedId: newValue?._id || "" }))
    setFormErr((prev) => ({ ...prev, accused: "" }))
  }, [selectedAccused])

  // Handle accused selection change (clears error).
  const handleAccusedChange = useCallback(() => {
    setFormErr((prev) => ({ ...prev, accused: "" }))
  }, [])

  // Validate form before submit.
  const validateForm = useCallback((): boolean => {
    // Reset errors.
    setFormErr({
      accused: "",
      title: "",
      description: "",
    })

    let isValid = true

    // Check required fields (title and description).
    const requiredValid = validateRequired<CreateProtestFormType, CreateProtestFormErrType>(
      ["title", "description"],
      form,
      setFormErr,
    )

    // Check length constraints.
    if (form.title.length > 100) {
      setFormErr((prev) => ({ ...prev, title: "Maximum 100 characters." }))
      isValid = false
    }

    if (form.description.length > 1000) {
      setFormErr((prev) => ({ ...prev, description: "Maximum 1000 characters." }))
      isValid = false
    }

    return isValid && requiredValid
  }, [form])

  // Handle form submission.
  const handleSubmit = useCallback(async () => {
    if (submitLoading) return

    if (!validateForm()) return

    setSubmitLoading(true)
    setLoading?.(true)

    // Intercept backend errors that should display on form fields.
    // Prevents field-level errors from reaching Championship.tsx ErrorDisplay.
    const localSetBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>> = (errOrUpdater) => {
      const err = typeof errOrUpdater === "function" ? errOrUpdater(initGraphQLError) : errOrUpdater
      // Profanity errors: show on the offending field (err.type is "title" or "description").
      if (err.value === "profanity") {
        setFormErr((prev) => ({
          ...prev,
          [err.type]: err.message,
        }))
        return
      }
      // All other errors: pass to parent (triggers ErrorDisplay).
      setBackendErr(errOrUpdater)
    }

    try {
      const protest = await createProtest(
        champ._id,
        form.title,
        form.description,
        form.accusedId || null,
        user,
        setUser,
        navigate,
        localSetBackendErr,
      )

      if (protest) {
        onSuccess(protest)
      }
    } finally {
      setSubmitLoading(false)
      setLoading?.(false)
    }
  }, [
    submitLoading,
    validateForm,
    champ._id,
    form.title,
    form.description,
    form.accusedId,
    user,
    setUser,
    navigate,
    setBackendErr,
    onSuccess,
    setLoading,
  ])

  // Expose submit handler to parent via ref.
  if (onSubmitRef) {
    onSubmitRef.current = handleSubmit
  }

  return (
    <div className="create-protest">
      {/* Current user card */}
      <FloatingUserCard icon={user.icon} name={user.name} label="Filing this protest" userId={user._id} />

      {/* Accused selector */}
      <MUIAutocomplete<AccusedOption>
        label={inputLabel("accused", formErr, initGraphQLError)}
        options={accusedOptions}
        value={selectedAccused?.name || null}
        setObjValue={handleAccusedObjChange}
        onChange={handleAccusedChange}
        error={!!formErr.accused}
        className="create-protest__input"
      />

      {/* Title field */}
      <TextField
        name="title"
        label={inputLabel("title", formErr, initGraphQLError)}
        variant="filled"
        value={form.title}
        onChange={handleTitleChange}
        error={!!formErr.title}
        inputProps={{ maxLength: 100 }}
        className="create-protest__input"
        placeholder="Brief title for your protest"
      />

      {/* Description field */}
      <TextField
        name="description"
        label={inputLabel("description", formErr, initGraphQLError)}
        variant="filled"
        value={form.description}
        onChange={handleDescriptionChange}
        error={!!formErr.description}
        inputProps={{ maxLength: 1000 }}
        multiline
        rows={8}
        className="create-protest__input"
        placeholder="Describe the issue and provide any relevant details"
      />

      {/* Character count for description */}
      <p className="create-protest__char-count">{form.description.length}/1000</p>
    </div>
  )
}

export default CreateProtest
