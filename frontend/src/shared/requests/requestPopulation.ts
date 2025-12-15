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
// Team population template literal (lean version for nested use).
export const populateTeam = `
  _id
  icon
  emblem
  logo
  name
  series {
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
    _id
  }
  created_at
  updated_at
`

// Team population with full user details (for standalone team pages).
export const populateTeamFull = `
  _id
  icon
  emblem
  logo
  name
  series {
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

// Team population for Teams list page (includes full driver details for editing).
export const populateTeamList = `
  _id
  icon
  emblem
  logo
  name
  series {
    _id
  }
  drivers {
    _id
    icon
    profile_picture
    body
    name
    driverID
    teams {
      _id
    }
    series {
      _id
    }
    stats {
      nationality
      heightCM
      weightKG
      birthday
      moustache
      mullet
      positionHistory
    }
    created_by {
      _id
    }
    created_at
    updated_at
  }
  stats {
    inceptionDate
    nationality
  }
  created_by {
    _id
  }
  created_at
  updated_at
`
// Driver population template literal.
export const populateDriver = `
  _id
  icon
  profile_picture
  body
  name
  driverID
  teams {
    ${populateTeam}
  }
  series {
    _id
    url
    name
    championships {
      _id
      icon
      name
      history {
        season
        rounds {
          round
          drivers {
            driver {
              _id
            }
            positionActual
          }
        }
      }
    }
  }
  stats {
    nationality
    heightCM
    weightKG
    birthday
    moustache
    mullet
    positionHistory
  }
  created_by {
    _id
  }
  created_at
  updated_at
`

// Series population template literal.
export const populateSeries = `
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
    _id
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
  active
  rounds {
    round
    status
    winner {
      _id
      name
      icon
    }
    runnerUp {
      _id
      name
      icon
    }
    competitors {
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
      bet {
        _id
        name
        icon
        driverID
      }
      points
      totalPoints
      position
      updated_at
      created_at
    }
    drivers {
      driver {
        _id
        name
        icon
        driverID
      }
      points
      totalPoints
      position
      positionDrivers
      positionActual
    }
    teams {
      team {
        _id
        name
        icon
        emblem
      }
      drivers {
        _id
        name
        icon
        driverID
      }
      points
      totalPoints
      position
      positionConstructors
    }
  }
  series {
    _id
    url
    name
    drivers {
      _id
      icon
      profile_picture
      name
      driverID
    }
  }
  pointsStructure {
    position
    points
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
    fromDateTime
    history {
      adjudicator {
        _id
        name
        icon
      }
      fromDateTime
      toDateTime
    }
  }
  rulesAndRegs {
    default
    text
    created_by {
      _id
      name
      icon
    }
    pendingChanges {
      competitor {
        _id
        name
        icon
      }
      status
      title
      description
      votes {
        competitor {
          _id
          name
          icon
        }
        vote
      }
      expiry
    }
    history {
      text
      updatedBy {
        _id
        name
        icon
      }
      updated_at
    }
    subsections {
      text
      pendingChanges {
        competitor {
          _id
          name
          icon
        }
        status
        title
        description
        votes {
          competitor {
            _id
            name
            icon
          }
          vote
        }
        expiry
      }
      history {
        text
        updatedBy {
          _id
          name
          icon
        }
        updated_at
      }
      created_by {
        _id
        name
        icon
      }
      created_at
    }
    created_at
  }
  settings {
    inviteOnly
    maxCompetitors
    protests {
      alwaysVote
      allowMultiple
      expiry
    }
    ruleChanges {
      alwaysVote
      allowMultiple
      expiry
    }
    automation {
      enabled
      bettingWindow {
        autoOpen
        autoOpenTime
        autoClose
        autoCloseTime
      }
      round {
        autoNextRound
        autoNextRoundTime
      }
      audio {
        enabled
        triggers {
          bettingWindowOpen
          bettingWindowClosed
        }
      }
    }
  }
  champBadges {
    _id
    url
    name
    rarity
    awardedHow
    awardedDesc
    zoom
  }
  waitingList {
    _id
    name
    icon
  }
  history {
    season
    adjudicator {
      current {
        _id
        name
        icon
      }
      fromDateTime
      history {
        adjudicator {
          _id
          name
          icon
        }
        fromDateTime
        toDateTime
      }
    }
    drivers {
      _id
      name
      icon
      driverID
    }
    rounds {
      round
      status
      winner {
        _id
        name
        icon
      }
      runnerUp {
        _id
        name
        icon
      }
      competitors {
        competitor {
          _id
          name
          icon
        }
        bet {
          _id
          name
          icon
          driverID
        }
        points
        totalPoints
        position
        updated_at
        created_at
      }
      drivers {
        driver {
          _id
          name
          icon
          driverID
        }
        points
        totalPoints
        position
        positionDrivers
        positionActual
      }
      teams {
        team {
          _id
          name
          icon
          emblem
        }
        drivers {
          _id
          name
          icon
          driverID
        }
        points
        totalPoints
        position
        positionConstructors
      }
    }
    pointsStructure {
      position
      points
    }
  }
  created_by {
    _id
    name
    icon
  }
  created_at
  updated_at
  tokens
`
