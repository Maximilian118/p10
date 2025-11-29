import React from "react"
import { useNavigate } from "react-router-dom"

const Splash: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="content-container">
      <div className="form-container">
        <img 
          src="https://p10-game.s3.eu-west-2.amazonaws.com/assets/f1-car2.jpeg"
          alt="An old Formula 1 car." 
          className="form-background"
          style={{ top: 40, left: 0 }}
        />
        <div className="form-title" style={{ marginBottom: 200 }}>
          <h2 style={{ marginBottom: 10 }}>P10</h2>
          <h2 className="clickable" onClick={() => navigate("/login")}>Go to Login</h2>
        </div>
      </div>
    </div>
  )
}

export default Splash
