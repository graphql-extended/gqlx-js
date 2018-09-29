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
});
