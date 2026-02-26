import React, { useContext, useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { TextField, Autocomplete } from "@mui/material"
import AppContext from "../../context"
import { seriesType, LeagueType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError, hasBackendErr } from "../../shared/requests/requestsUtility"
import { getSeries } from "../../shared/requests/seriesRequests"
import { createLeague, updateLeagueSettings, deleteLeague, CreateLeagueFormType } from "../../shared/requests/leagueRequests"
import { uplaodS3 } from "../../shared/requests/bucketRequests"
import { capitalise } from "../../shared/utility"
import DropZone from "../../components/utility/dropZone/DropZone"
import MUISwitch from "../../components/utility/muiSwitch/MUISwitch"
import { ArrowBack, Delete, Info } from "@mui/icons-material"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import SeriesOption from "../../components/utility/seriesOption/SeriesOption"
import InfoModal from "../../components/modal/configs/InfoModal/InfoModal"
import { tooltips } from "../../shared/tooltip"
import "./_createLeague.scss"

// Max championship options for the autocomplete (2-50).
const maxChampOptions: number[] = Array.from({ length: 49 }, (_, i) => i + 2)

interface CreateLeagueFormErrType {
  name: string
  series: string
  dropzone: string
  [key: string]: string
}

const initFormErr: CreateLeagueFormErrType = {
  name: "",
  series: "",
  dropzone: "",
}

// Page for creating or editing a league.
const CreateLeague: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()
  const location = useLocation()

  // Determine if editing from route state.
  const editingLeague = (location.state as { league?: LeagueType })?.league || null
  const isEditing = !!editingLeague

  const [loading, setLoading] = useState<boolean>(false)
  const [delLoading, setDelLoading] = useState<boolean>(false)
  const [seriesLoading, setSeriesLoading] = useState<boolean>(false)
  const [showInfo, setShowInfo] = useState<boolean>(false)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [formErr, setFormErr] = useState<CreateLeagueFormErrType>(initFormErr)

  // Delete confirmation state.
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [confirmDelete, setConfirmDelete] = useState<string>("")

  // All series available for selection.
  const [seriesList, setSeriesList] = useState<seriesType[]>([])

  // Initialise form with editing data or defaults.
  const [form, setForm] = useState<CreateLeagueFormType>(() => {
    if (editingLeague) {
      return {
        name: editingLeague.name || "",
        icon: null,
        profile_picture: null,
        series: editingLeague.series?._id || "",
        maxChampionships: editingLeague.settings.maxChampionships || 12,
        inviteOnly: editingLeague.settings.inviteOnly ?? false,
      }
    }
    return {
      name: "",
      icon: null,
      profile_picture: null,
      series: "",
      maxChampionships: 12,
      inviteOnly: false,
    }
  })

  // Selected series object for the Autocomplete.
  const [selectedSeries, setSelectedSeries] = useState<seriesType | null>(
    editingLeague?.series || null
  )

  // Fetch all series on mount.
  useEffect(() => {
    getSeries(setSeriesList, user, setUser, navigate, setSeriesLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sort series alphabetically: eligible (has rounds) first, then ineligible.
  const sortedSeries = seriesList.slice().sort((a, b) => {
    const aEligible = a.rounds && a.rounds > 0
    const bEligible = b.rounds && b.rounds > 0
    if (aEligible && !bEligible) return -1
    if (!aEligible && bEligible) return 1
    return a.name.localeCompare(b.name)
  })

  // Whether the user can delete (creator or admin).
  const canDelete = editingLeague?.creator?._id === user._id || user.permissions?.admin

  // Checks whether any form field has changed from the editing league's values.
  const hasFormChanged = (): boolean => {
    if (!editingLeague) return true
    if (capitalise(form.name) !== editingLeague.name) return true
    if (form.maxChampionships !== editingLeague.settings.maxChampionships) return true
    if (form.inviteOnly !== (editingLeague.settings.inviteOnly ?? false)) return true
    if (form.icon instanceof File) return true
    if (form.profile_picture instanceof File) return true
    return false
  }

  // Validates form before submission.
  const validateForm = (): boolean => {
    const errors: CreateLeagueFormErrType = { ...initFormErr }
    let valid = true

    if (!form.name.trim()) {
      errors.name = "Please enter a league name."
      valid = false
    }

    if (!form.series) {
      errors.series = "Please select a series."
      valid = false
    }

    // Images required only when creating (not editing).
    if (!isEditing && (!form.icon || !form.profile_picture)) {
      errors.dropzone = "Please upload a league image."
      valid = false
    }

    setFormErr(errors)
    return valid
  }

  // Handles form submission for creating a new league.
  const onCreateHandler = async () => {
    if (!validateForm()) return

    const league = await createLeague(form, setForm, user, setUser, navigate, setLoading, setBackendErr)
    if (league) {
      navigate("/leagues", { state: { newLeagueId: league._id } })
    }
  }

  // Handles form submission for updating an existing league.
  const onUpdateHandler = async () => {
    if (!validateForm() || !editingLeague) return
    setLoading(true)

    // Build the update input — only include changed fields.
    const input: { name?: string; icon?: string; profile_picture?: string; maxChampionships?: number; inviteOnly?: boolean } = {}

    // Update name if changed.
    const newName = capitalise(form.name)
    if (newName !== editingLeague.name) {
      input.name = newName
    }

    // Update max championships if changed.
    if (form.maxChampionships !== editingLeague.settings.maxChampionships) {
      input.maxChampionships = form.maxChampionships
    }

    // Update invite-only setting if changed.
    if (form.inviteOnly !== (editingLeague.settings.inviteOnly ?? false)) {
      input.inviteOnly = form.inviteOnly
    }

    // Upload new icon if provided.
    if (form.icon instanceof File) {
      const iconURL = await uplaodS3("leagues", form.name, "icon", form.icon, setBackendErr)
      if (!iconURL) {
        setLoading(false)
        return
      }
      input.icon = iconURL
      setForm((prev) => ({ ...prev, icon: iconURL }))
    }

    // Upload new profile_picture if provided.
    if (form.profile_picture instanceof File) {
      const ppURL = await uplaodS3("leagues", form.name, "profile_picture", form.profile_picture, setBackendErr)
      if (!ppURL) {
        setLoading(false)
        return
      }
      input.profile_picture = ppURL
      setForm((prev) => ({ ...prev, profile_picture: ppURL }))
    }

    // Only call update if something changed.
    if (Object.keys(input).length === 0) {
      setLoading(false)
      navigate(-1)
      return
    }

    const updated = await updateLeagueSettings(
      editingLeague._id, input, user, setUser, navigate, setBackendErr
    )
    if (updated) {
      navigate(`/league/${editingLeague._id}`)
    }

    setLoading(false)
  }

  // Handles league deletion with name confirmation.
  const onDeleteHandler = async () => {
    if (!editingLeague || confirmDelete !== editingLeague.name) return
    setDelLoading(true)

    const success = await deleteLeague(
      editingLeague._id, confirmDelete, user, setUser, navigate, setBackendErr
    )
    if (success) {
      navigate("/leagues")
    }

    setDelLoading(false)
  }

  return (
    <>
      <div className="content-container create-league">
        <div className="create-league-title">
          <h4>{isEditing ? "Edit" : "Create"} League</h4>
          <Info className="info-icon" onClick={() => setShowInfo(true)} />
        </div>

        <DropZone
          form={form}
          setForm={setForm}
          formErr={formErr}
          setFormErr={setFormErr}
          backendErr={backendErr}
          setBackendErr={setBackendErr}
          thumbImg={isEditing ? editingLeague?.icon || false : false}
        />

        <TextField
          label="League Name"
          variant="filled"
          className="mui-form-el"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          error={!!formErr.name || hasBackendErr(["leagueName"], backendErr)}
          helperText={formErr.name || (hasBackendErr(["leagueName"], backendErr) ? backendErr.message : "")}
        />

        <Autocomplete
          options={sortedSeries}
          loading={seriesLoading}
          value={selectedSeries}
          getOptionLabel={(opt) => opt.name}
          getOptionDisabled={(opt) => !opt.rounds || opt.rounds <= 0}
          isOptionEqualToValue={(option, value) => option._id === value._id}
          renderOption={({ key, ...props }, option) => (
            <li key={key} {...props}>
              <SeriesOption series={option} disabled={!option.rounds || option.rounds <= 0} />
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="League Series"
              variant="filled"
              error={!!formErr.series}
              helperText={formErr.series}
            />
          )}
          onChange={(_, val) => {
            setSelectedSeries(val)
            setForm((prev) => ({ ...prev, series: val?._id || "" }))
          }}
          disabled={isEditing}
          className="mui-form-el"
        />

        <Autocomplete
          options={maxChampOptions}
          value={form.maxChampionships}
          getOptionLabel={(opt) => String(opt)}
          isOptionEqualToValue={(option, value) => option === value}
          renderInput={(params) => (
            <TextField {...params} label="Max Championships" variant="filled" />
          )}
          onChange={(_, val) => setForm((prev) => ({ ...prev, maxChampionships: val ?? 12 }))}
          className="mui-form-el"
        />

        <MUISwitch
          text="Invite Only"
          checked={form.inviteOnly}
          onChange={(value) => setForm((prev) => ({ ...prev, inviteOnly: value }))}
          fullWidth
        />

        {/* Delete confirmation section (edit mode only). */}
        {isEditing && canDelete && showDeleteConfirm && (
          <div className="create-league-delete-confirm">
            <p>Type &quot;{editingLeague?.name}&quot; to confirm deletion:</p>
            <TextField
              variant="filled"
              size="small"
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder={editingLeague?.name}
              className="mui-form-el"
            />
          </div>
        )}

        {backendErr.message && !hasBackendErr(["leagueName"], backendErr) && (
          <ErrorDisplay backendErr={backendErr} />
        )}
      </div>

      <ButtonBar
        background
        position="relative"
        buttons={[
          { label: "Back", onClick: () => navigate(-1), startIcon: <ArrowBack />, color: "inherit" },
          // Delete button shown only in edit mode for creator/admin.
          ...(isEditing && canDelete ? [{
            label: showDeleteConfirm ? "Confirm Delete" : "Delete",
            onClick: showDeleteConfirm ? onDeleteHandler : () => setShowDeleteConfirm(true),
            startIcon: <Delete />,
            color: "error" as const,
            loading: delLoading,
            disabled: showDeleteConfirm && confirmDelete !== editingLeague?.name,
          }] : []),
          {
            label: isEditing ? "Update" : "Create League",
            onClick: isEditing ? onUpdateHandler : onCreateHandler,
            loading,
            disabled: isEditing && !hasFormChanged(),
          },
        ]}
      />

      {showInfo && (
        <InfoModal
          title={tooltips.league.title}
          description={[...tooltips.league.description]}
          onClose={() => setShowInfo(false)}
        />
      )}
    </>
  )
}

export default CreateLeague
