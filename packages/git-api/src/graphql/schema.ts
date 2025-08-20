import { yoga } from "@elysiajs/graphql-yoga";
import { buildSchema } from "graphql";
import { createPubSub } from "graphql-yoga";
import { backend } from "../git/backend";

export const schema = buildSchema(`
  type File {
    path: String!
    mode: String!
    sha: String!
  }

  type Query {
    files(repo: String!, rev: String, path: String, recursive: Boolean): [File!]!
    diff(repo: String!, from: String!, to: String!): String!
  }

  type Mutation {
    stage(repo: String!, path: String!, patch: String): Boolean!
    stashSave(repo: String!, message: String): String!
    revertCommit(repo: String!, sha: String!): String!
  }
`);

export const resolvers = {
  Query: {
    files: (_, { repo, rev = "HEAD", path, recursive }) => backend.current().listFiles(repo, rev, path, recursive),
    diff: (_, { repo, from, to }) => backend.current().diffCommits(repo, from, to),
  },
  Mutation: {
    stage: (_, { repo, path, patch }) =>
      backend
        .current()
        .stageFile(repo, path, patch)
        .then(() => true),
    stashSave: (_, { repo, message }) => backend.current().stashSave(repo, message),
    revertCommit: (_, { repo, sha }) => backend.current().revertCommit(repo, sha),
  },
};

const pubsub = createPubSub<{
  indexingStarted: [payload: {}];
  indexingFinished: [payload: {}];
}>();

export const gQLPlugin = yoga({
  schema,
  resolvers: resolvers as any,
  context: () => ({ pubsub }),
});
