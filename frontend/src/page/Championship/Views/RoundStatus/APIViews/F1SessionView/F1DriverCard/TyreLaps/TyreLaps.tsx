import React from "react"
import './_tyreLaps.scss'

interface TyreLapsProps {
  lapsOld: number // The amount of laps ran on the current tyres
  lastPit?: number // The lap number on which the car changed tyres
}

const TyreLaps: React.FC<TyreLapsProps> = ({ lapsOld, lastPit }) => {
  return (
    <div className="tyre-laps">
      <h4 className="laps-old">{`L ${lapsOld}`}</h4>
      {lastPit && <h5 className="last-pit">{`PIT ${lastPit}`}</h5>}
    </div>
  )
}

export default TyreLaps
