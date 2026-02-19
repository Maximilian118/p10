import React from "react"
import './_tyreLaps.scss'

interface TyreLapsProps {
  lapsOld: number // The amount of laps ran on the current tyres
  lastPit?: number // The lap number on which the car changed tyres
  DRS?: boolean // Is DRS active for the driver?
  inPits?: boolean // Is the driver in the pits?
  DNS?: boolean // Did this driver start the race?
  DNF?: boolean // Is this driver out of the race?
  DSQ?: boolean // Was this driver disqualified?
}

const TyreLaps: React.FC<TyreLapsProps> = ({ lapsOld, lastPit, DRS, inPits, DNS, DNF, DSQ }) => {
  // Renders a status badge when the driver is inactive (DSQ/DNS/DNF/PIT).
  const renderStatus = () => {
    if (DSQ) return <h4 className="DSQ">DSQ</h4>
    if (DNS) return <h4 className="DNS">DNS</h4>
    if (DNF) return <h4 className="DNF">DNF</h4>
    if (inPits) return <h4 className="in-pits">PIT</h4>
    return null
  }

  // Renders the pit stop info or a red DRS indicator when DRS is active.
  const renderPitLabel = () => {
    if (DRS) return <h5 className="last-pit drs">DRS</h5>
    return <h5 className="last-pit">{lastPit !== undefined ? `PIT ${lastPit}` : "NO PIT"}</h5>
  }

  const status = renderStatus()

  return (
    <div className="tyre-laps">
      {status || (
        <>
          <h4 className="laps-old">{`L ${lapsOld}`}</h4>
          {renderPitLabel()}
        </>
      )}
    </div>
  )
}

export default TyreLaps
