import { parseDynamicSchema, validate, transform, generate } from './utils';
import { DynamicGqlModule, GqlTransformOptions } from './types';
import { defaultApi } from './api';
import { GqlxError } from './GqlxError';

export function compile(
  name: string,
  source: string,
  api = defaultApi,
  options?: GqlTransformOptions,
): DynamicGqlModule {
  if (!name) {
    throw new Error('No module name supplied. An unique namespace is required.');
  } else if (!source) {
    throw new GqlxError('Empty source supplied. An empty schema is invalid.');
  } else {
    const gql = parseDynamicSchema(source);
    validate(gql, api, options);
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
}
