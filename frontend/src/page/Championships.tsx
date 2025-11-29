import React, { useEffect, useState } from "react"
import { champType } from "../shared/types"
import Search from "../components/utility/search/Search"
import AddButton from "../components/utility/button/addButton/AddButton"
import { useNavigate } from "react-router-dom"

const Championships: React.FC = props => {
  const [ champs, setChamps ] = useState<champType[]>([])
  const [ search, setSearch ] = useState<champType[]>([])

  useEffect(() => {
    // retrieve all open championships and setChamps.
  }, [])

  const navigate = useNavigate()

  return (
    <div className="content-container">
      <Search
        original={champs}
        setSearch={setSearch}
      />
      <AddButton
        onClick={() => navigate("/create-championship")}
        absolute
      />
    </div>
  )
}

export default Championships
