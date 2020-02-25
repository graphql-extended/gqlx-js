import { AvailableApi } from './types';

export const defaultApi: AvailableApi = {
  get: true,
  post: true,
  del: true,
  put: true,
  patch: true,
  form: true,
  listen: false,
};

export function setDefaultApi(api: AvailableApi) {
  for (const key of Object.keys(defaultApi)) {
    delete defaultApi[key];
  }

  for (const key of Object.keys(api)) {
    defaultApi[key] = api[key];
  }
}
