import React, { useContext, useEffect, useState } from "react"
import { champType } from "../shared/types"
import Search from "../components/utility/search/Search"
import AddButton from "../components/utility/button/addButton/AddButton"
import { useNavigate } from "react-router-dom"
import AppContext from "../context"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { getChamps } from "../shared/requests/champRequests"
import ErrorDisplay from "../components/utility/errorDisplay/ErrorDisplay"
import FillLoading from "../components/utility/fillLoading/FillLoading"
import ChampCard from "../components/cards/champCard/ChampCard"

const Championships: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ champs, setChamps ] = useState<champType[]>([])
  const [ search, setSearch ] = useState<champType[]>([])
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)

  const navigate = useNavigate()

  // Fetch all championships on mount.
  useEffect(() => {
    getChamps(setChamps, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initialize search state when champs data loads.
  useEffect(() => {
    setSearch(champs)
  }, [champs])

  const renderChampsList = () => {
    if (loading) {
      return <FillLoading/>
    }

    if (backendErr.message) {
      return <ErrorDisplay backendErr={backendErr}/> 
    }

    return (
      search.map((c, i) => (
        <ChampCard
          key={i}
          champ={c}
          onClick={() => navigate(`/championship/${c._id}`)}
        />
      ))
    )
  }

  return (
    <div className="content-container">
      <Search
        original={champs}
        setSearch={setSearch}
      />
      {renderChampsList()}
      <AddButton
        onClick={() => navigate("/create-championship")}
        absolute
      />
    </div>
  )
}

export default Championships
