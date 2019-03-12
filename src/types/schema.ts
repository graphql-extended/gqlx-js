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

export interface GqlResolvers {
  Query: ResolverInfo;
  Mutation: ResolverInfo;
  Subscription: ResolverInfo;
}

export interface DynamicGqlSchema {
  schema: {
    text: string;
    ast: DocumentNode;
  };
  resolvers: GqlResolvers;
}

export interface ResolverInfo {
  [field: string]: any;
}
