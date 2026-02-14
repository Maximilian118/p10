import React from "react"
import './_tyreLaps.scss'

interface TyreLapsProps {
  lapsOld: number // The amount of laps ran on the current tyres
  lastPit?: number // The lap number on which the car changed tyres
  inPits?: boolean // Is the driver in the pits?
  DNS?: boolean // Did this driver start the race?
  DNF?: boolean // Is this driver out of the race?
  DSQ?: boolean // Was this driver disqualified?
}

const TyreLaps: React.FC<TyreLapsProps> = ({ lapsOld, lastPit, inPits, DNS, DNF, DSQ }) => {
  // Renders a status badge when the driver is inactive (DSQ/DNS/DNF/PIT).
  const renderStatus = () => {
    if (DSQ) return <h4 className="DSQ">DSQ</h4>
    if (DNS) return <h4 className="DNS">DNS</h4>
    if (DNF) return <h4 className="DNF">DNF</h4>
    if (inPits) return <h4 className="in-pits">PIT</h4>
    return null
  }

  const status = renderStatus()

  return (
    <div className="tyre-laps">
      {status || (
        <>
          <h4 className="laps-old">{`L ${lapsOld}`}</h4>
          <h5 className="last-pit">{lastPit !== undefined ? `PIT ${lastPit}` : "NO PIT"}</h5>
        </>
      )}
    </div>
  )
}

export default TyreLaps
