// User population template literal.
export const populateUser = `
  _id
  tokens
  name
  email
  icon
  profile_picture
  championships {
    _id
  }
  created_at
  badges {
    _id
    url
    name
    rarity
    created_at
  }
  permissions {
    admin
    adjudicator
    guest
  }
`

// User profile population template (for viewing other users).
export const populateUserProfile = `
  _id
  name
  icon
  profile_picture
  championships {
    _id
    name
    icon
    profile_picture
    season
    created_at
  }
  badges {
    _id
    url
    name
    rarity
    awardedHow
    awardedDesc
    created_at
  }
  permissions {
    admin
    adjudicator
    guest
  }
  created_at
  tokens
`
// Team population template literal.
export const populateTeam = `
  _id
  url
  name
  driverGroups {
    _id
  }
  drivers {
    _id
  }
  stats {
    inceptionDate
    nationality
  }
  created_by {
    ${populateUser}
  }
  created_at
  updated_at
`
// Driver population template literal.
export const populateDriver = `
  _id
  url
  name
  driverID
  teams {
    ${populateTeam}
  }
  driverGroups {
    _id
  }
  stats {
    nationality
    heightCM
    weightKG
    birthday
    moustache
    mullet
  }
  created_by {
    ${populateUser}
  }
  created_at
  updated_at
`

// Driver Group population template literal.
export const populateDriverGroup = `
  _id
  url
  name
  championships {
    _id
  }
  drivers {
    ${populateDriver}
  }
  created_by {
    ${populateUser}
  }
  created_at
  updated_at
`

// Championship population template literal for single champ fetch.
export const populateChamp = `
  _id
  name
  icon
  profile_picture
  season
  rounds {
    round
    completed
    bets {
      competitor
      driver
      timestamp
    }
  }
  standings {
    competitor {
      _id
      name
      icon
      profile_picture
      permissions {
        admin
        adjudicator
        guest
      }
      created_at
    }
    active
    status
    results {
      round
      points
    }
  }
  adjudicator {
    current {
      _id
      name
      icon
      profile_picture
      permissions {
        admin
        adjudicator
        guest
      }
      created_at
    }
    since
    rounds {
      season
      round
      timestamp
    }
    history {
      adjudicator {
        _id
        name
        icon
      }
      since
      rounds {
        season
        round
        timestamp
      }
    }
  }
  settings {
    inviteOnly
    maxCompetitors
  }
  created_at
  updated_at
  tokens
`
