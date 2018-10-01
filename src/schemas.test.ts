import { parseDynamicSchema, transform } from './utils';
import { defaultApi } from './api';

function getConnectors(input: string) {
  const gql = parseDynamicSchema(input);
  return transform(gql, defaultApi);
}

describe('getConnectors', () => {
  it('works for a single simple Query', () => {
    const source = `type Query { foos: [String] { get('api/foo') } }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foos: "try { return await $api.get('api/foo'); } catch (err) { throw new Error(JSON.stringify(err)); }",
      },
    });
  });

  it('places await correctly in binary expression', () => {
    const source = `type Query { foos: [String] { get('api/foo') * 2 } }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foos: "try { return (await $api.get('api/foo') * 2); } catch (err) { throw new Error(JSON.stringify(err)); }",
      },
    });
  });

  it('works for two simple Queries', () => {
    const source = `type Query { foos: [String] { get('api/foo') } bar(id: ID!): String { get('api/bar/' + id) } }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foos: "try { return await $api.get('api/foo'); } catch (err) { throw new Error(JSON.stringify(err)); }",
        bar:
          "try { return await $api.get(('api/bar/' + $data.id)); } catch (err) { throw new Error(JSON.stringify(err)); }",
      },
    });
  });

  it('works for a logic Query with use', () => {
    const source = `type Query {
      foo(id: ID): String {
        use(get('api/foo').items, ([item]) => {
          item = item ? item : post('api/bar', {});
          return post(\`api/foo/\${id}\`, {
            target: item.id,
          });
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foo:
          "try { const use = ((x, cb) => cb(x)); const _0 = await $api.get('api/foo'); return await use(_0.items, (async ([item]) => { (item = ((item) ? (item) : (await $api.post('api/bar', ({  }))))); return await $api.post(`api/foo/${$data.id}`, ({ target: item.id })); })); } catch (err) { throw new Error(JSON.stringify(err)); }",
      },
    });
  });

  it('works for a logic Query with if', () => {
    const source = `type Query {
      foo(id: ID): String {
        use(get('api/foo').items, ([item]) => {
          if (!item) {
            item = post('api/bar');
          }

          return item;
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foo:
          "try { const use = ((x, cb) => cb(x)); const _0 = await $api.get('api/foo'); return await use(_0.items, (async ([item]) => { if ((!item)) { (item = await $api.post('api/bar')); } return item; })); } catch (err) { throw new Error(JSON.stringify(err)); }",
      },
    });
  });

  it('works for a logic Query with if and else', () => {
    const source = `type Query {
      foo(id: ID): String {
        use(get('api/foo').items, ([item]) => {
          if (!item) {
            return post('api/bar');
          } else {
            return item;
          }
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foo:
          "try { const use = ((x, cb) => cb(x)); const _0 = await $api.get('api/foo'); return await use(_0.items, (async ([item]) => { if ((!item)) { return await $api.post('api/bar'); } else { return item; } })); } catch (err) { throw new Error(JSON.stringify(err)); }",
      },
    });
  });

  it('works for a logic Query with while', () => {
    const source = `type Query {
      foo(id: ID): String {
        use(post('api/next'), (item) => {
          const ids = [];

          while (item) {
            ids.push(item.id);
            item = post('api/next');
          }

          return ids.join(',');
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foo:
          "try { const use = ((x, cb) => cb(x)); return await use(await $api.post('api/next'), (async (item) => { const ids = []; while (item) { ids.push(item.id); (item = await $api.post('api/next')); } return ids.join(','); })); } catch (err) { throw new Error(JSON.stringify(err)); }",
      },
    });
  });

  it('works for a logic Query with for', () => {
    const source = `type Query {
      foo(id: ID): String {
        use(get('api/count'), (num) => {
          const ids = [];

          for (let i = 0; i < num; i++) {
            ids.push(i);
          }

          return ids.join(',');
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foo:
          "try { const use = ((x, cb) => cb(x)); return use(await $api.get('api/count'), ((num) => { const ids = []; for (let i = 0; (i < num); (i++)) { ids.push(i); } return ids.join(','); })); } catch (err) { throw new Error(JSON.stringify(err)); }",
      },
    });
  });

  it('works for a logic Query with do while', () => {
    const source = `type Query {
      foo(id: ID): String {
        use(get('api/count'), (num) => {
          const ids = [];

          do {
            ids.push(--num);
          } while (num > 0);

          return ids.join(',');
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foo:
          "try { const use = ((x, cb) => cb(x)); return use(await $api.get('api/count'), ((num) => { const ids = []; do { ids.push((--num)); } while ((num > 0)); return ids.join(','); })); } catch (err) { throw new Error(JSON.stringify(err)); }",
      },
    });
  });

  it('works for a logic Query with parallel requests', () => {
    const source = `type Query {
      foo(id: ID): String {
        get('api/items').map(item => get(\`api/item/\${item.id}\`))
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foo:
          "try { const _0 = await $api.get('api/items'); return await _0.map((async (item) => { return await $api.get(`api/item/${item.id}`); })); } catch (err) { throw new Error(JSON.stringify(err)); }",
      },
    });
  });
});
