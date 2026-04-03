export const typeDefs = `#graphql
  enum RunStatus {
    PENDING
    RUNNING
    COMPLETED
    FAILED
    CANCELLED
  }

  enum TaskStatus {
    PENDING
    RUNNING
    COMPLETED
    FAILED
  }

  type AgentRun {
    id: ID!
    issue: String!
    repoUrl: String!
    status: RunStatus!
    error: String
    plan: String
    patch: String
    tests: String
    prUrl: String
    createdAt: String!
    updatedAt: String!
    state: AgentState
    taskLogs: [TaskLog!]!
  }

  type AgentState {
    id: ID!
    runId: ID!
    stateJson: String!
    createdAt: String!
    updatedAt: String!
  }

  type TaskLog {
    id: ID!
    runId: ID!
    agentName: String!
    message: String!
    timestamp: String!
  }

  type AgentProgress {
    runId: ID!
    agentName: String!
    eventType: String!
    content: String!
    timestamp: String!
  }

  type User {
    id: ID!
    email: String!
    hasGithubToken: Boolean!
    githubTokens: [GitHubToken!]!
    activeGithubTokenId: ID
    profileImageUrl: String
    authProviders: [String!]!
    createdAt: String!
  }

  type GitHubToken {
    id: ID!
    label: String!
    lastFour: String!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    getRuns(limit: Int, offset: Int): [AgentRun!]!
    getRunDetails(id: ID!): AgentRun
    getLogs(runId: ID!): [TaskLog!]!
    me: User
  }

  type Mutation {
    startRun(issue: String!, repoUrl: String!): AgentRun!
    retryRun(runId: ID!): AgentRun!
    cancelRun(runId: ID!): AgentRun!
    register(email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    updateProfile(profileImageUrl: String): User!
    addGithubToken(token: String!, label: String!): User!
    updateGithubToken(id: ID!, token: String!, label: String!): User!
    deleteGithubToken(id: ID!): User!
    setActiveGithubToken(id: ID!): User!
  }

  type Subscription {
    agentProgress(runId: ID!): AgentProgress!
  }

  type AgentRunUpdate {
    runId: ID!
    status: RunStatus!
    message: String
  }
`;
