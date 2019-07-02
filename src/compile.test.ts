import { compile } from './compile';

describe('compile', () => {
  it('generates a simple Query resolver from a sync API', async () => {
    const source = `
      type Query {
        testFoo(name: String): Int {
          foo(name)
        }
      }`;
    const api = {
      foo: false,
    };
    const mod = compile('test', source, api);
    const svc = mod.createService({
      foo(name: string) {
        return name.length;
      },
    });
    const result = await svc('Query', 'testFoo', { name: 'Tester' });
    expect(result).toBe(6);
  });

  it('generates a simple Query resolver from an async API', async () => {
    const source = `
      type Query {
        testFooAsync(name: String): Int {
          foo(name) * 2
        }
      }`;
    const api = {
      foo: true,
    };
    const mod = compile('test', source, api);
    const svc = mod.createService({
      foo(name: string) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(name.length);
          }, 10);
        });
      },
    });
    const result = await svc('Query', 'testFooAsync', { name: 'Tester' });
    expect(result).toBe(12);
  });

  it('generates a complex Query resolver from async logic', async () => {
    const source = `
      type Query {
        test(id: ID): Int {
          use(get('api/item').items, ([item]) => {
            item = item ? item : post('api/item', {});
            id = id ? id : use(get('api/foo')
              .items.filter(m => m.type === 'bar'), ([foo]) => {
                foo = foo ? foo : post('api/foo', {
                  name: 'Foo',
                  type: 'bar',
                });
                return foo.id;
              });

            return post(\`api/item/\${id}\`, {
              target: item.id,
            });
          })
        }
      }`;
    const api = {
      get: true,
      post: true,
    };
    const mod = compile('test', source, api);
    const svc = mod.createService({
      get(path: string) {
        switch (path) {
          case 'api/item':
            return Promise.resolve({ items: [] });
          case 'api/foo':
            return Promise.resolve({ items: [{ type: 'foo', id: 0 }, { type: 'bar', id: 2 }] });
          default:
            return Promise.reject('Should not end up here.');
        }
      },
      post(path: string, obj: any) {
        switch (path) {
          case 'api/item':
            return Promise.resolve({ id: 10 });
          case 'api/foo':
            return Promise.resolve('');
          default:
            const id = parseInt(path.split('/')[2], 10);
            return Promise.resolve(id + obj.target);
        }
      },
    });

    const resultWithArgument = await svc('Query', 'test', { id: 5 });
    expect(resultWithArgument).toBe(15);

    const resultWithoutArgument = await svc('Query', 'test', {});
    expect(resultWithoutArgument).toBe(12);
  });

  it('either uses either the left or right side', async () => {
    const source = `
      type Query {
        test(name: String): String {
          either(name, 'Fallback')
        }
      }`;
    const mod = compile('test', source, {});
    const svc = mod.createService({});
    const result1 = await svc('Query', 'test', { name: 'Tester' });
    const result2 = await svc('Query', 'test', {});
    expect(result1).toBe('Tester');
    expect(result2).toBe('Fallback');
  });

  it('use uses the given type in the callback', async () => {
    const source = `
      type Query {
        test(name: String): Int {
          use(name, x => x.length)
        }
      }`;
    const mod = compile('test', source, {});
    const svc = mod.createService({});
    const result = await svc('Query', 'test', { name: 'Tester' });
    expect(result).toBe(6);
  });

  it('cq adds the provided values', async () => {
    const source = `
      type Query {
        test(name: String): String {
          cq('/myurl', { name })
        }
      }`;
    const mod = compile('test', source, {});
    const svc = mod.createService({});
    const result = await svc('Query', 'test', { name: 'tester' });
    expect(result).toBe('/myurl?name=tester');
  });

  it('cq ignores empty objects', async () => {
    const source = `
      type Query {
        test(name: String): String {
          cq('/myurl', { })
        }
      }`;
    const mod = compile('test', source, {});
    const svc = mod.createService({});
    const result = await svc('Query', 'test', { name: 'tester' });
    expect(result).toBe('/myurl');
  });

  it('cq concats multiple values', async () => {
    const source = `
      type Query {
        test(name: String): String {
          cq('/myurl', { a: 'b', name, c: 'd' })
        }
      }`;
    const mod = compile('test', source, {});
    const svc = mod.createService({});
    const result = await svc('Query', 'test', { name: 'tester' });
    expect(result).toBe('/myurl?a=b&name=tester&c=d');
  });

  it('cq properly encodes the values', async () => {
    const source = `
      type Query {
        test(name: String, value: String): String {
          cq('/myurl', { name, value })
        }
      }`;
    const mod = compile('test', source, {});
    const svc = mod.createService({});
    const result = await svc('Query', 'test', { name: 'a&b', value: 'you&me' });
    expect(result).toBe('/myurl?name=a%26b&value=you%26me');
  });

  it('cq supports computed objects', async () => {
    const source = `
      type Query {
        test(name: String, value: String): String {
          cq('/myurl', { [name]: value })
        }
      }`;
    const mod = compile('test', source, {});
    const svc = mod.createService({});
    const result = await svc('Query', 'test', { name: 'a&b', value: 'you&me' });
    expect(result).toBe('/myurl?a%26b=you%26me');
  });
});
