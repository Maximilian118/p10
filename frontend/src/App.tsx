import React, { useEffect, useState } from 'react'
import AppContext from './context'
import './scss/base.scss'
import { userType, checkUserLS } from './shared/localStorage'
import Footer from './components/footer/Footer'
import Nav from './components/nav/Nav'
import Router from './Router'
import { CircularProgress } from '@mui/material'
import { preloadFormImgs } from './shared/utility'
import { useLocation } from 'react-router-dom'
import { useNotificationSocket } from './shared/hooks/useNotificationSocket'

// Inner component that uses notification socket hook (requires context).
const AppContent: React.FC<{ user: userType }> = ({ user }) => {
  const location = useLocation()

  // Listen for real-time notification updates.
  useNotificationSocket()

  useEffect(() => {
    if (!user.token) preloadFormImgs(location)
  }, [user.token, location])

  return (
    <>
      <main className={user.token ? "main-logged-in" : undefined}>
        {user.token && <Nav user={user}/>}
        <Router user={user}/>
      </main>
      <Footer/>
    </>
  )
}

const App: React.FC = () => {
  const [ user, setUser ] = useState<userType>(checkUserLS())
  const [ loading, setLoading ] = useState<boolean>(false)

  return (
    <AppContext.Provider value={{ loading, setLoading, user, setUser }}>
      {loading ? <CircularProgress/> : <AppContent user={user}/>}
    </AppContext.Provider>
  )
}

export default App
