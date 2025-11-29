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
