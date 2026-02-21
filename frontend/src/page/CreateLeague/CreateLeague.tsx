import React, { useContext, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { TextField, Autocomplete } from "@mui/material"
import AppContext from "../../context"
import { seriesType } from "../../shared/types"
import { graphQLErrorType, initGraphQLError, hasBackendErr } from "../../shared/requests/requestsUtility"
import { getSeries } from "../../shared/requests/seriesRequests"
import { createLeague, CreateLeagueFormType } from "../../shared/requests/leagueRequests"
import DropZone from "../../components/utility/dropZone/DropZone"
import { ArrowBack, Info } from "@mui/icons-material"
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

// Page for creating a new league.
const CreateLeague: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const navigate = useNavigate()

  const [loading, setLoading] = useState<boolean>(false)
  const [seriesLoading, setSeriesLoading] = useState<boolean>(false)
  const [showInfo, setShowInfo] = useState<boolean>(false)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const [formErr, setFormErr] = useState<CreateLeagueFormErrType>(initFormErr)

  // All series available for selection.
  const [seriesList, setSeriesList] = useState<seriesType[]>([])

  const [form, setForm] = useState<CreateLeagueFormType>({
    name: "",
    icon: null,
    profile_picture: null,
    series: "",
    maxChampionships: 12,
  })

  // Selected series object for the Autocomplete.
  const [selectedSeries, setSelectedSeries] = useState<seriesType | null>(null)

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

    if (!form.icon || !form.profile_picture) {
      errors.dropzone = "Please upload a league image."
      valid = false
    }

    setFormErr(errors)
    return valid
  }

  // Handles form submission.
  const onSubmitHandler = async () => {
    if (!validateForm()) return

    const league = await createLeague(form, setForm, user, setUser, navigate, setLoading, setBackendErr)
    if (league) {
      navigate("/leagues", { state: { newLeagueId: league._id } })
    }
  }

  return (
    <>
      <div className="content-container create-league">
        <div className="create-league-title">
          <h4>Create League</h4>
          <Info className="info-icon" onClick={() => setShowInfo(true)} />
        </div>

        <DropZone
          form={form}
          setForm={setForm}
          formErr={formErr}
          setFormErr={setFormErr}
          backendErr={backendErr}
          setBackendErr={setBackendErr}
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

        {backendErr.message && !hasBackendErr(["leagueName"], backendErr) && (
          <ErrorDisplay backendErr={backendErr} />
        )}
      </div>

      <ButtonBar
        background
        position="relative"
        buttons={[
          { label: "Back", onClick: () => navigate(-1), startIcon: <ArrowBack />, color: "inherit" },
          { label: "Create League", onClick: onSubmitHandler, loading },
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
