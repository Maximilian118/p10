import React, { useEffect, useState, useContext } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Button, CircularProgress } from "@mui/material"
import AppContext from "../../context"
import { confirmEmailChange } from "../../shared/requests/userRequests"
import "./_VerifyEmail.scss"

// Handles email verification when user clicks the link from their email.
const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const navigate = useNavigate()
  const { user, setUser } = useContext(AppContext)

  const [loading, setLoading] = useState<boolean>(true)
  const [success, setSuccess] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Automatically verify when component mounts with a token.
  useEffect(() => {
    if (token) {
      confirmEmailChange(token, user, setUser, navigate, setLoading, setError, setSuccess)
    } else {
      setError("No verification token provided.")
      setLoading(false)
    }
    // Only run on token change (mount-time verification).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="content-container" style={{ background: "white" }}>
      <div className="form-container verify-email-container">
        <div className="form-title">
          <h2 style={{ marginBottom: 40 }}>Email Verification</h2>
        </div>

        {loading && (
          <div className="verify-email-status">
            <CircularProgress size={40} />
            <p>Verifying your email...</p>
          </div>
        )}

        {success && (
          <div className="verify-email-status success">
            <p>Your email has been verified successfully!</p>
            <p>Redirecting to your profile...</p>
          </div>
        )}

        {error && (
          <div className="verify-email-status error">
            <p>{error}</p>
            <Button
              variant="contained"
              style={{ marginTop: 20 }}
              onClick={() => navigate("/profile")}
            >
              Go to Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail
