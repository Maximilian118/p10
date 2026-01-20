import React, { useEffect, useState } from "react"
import "./_seriesPicker.scss"
import { seriesType } from "../../../shared/types"
import { getSeries } from "../../../shared/requests/seriesRequests"
import { userType } from "../../../shared/localStorage"
import { useNavigate } from "react-router-dom"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import CreateSeries from "../../../page/CreateSeries/CreateSeries"
import { initSeries } from "../../../shared/init"
import SeriesListCard from "../../cards/seriesListCard/SeriesListCard"
import { sortAlphabetically } from "../../../shared/utility"
import Search from "../search/Search"
import ButtonBar from "../buttonBar/ButtonBar"
import AddButton from "../button/addButton/AddButton"
import { canEditSeries } from "./seriesEdit/seriesUtility"
import FillLoading from "../fillLoading/FillLoading"

interface seriesPickerFormErr {
  series: string
  [key: string]: string | number
}

interface seriesPickerType<T, E extends seriesPickerFormErr> {
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  formErr?: E
  setFormErr?: React.Dispatch<React.SetStateAction<E>>
  seriesList: seriesType[]
  setSeriesList: React.Dispatch<React.SetStateAction<seriesType[]>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
}

// Component for picking a series for a championship.
const SeriesPicker = <T extends { series: seriesType | null }, E extends seriesPickerFormErr>({
  form,
  setForm,
  setFormErr,
  seriesList,
  setSeriesList,
  user,
  setUser,
  backendErr,
  setBackendErr,
}: seriesPickerType<T, E>) => {
  const [ isEdit, setIsEdit ] = useState<boolean>(false)
  const [ series, setSeries ] = useState<seriesType>(initSeries(user))
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ reqSent, setReqSent ] = useState<boolean>(false)
  const [ search, setSearch ] = useState<seriesType[]>([])
  const [ selected, setSelected ] = useState<string>(form.series ? form.series._id! : "")

  const navigate = useNavigate()

  // Fetch all series on mount.
  useEffect(() => {
    if (seriesList.length === 0 && !reqSent) {
      getSeries(setSeriesList, user, setUser, navigate, setLoading, setBackendErr)
      setReqSent(true)
    }
  }, [navigate, user, setUser, seriesList, setSeriesList, setBackendErr, form, reqSent])

  // Sort alphabetically, then move selected series to the top.
  const sortedSeries = sortAlphabetically(search ? search : seriesList)
  const orderedSeries = selected
    ? [
        ...sortedSeries.filter(s => s._id === selected),
        ...sortedSeries.filter(s => s._id !== selected),
      ]
    : sortedSeries

  // Handle series created/updated from embedded CreateSeries.
  const handleSeriesSuccess = (newSeries: seriesType) => {
    // Update series list - either add new or update existing.
    const exists = seriesList.some(s => s._id === newSeries._id)
    if (exists) {
      setSeriesList(prev => prev.map(s => s._id === newSeries._id ? newSeries : s))
    } else {
      setSeriesList(prev => [newSeries, ...prev])
    }

    // Auto-select the new/updated series.
    setSelected(newSeries._id!)
    setForm(prev => ({ ...prev, series: newSeries }))

    // Clear any series validation error.
    if (setFormErr) {
      setFormErr(prev => ({ ...prev, series: "" }))
    }

    // Reset edit state.
    setIsEdit(false)
    setSeries(initSeries(user))
  }

  // Handle back from embedded CreateSeries.
  const handleSeriesBack = () => {
    setIsEdit(false)
    setSeries(initSeries(user))
  }

  // Render CreateSeries when in edit mode.
  if (isEdit) {
    return (
      <CreateSeries
        embedded
        initialSeries={series._id ? series : null}
        onSuccess={handleSeriesSuccess}
        onBack={handleSeriesBack}
        setParentSeriesList={setSeriesList}
      />
    )
  }

  return (
    <div className="series-picker">
      <Search
        original={seriesList}
        setSearch={setSearch}
        label="Search Series"
      />
      <div className="series-list-container">
        {loading ?
          <FillLoading/> :
          seriesList.length > 0 ?
          <div className="series-list">
            {orderedSeries.map((seriesItem: seriesType, i: number) => {
              const isSelected = seriesItem._id === selected
              return (
                <SeriesListCard
                  key={seriesItem._id || i}
                  series={seriesItem}
                  selected={isSelected}
                  canEdit={!!canEditSeries(seriesItem, user)}
                  onEditClicked={() => {
                    setSeries(seriesItem)
                    setIsEdit(true)
                  }}
                  onClick={isSelected ? undefined : () => {
                    setSelected(seriesItem._id!)
                    setForm(prevForm => ({
                      ...prevForm,
                      series: seriesItem,
                    }))
                    // Clear any series validation error.
                    if (setFormErr) {
                      setFormErr(prev => ({ ...prev, series: "" }))
                    }
                  }}
                />
              )
            })}
          </div> :
          <div className="series-empty">
            {backendErr.message ?
              <p className="series-error">{backendErr.message}</p> :
              <p>No Series found... That may be a problem.</p>
            }
          </div>
        }
      </div>
      <ButtonBar position="sticky">
        <AddButton onClick={() => setIsEdit(true)} />
      </ButtonBar>
    </div>
  )
}

export default SeriesPicker
