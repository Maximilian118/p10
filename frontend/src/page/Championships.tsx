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

  // just logging her for now before we add search logic to satisfy unused var
  console.log(search)

  // Fetch all championships for the user on mount.
  useEffect(() => {
    getChamps(setChamps, user, setUser, navigate, setLoading, setBackendErr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderChampsList = () => {
    if (loading) {
      return <FillLoading/>
    }

    if (backendErr.message) {
      return <ErrorDisplay backendErr={backendErr}/> 
    }

    return (
      champs.map((c, i) => (
        <ChampCard 
          key={i}
          champ={c}
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
