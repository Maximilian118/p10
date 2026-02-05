import React from "react"
import { useNavigate } from "react-router-dom"
import "./Splash.scss"

/* Splash landing page with login navigation */
const Splash: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="content-container splash-container" onClick={() => navigate("/login")}>
      <div className="form-container">
        <div className="form-title splash-title">
          <h2>P10</h2>
          <h2 className="go-to-login">Go to Login</h2>
        </div>
        <img
          src="https://p10-game.s3.eu-west-2.amazonaws.com/assets/f1-car2.jpeg"
          alt="An old Formula 1 car."
          className="form-background splash-background"
        />
      </div>
    </div>
  )
}

export default Splash
