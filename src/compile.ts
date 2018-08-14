import { parseDynamicSchema, validate, transform, generate } from './utils';
import { DynamicGqlModule, GqlTransformOptions } from './types';
import { defaultApi } from './api';

export function compile(
  name: string,
  source: string,
  api = defaultApi,
  options?: GqlTransformOptions,
): DynamicGqlModule {
  const gql = parseDynamicSchema(source);
  validate(gql, api);
  const connectors = transform(gql, api, options);
  const result = generate(name, connectors);
  return {
    name,
    source,
    schema: gql.schema.text,
    resolvers: result.resolvers,
    createService: result.createService,
  };
}
