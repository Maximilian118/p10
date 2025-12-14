import React from "react"
import { Route, Routes } from "react-router-dom"
import { userType } from './shared/localStorage'

import Notfound from "./page/NotFound"
import Home from './page/Home'
import Splash from './page/Splash'
import Login from './page/Login'
import Forgot from "./page/Forgot"
import Create from "./page/Create"
import Profile from "./page/Profile"
import Password from "./page/Password"
import PassSuccess from "./page/PassSuccess"
import Championships from "./page/Championships"
import CreateChamp from "./page/CreateChamp"
import Championship from "./page/Championship/Championship"
import UserProfile from "./page/UserProfile/UserProfile"
import Series from "./page/Series"
import CreateSeries from "./page/CreateSeries/CreateSeries"
import Drivers from "./page/Drivers"
import CreateDriver from "./page/CreateDriver/CreateDriver"
import Driver from "./page/Driver/Driver"
import Teams from "./page/Teams"
import CreateTeam from "./page/CreateTeam/CreateTeam"

interface routerType {
  user: userType,
}

const Router: React.FC<routerType> = ({ user }) => user.token ? (
  <Routes>
    <Route path="*" Component={Notfound}/>
    <Route path="/" Component={Home}/>
    <Route path="/profile" Component={Profile}/>
    <Route path="/profile/:id" Component={UserProfile}/>
    <Route path="/password" Component={Password}/>
    <Route path="/championships" Component={Championships}/>
    <Route path="/create-championship" Component={CreateChamp}/>
    <Route path="/championship/:id" Component={Championship}/>
    <Route path="/series" Component={Series}/>
    <Route path="/create-series" Component={CreateSeries}/>
    <Route path="/drivers" Component={Drivers}/>
    <Route path="/driver/:id" Component={Driver}/>
    <Route path="/create-driver" Component={CreateDriver}/>
    <Route path="/teams" Component={Teams}/>
    <Route path="/create-team" Component={CreateTeam}/>
  </Routes>
) : (
  <Routes>
    <Route path="*" Component={Notfound}/>
    <Route path="/" Component={Splash}/>
    <Route path="/login" Component={Login}/>
    <Route path="/forgot" Component={Forgot}/>
    <Route path="/create" Component={Create}/>
    <Route path="/pass-success" Component={PassSuccess}/>
  </Routes>
)

export default Router