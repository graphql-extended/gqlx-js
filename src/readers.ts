import { resolve } from 'path';
import { readFileSync, readFile } from 'fs';
import { validate, parseDynamicSchema } from './utils';
import { defaultApi } from './api';

function getFilePath(path: string, cwd?: string) {
  const base = cwd || process.cwd();
  return resolve(base, path);
}

export function readSchemaFromFile(path: string, cwd?: string, api = defaultApi) {
  const fn = getFilePath(path, cwd);
  const source = readFileSync(fn, 'utf8');
  const schema = parseDynamicSchema(source);
  validate(schema, api);
  return source;
}

export function readSchemaFromFileAsync(path: string, cwd?: string, api = defaultApi) {
  const fn = getFilePath(path, cwd);
  return new Promise<string>((resolve, reject) => {
    readFile(fn, 'utf8', (err, source) => {
      if (err) {
        reject(err);
      } else {
        try {
          const schema = parseDynamicSchema(source);
          validate(schema, api);
          resolve(source);
        } catch (err) {
          reject(err);
        }
      }
    });
  });
}
