import userResolvers from "./userResolvers"
import bucketResolvers from "./bucketResolvers"
import badgeResolvers from "./badgeResolvers"
import seriesResolvers from "./seriesResolvers"
import driverResolvers from "./driverResolvers"
import teamResolvers from "./teamResolvers"
import champResolvers from "./champResolvers"
import notificationResolvers from "./notificationResolvers"

const Resolvers = {
  ...userResolvers,
  ...bucketResolvers,
  ...badgeResolvers,
  ...seriesResolvers,
  ...driverResolvers,
  ...teamResolvers,
  ...champResolvers,
  ...notificationResolvers,
}

export default Resolvers
