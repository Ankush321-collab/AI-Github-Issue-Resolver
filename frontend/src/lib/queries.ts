import { gql } from '@apollo/client';

export const GET_RUNS = gql`
  query GetRuns($limit: Int, $offset: Int) {
    getRuns(limit: $limit, offset: $offset) {
      id
      issue
      repoUrl
      status
      error
      prUrl
      createdAt
      updatedAt
    }
  }
`;

export const GET_RUN_DETAILS = gql`
  query GetRunDetails($id: ID!) {
    getRunDetails(id: $id) {
      id
      issue
      repoUrl
      status
      error
      plan
      patch
      tests
      prUrl
      createdAt
      updatedAt
      logs {
        id
        agentName
        message
        timestamp
      }
    }
  }
`;

export const START_RUN = gql`
  mutation StartRun($issue: String!, $repoUrl: String!) {
    startRun(issue: $issue, repoUrl: $repoUrl) {
      id
      issue
      repoUrl
      status
      createdAt
    }
  }
`;

export const AGENT_PROGRESS = gql`
  subscription AgentProgress($runId: ID!) {
    agentProgress(runId: $runId) {
      runId
      agentName
      eventType
      content
      timestamp
    }
  }
`;

export const REGISTER = gql`
  mutation Register($email: String!, $password: String!) {
    register(email: $email, password: $password) {
      token
      user {
        id
        email
        hasGithubToken
        createdAt
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        hasGithubToken
        createdAt
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

export const SET_GITHUB_TOKEN = gql`
  mutation SetGithubToken($token: String!) {
    setGithubToken(token: $token) {
      id
      email
      hasGithubToken
      createdAt
    }
  }
`;

export const ADD_GITHUB_TOKEN = gql`
  mutation AddGithubToken($token: String!, $label: String!) {
    addGithubToken(token: $token, label: $label) {
      id
      email
      hasGithubToken
      activeGithubTokenId
      githubTokens {
        id
        label
        lastFour
        createdAt
      }
      createdAt
    }
  }
`;

export const UPDATE_GITHUB_TOKEN = gql`
  mutation UpdateGithubToken($id: ID!, $token: String!, $label: String!) {
    updateGithubToken(id: $id, token: $token, label: $label) {
      id
      email
      hasGithubToken
      activeGithubTokenId
      githubTokens {
        id
        label
        lastFour
        createdAt
      }
      createdAt
    }
  }
`;

export const DELETE_GITHUB_TOKEN = gql`
  mutation DeleteGithubToken($id: ID!) {
    deleteGithubToken(id: $id) {
      id
      email
      hasGithubToken
      activeGithubTokenId
      githubTokens {
        id
        label
        lastFour
        createdAt
      }
      createdAt
    }
  }
`;

export const SET_ACTIVE_GITHUB_TOKEN = gql`
  mutation SetActiveGithubToken($id: ID!) {
    setActiveGithubToken(id: $id) {
      id
      email
      hasGithubToken
      activeGithubTokenId
      githubTokens {
        id
        label
        lastFour
        createdAt
      }
      createdAt
    }
  }
`;

export const ME = gql`
  query Me {
    me {
      id
      email
      hasGithubToken
      activeGithubTokenId
      githubTokens {
        id
        label
        lastFour
        createdAt
      }
      createdAt
    }
  }
`;
