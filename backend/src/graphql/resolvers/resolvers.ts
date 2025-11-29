import userResolvers from "./userResolvers"
import bucketResolvers from "./bucketResolvers"
import badgeResolvers from "./badgeResolvers"
import driverGroupResolvers from "./driverGroupResolvers"
import driverResolvers from "./driverResolvers"
import teamResolvers from "./teamResolvers"

const Resolvers = {
  ...userResolvers,
  ...bucketResolvers,
  ...badgeResolvers,
  ...driverGroupResolvers,
  ...driverResolvers,
  ...teamResolvers,
}

export default Resolvers
