import React, { useEffect, useState } from "react"
import "./_seriesPicker.scss"
import { seriesType } from "../../../shared/types"
import { getSeries } from "../../../shared/requests/seriesRequests"
import { userType } from "../../../shared/localStorage"
import { useNavigate } from "react-router-dom"
import { graphQLErrorType } from "../../../shared/requests/requestsUtility"
import SeriesEdit from "./seriesEdit/SeriesEdit"
import { initSeries } from "../../../shared/init"
import SeriesCard from "../../cards/seriesCard/SeriesCard"
import { sortAlphabetically } from "../../../shared/utility"
import Search from "../search/Search"
import AddButton from "../button/addButton/AddButton"
import { canEditSeries } from "./seriesEdit/seriesUtility"
import FillLoading from "../fillLoading/FillLoading"

interface seriesPickerType<T> {
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  seriesList: seriesType[] // all series from backend.
  setSeriesList: React.Dispatch<React.SetStateAction<seriesType[]>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  backendErr: graphQLErrorType
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  stepperBtns?: JSX.Element
  style?: React.CSSProperties
}

// Component for picking a series for a championship.
const SeriesPicker = <T extends { series: seriesType | null }>({
  form,
  setForm,
  seriesList,
  setSeriesList,
  user,
  setUser,
  backendErr,
  setBackendErr,
  stepperBtns,
  style,
}: seriesPickerType<T>) => {
  const [ isEdit, setIsEdit ] = useState<boolean>(false) // Render SeriesEdit or not.
  const [ series, setSeries ] = useState<seriesType>(initSeries(user)) // If we're editing a series rather than making a new one, populate.
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ reqSent, setReqSent ] = useState<boolean>(false)
  const [ search, setSearch ] = useState<seriesType[]>([])
  const [ selected, setSelected ] = useState<string>(form.series ? form.series._id! : "") // The Series that's currently selected.

  const navigate = useNavigate()

  useEffect(() => {
    if (seriesList.length === 0 && !reqSent) {
      getSeries(setSeriesList, user, setUser, navigate, setLoading, setBackendErr)
      setReqSent(true)
    }
  }, [navigate, user, setUser, seriesList, setSeriesList, setBackendErr, form, reqSent])

  const sortedSeries = sortAlphabetically(search ? search : seriesList) // All of the available series.
  const selectedSeries = sortedSeries.find(s => s._id === selected) // find the single selected series from the array.

  return isEdit ?
    <SeriesEdit
      setForm={setForm}
      user={user}
      setUser={setUser}
      setIsEdit={setIsEdit}
      series={series}
      setSeries={setSeries}
      seriesList={seriesList}
      setSeriesList={setSeriesList}
      setSelected={setSelected}
      style={style}
    /> : (
    <div className="series-picker" style={style}>
      <Search
        original={seriesList}
        setSearch={setSearch}
      />
      <div className="series-list-container">
        {selectedSeries && ( // If a series has been selected, display that series at the top of the page.
          <SeriesCard
            selected
            series={selectedSeries}
            canEdit={!!canEditSeries(selectedSeries, user)}
            onEditClicked={() => {
              setSeries(selectedSeries)
              setIsEdit(!isEdit)
            }}
          />
        )}
        {loading ?
          <FillLoading/> :
          seriesList.length > 0 ?
          <div className="series-list">
            {sortedSeries
              .filter(s => s._id !== selected) // Remove the selected series from the array.
              .map((seriesItem: seriesType, i: number) => // Map through all of the series available.
              <SeriesCard
                key={i}
                series={seriesItem}
                canEdit={!!canEditSeries(seriesItem, user)}
                onEditClicked={() => {
                  setSeries(seriesItem)
                  setIsEdit(!isEdit)
                }}
                onClick={() => {
                  setSelected(seriesItem._id!)
                  setForm(prevForm => {
                    return {
                      ...prevForm,
                      series: seriesItem,
                    }
                  })
                }}
              />
            )}
          </div> :
          <div className="series-empty">
            {backendErr.message ?
              <p className="series-error">{backendErr.message}</p> :
              <p>No Series found... That may be a problem.</p>
            }
          </div>
        }
      </div>
      <AddButton
        style={style}
        onClick={() => setIsEdit(!isEdit)}
        absolute
      />
      {stepperBtns}
    </div>
  )
}

export default SeriesPicker
