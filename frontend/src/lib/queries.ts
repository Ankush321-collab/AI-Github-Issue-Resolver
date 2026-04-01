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
