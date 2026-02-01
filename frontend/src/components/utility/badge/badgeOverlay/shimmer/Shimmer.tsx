import React from "react"
import './_shimmer.scss'

const Shimmer: React.FC<{ style?: React.CSSProperties }> = ({ style }) => <div className="shimmer" style={style}/>

export default React.memo(Shimmer)
