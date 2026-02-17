import React from "react"
import "./_f1DriverCard.scss"
import { driverType } from "../../../../../../../shared/types"
import { DriverLiveState } from "../../../../../../../api/openAPI/types"
import { AcceptedSegments, formatLapTime, timingColorValue } from "../../../../../../../api/openAPI/openF1Utility"
import ImageIcon from "../../../../../../../components/utility/icon/imageIcon/ImageIcon"
import TyreCompound from "./TyreCompound/TyreCompound"
import TyreLaps from "./TyreLaps/TyreLaps"
import MiniSectors from "./MiniSectors/MiniSectors"

interface F1DriverCardProps {
  state: DriverLiveState
  champDriver?: driverType
  selected?: boolean
  onClick?: () => void
  pillSegments?: AcceptedSegments
}

// Displays a driver card with their icon image from the championship driver data.
// Falls back to the OpenF1 headshot URL if no championship match is found.
const F1DriverCard: React.FC<F1DriverCardProps> = ({ state, champDriver, selected, onClick, pillSegments }) => {
  // Use championship driver icon if available, otherwise fall back to OpenF1 headshot.
  const useOwnImage = !!champDriver?.icon
  const imageUrl = champDriver?.icon || state.headshotUrl || ""

  // Lap number on which the driver changed to current tyres (only if they've pitted).
  const lastPitLap = state.pitStops > 0 ? state.currentLapNumber - state.tyreAge : undefined

  const className = `f1-driver-card${selected ? " f1-driver-card--selected" : ""}`

  return (
    <div className={className} onClick={onClick}>
      <div className="driver-image-wrapper">
        <ImageIcon
          src={imageUrl}
          size="contained"
          imageSize={120}
          background={`#${state.teamColour}`}
          offsetHeight={useOwnImage ? undefined : -8}
          fallBack={{ text: state.driverNumber, textColor: `#FFFFFF`, backgroundColor: `#${state.teamColour}` }}
        />
      </div>
      <h5 className="driver-id">{state.nameAcronym}</h5>
      <TyreCompound compound={state.tyreCompound} style={{ marginRight: 3 }}/>
      <TyreLaps lapsOld={state.tyreAge} lastPit={lastPitLap} inPits={state.inPit} DNF={state.retired}/>
      <div className="timing-info">
        <MiniSectors segments={state.segments} currentLapNumber={state.currentLapNumber} acceptedSegments={pillSegments}/>
        <div className="timing-stats">
          <h5>{state.interval}</h5>
          <h5 style={{ color: timingColorValue(state.lastLapTime.color) }}>{formatLapTime(state.lastLapTime.value)}</h5>
          <h5 style={{ color: timingColorValue(state.bestLapTime.color) }}>{formatLapTime(state.bestLapTime.value)}</h5>
        </div>
      </div>
    </div>
  )
}

export default F1DriverCard
