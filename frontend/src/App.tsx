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

const App: React.FC = () => {
  const [ user, setUser ] = useState<userType>(checkUserLS())
  const [ loading, setLoading ] = useState<boolean>(false)

  const location = useLocation()

  useEffect(() => {
    if (!user.token) preloadFormImgs(location)
  }, [user.token, location])

  return (
    <AppContext.Provider value={{ loading, setLoading, user, setUser }}>
      <main className={user.token && "main-logged-in"}>
        {user.token && <Nav user={user}/>}
        {loading ? <CircularProgress/> : <Router user={user}/>}
      </main>
      <Footer/>
    </AppContext.Provider>
  )
}

export default App
