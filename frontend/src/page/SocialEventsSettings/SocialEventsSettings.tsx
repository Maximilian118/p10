import React, { useContext, useState } from "react"
import "./_socialEventsSettings.scss"
import { useNavigate } from "react-router-dom"
import AppContext from "../../context"
import { SocialEventSettingsType } from "../../shared/localStorage"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { updateSocialEventSettings } from "../../shared/requests/socialRequests"
import MUISwitch from "../../components/utility/muiSwitch/MUISwitch"
import ErrorDisplay from "../../components/utility/errorDisplay/ErrorDisplay"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import { ArrowBack } from "@mui/icons-material"

// Social events privacy settings page - controls which activities generate public feed items.
const SocialEventsSettings: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [backendErr, setBackendErr] = useState<graphQLErrorType>(initGraphQLError)
  const navigate = useNavigate()

  // Handle toggle for a social event setting.
  const handleToggle = async (key: keyof SocialEventSettingsType, value: boolean) => {
    await updateSocialEventSettings({ [key]: value }, user, setUser, navigate, setBackendErr)
  }

  // Render error state.
  if (backendErr.message) {
    return (
      <div className="content-container">
        <ErrorDisplay backendErr={backendErr} />
      </div>
    )
  }

  return (
    <div className="content-container social-events-settings">
      <div className="form-title-logged-in">
        <h2>Social Events</h2>
      </div>
      <p className="description">
        Social Events are public feed items that appear on other users' Home pages when you achieve something noteworthy. Use these toggles to control which of your activities are shared.
      </p>

      <h3 className="section-title">Badges</h3>
      <div className="switches">
        <MUISwitch
          text="Epic badge earned"
          fullWidth
          checked={user.socialEventSettings?.badge_earned_epic ?? true}
          onChange={(value) => handleToggle("badge_earned_epic", value)}
        />
        <MUISwitch
          text="Legendary badge earned"
          fullWidth
          checked={user.socialEventSettings?.badge_earned_legendary ?? true}
          onChange={(value) => handleToggle("badge_earned_legendary", value)}
        />
        <MUISwitch
          text="Mythic badge earned"
          fullWidth
          checked={user.socialEventSettings?.badge_earned_mythic ?? true}
          onChange={(value) => handleToggle("badge_earned_mythic", value)}
        />
      </div>

      <h3 className="section-title">Championships</h3>
      <div className="switches">
        <MUISwitch
          text="Joined a championship"
          fullWidth
          checked={user.socialEventSettings?.champ_joined ?? true}
          onChange={(value) => handleToggle("champ_joined", value)}
        />
        <MUISwitch
          text="Created a championship"
          fullWidth
          checked={user.socialEventSettings?.champ_created ?? true}
          onChange={(value) => handleToggle("champ_created", value)}
        />
        <MUISwitch
          text="Won a season"
          fullWidth
          checked={user.socialEventSettings?.season_won ?? true}
          onChange={(value) => handleToggle("season_won", value)}
        />
        <MUISwitch
          text="Runner-up in season"
          fullWidth
          checked={user.socialEventSettings?.season_runner_up ?? true}
          onChange={(value) => handleToggle("season_runner_up", value)}
        />
      </div>

      <h3 className="section-title">Rounds</h3>
      <div className="switches">
        <MUISwitch
          text="Won a round"
          fullWidth
          checked={user.socialEventSettings?.round_won ?? true}
          onChange={(value) => handleToggle("round_won", value)}
        />
        <MUISwitch
          text="Perfect bet (exact P10)"
          fullWidth
          checked={user.socialEventSettings?.round_perfect_bet ?? false}
          onChange={(value) => handleToggle("round_perfect_bet", value)}
        />
      </div>

      <h3 className="section-title">Milestones</h3>
      <div className="switches">
        <MUISwitch
          text="Win streak (3+ rounds)"
          fullWidth
          checked={user.socialEventSettings?.win_streak ?? true}
          onChange={(value) => handleToggle("win_streak", value)}
        />
        <MUISwitch
          text="Points milestone"
          fullWidth
          checked={user.socialEventSettings?.points_milestone ?? true}
          onChange={(value) => handleToggle("points_milestone", value)}
        />
        <MUISwitch
          text="Rounds milestone"
          fullWidth
          checked={user.socialEventSettings?.rounds_milestone ?? false}
          onChange={(value) => handleToggle("rounds_milestone", value)}
        />
      </div>

      <h3 className="section-title">Community</h3>
      <div className="switches">
        <MUISwitch
          text="Joined the platform"
          fullWidth
          checked={user.socialEventSettings?.user_joined_platform ?? true}
          onChange={(value) => handleToggle("user_joined_platform", value)}
        />
        <MUISwitch
          text="Promoted to adjudicator"
          fullWidth
          checked={user.socialEventSettings?.adjudicator_promoted ?? true}
          onChange={(value) => handleToggle("adjudicator_promoted", value)}
        />
      </div>

      <ButtonBar leftButtons={[
        { label: "Back", onClick: () => navigate("/settings"), startIcon: <ArrowBack />, color: "inherit" },
      ]} />
    </div>
  )
}

export default SocialEventsSettings
