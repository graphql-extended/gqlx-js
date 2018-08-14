import { GraphQLFieldResolver, GraphQLScalarType } from 'graphql';

export interface SchemaResolver {
  [field: string]: (root: any, args: any, context: any) => any;
}

export interface DynamicResolver {
  (type: string, field: string, data: any): Promise<any>;
}

export interface SchemaResolvers {
  Query?: DefaultResolve<any, any> | GraphQLScalarType;
  Mutation?: DefaultResolve<any, any> | GraphQLScalarType;
  Subscription?: SubscriptionResolve<any, any> | GraphQLScalarType;
}

export interface ServicesContext {
  getService(name: string): DynamicResolver;
}

export interface SubscriptionResolve<TSource, TArgs> {
  [type: string]: {
    [field: string]: GraphQLFieldResolver<TSource, ServicesContext, TArgs>;
  };
}

export interface DefaultResolve<TSource, TArgs> {
  [key: string]: GraphQLFieldResolver<TSource, ServicesContext, TArgs>;
}
