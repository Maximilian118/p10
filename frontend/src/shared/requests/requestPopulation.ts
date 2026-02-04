// User population template literal.
// Championships are now embedded snapshots with all necessary data.
export const populateUser = `
  _id
  tokens
  name
  email
  icon
  profile_picture
  championships {
    _id
    name
    icon
    season
    position
    positionChange
    totalPoints
    lastPoints
    roundsCompleted
    totalRounds
    competitorCount
    maxCompetitors
    discoveredBadges
    totalBadges
    deleted
    updated_at
  }
  created_at
  badges {
    _id
    url
    name
    customName
    rarity
    awardedHow
    awardedDesc
    zoom
    championship
    awarded_at
    featured
  }
  notificationsCount
  notificationSettings {
    emailChampInvite
    emailBadgeEarned
    emailRoundStarted
    emailResultsPosted
    emailKicked
    emailBanned
    emailPromoted
    emailUserJoined
    emailProtestFiled
    emailProtestVoteRequired
    emailProtestPassed
    emailProtestDenied
    emailProtestExpired
  }
  permissions {
    admin
    adjudicator
    guest
  }
`

// User profile population template (for viewing other users).
// Championships are now embedded snapshots, no longer populated from Champ collection.
export const populateUserProfile = `
  _id
  name
  icon
  profile_picture
  championships {
    _id
    name
    icon
    season
    position
    positionChange
    totalPoints
    lastPoints
    roundsCompleted
    totalRounds
    competitorCount
    maxCompetitors
    discoveredBadges
    totalBadges
    deleted
    updated_at
  }
  badges {
    _id
    url
    name
    customName
    rarity
    awardedHow
    awardedDesc
    zoom
    championship
    awarded_at
    featured
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
  dominantColour
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
  official
  created_at
  updated_at
`

// Team population with full user details (for standalone team pages).
export const populateTeamFull = `
  _id
  icon
  emblem
  dominantColour
  name
  series {
    _id
    name
    shortName
  }
  drivers {
    _id
    icon
    name
    stats {
      positionHistory
    }
    series {
      _id
      name
      shortName
      championships {
        _id
        history {
          season
          rounds {
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
  }
  stats {
    inceptionDate
    nationality
  }
  created_by {
    ${populateUser}
  }
  official
  created_at
  updated_at
`

// Team population for Teams list page (includes full driver details for editing).
export const populateTeamList = `
  _id
  icon
  emblem
  dominantColour
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
  official
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
    shortName
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
    roundsCompleted
    roundsWon
    champsCompleted
    champsWon
    polePositions
    topThreeFinishes
    p10Finishes
    formScore
    dnfCount
    dnsCount
    consecutiveDNFs
  }
  created_by {
    _id
  }
  official
  created_at
  updated_at
`

// Series population template literal.
export const populateSeries = `
  _id
  url
  name
  shortName
  hasAPI
  championships {
    _id
  }
  drivers {
    ${populateDriver}
  }
  created_by {
    _id
  }
  official
  created_at
  updated_at
`

// Minimal population for rules mutations (avoids full champ population).
export const populateRulesAndRegs = `
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
  tokens
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
    statusChangedAt
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
        badges {
          _id
          url
          name
          rarity
          zoom
          featured
        }
      }
      bet {
        _id
        name
        icon
        driverID
      }
      points
      totalPoints
      grandTotalPoints
      adjustment {
        adjustment
        type
        reason
        updated_at
        created_at
      }
      position
      deleted
      deletedUserSnapshot {
        _id
        name
        icon
      }
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
      grandTotalPoints
      adjustment {
        adjustment
        type
        reason
        updated_at
        created_at
      }
      position
      positionDrivers
      positionActual
    }
    randomisedDrivers {
      driver {
        _id
        name
        icon
        driverID
      }
      points
      totalPoints
      grandTotalPoints
      adjustment {
        adjustment
        type
        reason
        updated_at
        created_at
      }
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
        dominantColour
      }
      drivers {
        _id
        name
        icon
        driverID
      }
      points
      totalPoints
      grandTotalPoints
      adjustment {
        adjustment
        type
        reason
        updated_at
        created_at
      }
      position
      positionConstructors
    }
  }
  competitors {
    _id
    name
    icon
  }
  series {
    _id
    url
    name
    shortName
    hasAPI
    drivers {
      _id
      icon
      profile_picture
      name
      driverID
      teams {
        _id
        name
        icon
        emblem
        drivers {
          _id
          icon
          name
        }
      }
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
    skipCountDown
    skipResults
    inviteOnly
    maxCompetitors
    competitorsCanBet
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
    admin {
      adjCanSeeBadges
    }
  }
  waitingList {
    _id
    name
    icon
  }
  banned {
    _id
    name
    icon
  }
  kicked {
    _id
    name
    icon
  }
  invited {
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
      statusChangedAt
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
        adjustment {
          adjustment
          type
          reason
          updated_at
          created_at
        }
        position
        deleted
        deletedUserSnapshot {
          _id
          name
          icon
        }
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
        adjustment {
          adjustment
          type
          reason
          updated_at
          created_at
        }
        position
        positionDrivers
        positionActual
      }
      randomisedDrivers {
        driver {
          _id
          name
          icon
          driverID
        }
        points
        totalPoints
        adjustment {
          adjustment
          type
          reason
          updated_at
          created_at
        }
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
          dominantColour
        }
        drivers {
          _id
          name
          icon
          driverID
        }
        points
        totalPoints
        adjustment {
          adjustment
          type
          reason
          updated_at
          created_at
        }
        position
        positionConstructors
      }
    }
    pointsStructure {
      position
      points
    }
  }
  champBadges {
    _id
    url
  }
  discoveredBadgesCount
  created_by {
    _id
    name
    icon
  }
  created_at
  updated_at
  tokens
`

// Protest population template literal.
export const populateProtest = `
  _id
  championship {
    _id
    name
    icon
  }
  competitor {
    _id
    name
    icon
  }
  accused {
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
  pointsAllocated
  filerPoints
  accusedPoints
  created_at
  updated_at
`

// Notification population template for getNotifications query.
export const populateNotification = `
  _id
  type
  title
  description
  read
  champId
  champName
  champIcon
  badgeSnapshot {
    _id
    championship
    url
    name
    customName
    rarity
    awardedHow
    awardedDesc
    zoom
    awarded_at
    featured
  }
  protestId
  protestTitle
  filerId
  filerName
  filerIcon
  accusedId
  accusedName
  accusedIcon
  filerPoints
  accusedPoints
  protestStatus
  createdAt
`
