import React, { useContext, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AppContext from "../context"
import { FloatingChampType } from "../shared/types"
import { getMyTopChampionship } from "../shared/requests/champRequests"
import FloatingChampCard from "../components/cards/floatingChampCard/FloatingChampCard"
import FillLoading from "../components/utility/fillLoading/FillLoading"

const Home: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [floatingChamp, setFloatingChamp] = useState<FloatingChampType | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const navigate = useNavigate()

  // Fetch all home page data on mount.
  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true)

      // Fetch all home page data in parallel.
      const [topChamp] = await Promise.all([
        getMyTopChampionship(user, setUser),
      ])

      setFloatingChamp(topChamp)
      setLoading(false)
    }
    fetchHomeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="content-container home-container">
        <FillLoading />
      </div>
    )
  }

  return (
    <div className="content-container home-container">
      {floatingChamp && (
        <FloatingChampCard
          champ={floatingChamp}
          onClick={() => navigate(`/championship/${floatingChamp._id}`)}
        />
      )}
    </div>
  )
}

export default Home
