import { SchemaResolvers, DynamicResolver } from './resolver';

export interface DynamicGqlModule {
  name: string;
  source: string;
  schema: string;
  resolvers: SchemaResolvers;
  createService(api: any): DynamicResolver;
}

export interface AvailableApi {
  [fn: string]: boolean;
}

export interface LiveApi {
  [fn: string]: (...args: Array<any>) => any;
}

export interface GqlTransformOptions {
  wrapStatements?(block: string): string;
  regenerate?(source: string): string;
}
