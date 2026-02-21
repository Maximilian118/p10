import userResolvers from "./userResolvers"
import bucketResolvers from "./bucketResolvers"
import badgeResolvers from "./badgeResolvers"
import seriesResolvers from "./seriesResolvers"
import driverResolvers from "./driverResolvers"
import teamResolvers from "./teamResolvers"
import champResolvers from "./champResolvers"
import notificationResolvers from "./notificationResolvers"
import trackmapResolvers from "./trackmapResolvers"
import demoResolvers from "./demoResolvers"
import socialEventResolvers from "./socialEventResolvers"
import leagueResolvers from "./leagueResolvers"

const Resolvers = {
  ...userResolvers,
  ...bucketResolvers,
  ...badgeResolvers,
  ...seriesResolvers,
  ...driverResolvers,
  ...teamResolvers,
  ...champResolvers,
  ...notificationResolvers,
  ...trackmapResolvers,
  ...demoResolvers,
  ...socialEventResolvers,
  ...leagueResolvers,
}

export default Resolvers
