import { Connectors, AvailableApi, SchemaResolvers, ServicesContext } from '../types';

const AsyncFunction: FunctionConstructor = Object.getPrototypeOf(async function() {}).constructor;

function createStandardResolver(name: string, type: string, field: string) {
  return (_root: any, args: any, context: ServicesContext) => {
    const resolve = context.getService(name);
    return resolve(type, field, args);
  };
}

function createSubscriptionResolver(name: string, type: string, field: string) {
  return {
    subscribe: createStandardResolver(name, type, field),
  };
}

function createResolver(name: string, type: string, field: string) {
  switch (type) {
    case 'Subscription':
      return createSubscriptionResolver(name, type, field);
    case 'Query':
    case 'Mutation':
      return createStandardResolver(name, type, field);
    default:
      throw new Error(`Invalid type used. Expected 'Subscription', 'Query', or 'Mutation', but received '${type}'.`);
  }
}

export function generate(name: string, connectors: Connectors) {
  const models = Object.keys(connectors).reduce((res, type) => {
    const connector = connectors[type];
    res[type] = Object.keys(connector).reduce((con, field) => {
      const source = connector[field];
      const Func = source.includes('await ') ? AsyncFunction : Function;
      con[field] = new Func('$api', '$data', source);
      return con;
    }, {});
    return res;
  }, {});

  const resolvers = Object.keys(connectors).reduce(
    (res, type) => {
      const connector = connectors[type];
      res[type] = Object.keys(connector).reduce((con, field) => {
        con[field] = createResolver(name, type, field);
        return con;
      }, {});
      return res;
    },
    {} as SchemaResolvers,
  );

  return {
    resolvers,
    createService(api: AvailableApi) {
      return (type: string, field: string, data: any) => {
        const model = models[type];
        const connect = model[field];
        return connect(
          api,
          data,
        );
      };
    },
  };
}
