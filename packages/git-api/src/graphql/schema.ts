import { yoga } from "@elysiajs/graphql-yoga";
import { buildSchema } from "graphql";
import { createPubSub } from "graphql-yoga";
import { backend } from "../services/drivers";

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
    files: (_: any, { repo, rev = "HEAD", path, recursive }: { repo: string; rev?: string; path?: string; recursive?: boolean }) =>
      backend.current().listFiles(repo, rev, path, recursive),
    diff: (_: any, { repo, from, to }: { repo: string; from: string; to: string }) =>
      backend.current().diffCommits(repo, from, to),
  },
  Mutation: {
    stage: (_: any, { repo, path, patch }: { repo: string; path: string; patch?: string }) =>
      backend
        .current()
        .stageFile(repo, path, patch)
        .then(() => true),
    stashSave: (_: any, { repo, message }: { repo: string; message?: string }) =>
      backend.current().stashSave(repo, message),
    revertCommit: (_: any, { repo, sha }: { repo: string; sha: string }) =>
      backend.current().revertCommit(repo, sha),
  },
};

const pubsub = createPubSub<{
  indexingStarted: [payload: {x: false}];
  indexingFinished: [payload: {x: true}];
}>();

export const gQLPlugin = yoga({
  schema,
  resolvers: resolvers as any,
  context: () => ({ pubsub }),
});
