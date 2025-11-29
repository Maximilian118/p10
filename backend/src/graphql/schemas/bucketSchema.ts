const bucketSchema = `
  type S3Payload {
    signedRequest: String!
    url: String!
    duplicate: Boolean!
  }

  type S3Deleted {
    url: String!
    tokens: [String!]
  }
`

export default bucketSchema
