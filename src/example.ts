import * as schemas from './example-schemas';
import { utils } from './index';

const gql = utils.parseDynamicSchema(schemas.toyInput);
const api = {
  get: true,
  post: true,
  del: true,
  put: true,
  find: true,
  form: true,
  listen: false,
};

utils.validate(gql, api);

const connectors = utils.transform(gql, api);
const result = utils.generate('myService', connectors);

console.log(gql.schema.text);
console.log(connectors);
console.log(result);
