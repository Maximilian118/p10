import React from "react"
import NavItem from './navItem/NavItem'
import UserIcon from "../utility/userIcon/UserIcon"
import { userType } from "../../shared/localStorage"
import { navLeft } from './NavUtility'

interface navType {
  user: userType,
}

const Nav: React.FC<navType> = ({ user }) => (
  <nav>
    <div className="nav-left">
      {navLeft.map((item, i) => (<NavItem key={i} item={item}/>))}
    </div>
    <UserIcon user={user} style={{ marginRight: 20 }}/>
  </nav>
)


export default Nav