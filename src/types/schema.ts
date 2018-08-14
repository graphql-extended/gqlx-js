import { DocumentNode } from 'graphql';

export interface Position {
  start: number;
  end: number;
}

export interface Connectors {
  [type: string]: {
    [field: string]: string;
  };
}

export interface DynamicGqlSchema {
  schema: {
    text: string;
    ast: DocumentNode;
  };
  resolvers: {
    Query: ResolverInfo;
    Mutation: ResolverInfo;
    Subscription: ResolverInfo;
  };
}

export interface ResolverInfo {
  [field: string]: any;
}
