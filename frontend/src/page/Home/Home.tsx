import React, { useCallback, useContext, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./_home.scss"
import AppContext from "../../context"
import { FloatingChampType, LeagueType } from "../../shared/types"
import { SocialEventType } from "../../shared/socialTypes"
import { getMyTopChampionship } from "../../shared/requests/champRequests"
import { getMyTopLeague } from "../../shared/requests/leagueRequests"
import { getFeed, updateLocation } from "../../shared/requests/socialRequests"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { useInfiniteScroll } from "../../shared/hooks/useInfiniteScroll"
import { useGeolocation } from "../../shared/hooks/useGeolocation"
import FloatingChampCard from "../../components/cards/floatingChampCard/FloatingChampCard"
import FloatingLeagueCard from "../../components/cards/floatingLeagueCard/FloatingLeagueCard"
import SocialEventCard from "../../components/cards/socialEventCard/SocialEventCard"
import FillLoading from "../../components/utility/fillLoading/FillLoading"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import Prompt from "../../components/utility/prompt/Prompt"
import { CircularProgress } from "@mui/material"
import LocationOnIcon from "@mui/icons-material/LocationOn"

const FEED_PAGE_SIZE = 20

const Home: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [floatingChamp, setFloatingChamp] = useState<FloatingChampType | null>(null)
  const [floatingLeague, setFloatingLeague] = useState<LeagueType | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)

  // Social feed state.
  const [events, setEvents] = useState<SocialEventType[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [feedLoading, setFeedLoading] = useState<boolean>(false)

  // Location prompt state.
  const [showLocationPrompt, setShowLocationPrompt] = useState<boolean>(false)
  const [locationLoading, setLocationLoading] = useState<boolean>(false)
  const { requestLocation } = useGeolocation()

  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load the next page of feed events.
  const loadMore = useCallback(async () => {
    if (feedLoading || !nextCursor) return
    setFeedLoading(true)

    const result = await getFeed(nextCursor, FEED_PAGE_SIZE, user, setUser, navigate, setBackendErr)

    if (result) {
      setEvents(prev => [...prev, ...result.events])
      setNextCursor(result.nextCursor)
    }

    setFeedLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedLoading, nextCursor])

  // Infinite scroll sentinel — triggers 300px before reaching the bottom for seamless loading.
  const sentinelRef = useInfiniteScroll({
    hasMore: !!nextCursor,
    loading: feedLoading,
    onLoadMore: loadMore,
    root: scrollRef,
    rootMargin: "0px 0px 300px 0px",
  })

  // Fetch all home page data on mount.
  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true)

      // Fetch champ, league, and initial feed in parallel.
      const [topChamp, feedResult, topLeague] = await Promise.all([
        getMyTopChampionship(user, setUser),
        getFeed(null, FEED_PAGE_SIZE, user, setUser, navigate, setBackendErr),
        getMyTopLeague(user, setUser),
      ])

      setFloatingChamp(topChamp)
      setFloatingLeague(topLeague)

      if (feedResult) {
        setEvents(feedResult.events)
        setNextCursor(feedResult.nextCursor)
      }

      // Show location prompt if no location set and not previously dismissed.
      const locationDismissed = localStorage.getItem("locationDismissed")
      if (!user.location?.country && !locationDismissed) {
        setShowLocationPrompt(true)
      }

      setLoading(false)
    }
    fetchHomeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle enabling location.
  const handleEnableLocation = async () => {
    setLocationLoading(true)
    const locationData = await requestLocation()

    if (locationData) {
      await updateLocation(locationData, user, setUser, navigate, setBackendErr)
    }

    setShowLocationPrompt(false)
    setLocationLoading(false)
  }

  // Handle dismissing the location prompt.
  const handleDismissLocation = () => {
    localStorage.setItem("locationDismissed", "true")
    setShowLocationPrompt(false)
  }

  // Render loading state.
  if (loading) {
    return (
      <div className="content-container home-container">
        <FillLoading />
      </div>
    )
  }

  // Render error state.
  if (backendErr.message) {
    return (
      <div className="content-container home-container">
        <ErrorDisplay backendErr={backendErr} />
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="content-container home-container">
      {/* Top championship card. */}
      {floatingChamp && (
        <FloatingChampCard
          champ={floatingChamp}
          onClick={() => navigate(`/championship/${floatingChamp._id}`)}
        />
      )}

      {/* Top league card. */}
      {floatingLeague && (
        <FloatingLeagueCard
          league={floatingLeague}
          onClick={() => navigate(`/league/${floatingLeague._id}`)}
        />
      )}

      {/* Location prompt banner. */}
      {showLocationPrompt && (
        <Prompt
          text="Enable location to see events from nearby users"
          icon={<LocationOnIcon />}
          buttonText="Enable"
          buttonOnClick={handleEnableLocation}
          buttonLoading={locationLoading}
          onDismiss={handleDismissLocation}
        />
      )}

      {/* Social feed. */}
      <div className="social-feed">
        {events.map(event => (
          <SocialEventCard key={event._id} event={event} />
        ))}

        {/* Feed loading indicator. */}
        {feedLoading && (
          <div className="social-feed__loading">
            <CircularProgress size={28} />
          </div>
        )}

        {/* Empty feed message. */}
        {!feedLoading && events.length === 0 && (
          <div className="social-feed__empty">
            <p>No events yet. Follow other users to see their activity here.</p>
          </div>
        )}

        {/* Infinite scroll sentinel. */}
        <div ref={sentinelRef} className="social-feed__sentinel" />
      </div>
    </div>
  )
}

export default Home
