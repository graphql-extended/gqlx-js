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
});
