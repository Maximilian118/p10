import userResolvers from "./userResolvers"
import bucketResolvers from "./bucketResolvers"
import badgeResolvers from "./badgeResolvers"
import seriesResolvers from "./seriesResolvers"
import driverResolvers from "./driverResolvers"
import teamResolvers from "./teamResolvers"
import champResolvers from "./champResolvers"

const Resolvers = {
  ...userResolvers,
  ...bucketResolvers,
  ...badgeResolvers,
  ...seriesResolvers,
  ...driverResolvers,
  ...teamResolvers,
  ...champResolvers,
}

export default Resolvers
