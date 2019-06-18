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
        foos:
          "try { return await $api.get('api/foo'); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('places await correctly in binary expression', () => {
    const source = `type Query { foos: [String] { get('api/foo') * 2 } }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foos:
          "try { return (await $api.get('api/foo') * 2); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('works for two simple Queries', () => {
    const source = `type Query { foos: [String] { get('api/foo') } bar(id: ID!): String { get('api/bar/' + id) } }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foos:
          "try { return await $api.get('api/foo'); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
        bar:
          "try { return await $api.get(('api/bar/' + $data.id)); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
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
          "try { const use = ((x, cb) => cb(x)); const _0 = await $api.get('api/foo'); return await use(_0.items, (async ([item]) => { (item = ((item) ? (item) : (await $api.post('api/bar', ({  }))))); return await $api.post(`api/foo/${$data.id}`, ({ target: item.id })); })); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
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
          "try { const use = ((x, cb) => cb(x)); const _0 = await $api.get('api/foo'); return await use(_0.items, (async ([item]) => { if ((!item)) { (item = await $api.post('api/bar')); } return item; })); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
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
          "try { const use = ((x, cb) => cb(x)); const _0 = await $api.get('api/foo'); return await use(_0.items, (async ([item]) => { if ((!item)) { return await $api.post('api/bar'); } else { return item; } })); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
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
          "try { const use = ((x, cb) => cb(x)); return await use(await $api.post('api/next'), (async (item) => { const ids = []; while (item) { ids.push(item.id); (item = await $api.post('api/next')); } return ids.join(','); })); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
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
          "try { const use = ((x, cb) => cb(x)); return use(await $api.get('api/count'), ((num) => { const ids = []; for (let i = 0; (i < num); (i++)) { ids.push(i); } return ids.join(','); })); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
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
          "try { const use = ((x, cb) => cb(x)); return use(await $api.get('api/count'), ((num) => { const ids = []; do { ids.push((--num)); } while ((num > 0)); return ids.join(','); })); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
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
          "try { const _0 = await $api.get('api/items'); return await Promise.all(_0.map((async (item) => { return await $api.get(`api/item/${item.id}`); }))); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('works with spread of async objects', () => {
    const source = `type Query {
      foo: String {
        { x: '', y: '', ...get('foo') }
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foo:
          "try { return ({ x: '', y: '', ...(await $api.get('foo')) }); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('works with assigning property names in object declarations', () => {
    const source = `type Query {
      foo: String {
        { [c.id]: c }
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foo:
          'try { return ({ [c.id]: c }); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }',
      },
    });
  });

  it('works with any number of parenthesis', () => {
    const source = `type Query {
      foo: String {
        ({ x, y })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foo:
          'try { return ({ x, y }); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }',
      },
    });
  });

  it('works with nested Promise.all calls', () => {
    const source = `type Query {
      reorderRules(rules: [ReorderRule]): [Rule] {
        use(get('api/rule'), ({ items }) => {
          return items.map(rule => put('api/rule/'));
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        reorderRules:
          "try { const use = ((x, cb) => cb(x)); return await use(await $api.get('api/rule'), (async ({ items }) => { return await Promise.all(items.map((async (rule) => { return await $api.put('api/rule/'); }))); })); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('works with parenthesis starting but not ending', () => {
    const source = `type Query {
      items(hashes: [String]): [Item] {
        (hashes && hashes.length) ? (
          post('api/item')
        ) : (
          get('api/item')
        )
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        items:
          "try { return ((($data.hashes && $data.hashes.length)) ? (await $api.post('api/item')) : (await $api.get('api/item'))); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('ignores arbitrary parenthesis', () => {
    const source = `type Query {
      items: [Item] {
        { a: (((3))) + (((4) - 5)), b: (('foo')) }
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        items:
          "try { return ({ a: (3 + (4 - 5)), b: 'foo' }); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('always respects local variables before data arguments', () => {
    const source = `type Translation {
      key: String
      content: String
      language: String
    }

    type Query {
      items(language: String): [Translation] {
        use(get('api/snippet'), res => {
          const { snippets, languages } = res;

          languages.forEach(language => {
            snippets[language].map(snippet => ({ ...snippet, language }));
          });
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        items:
          "try { const use = ((x, cb) => cb(x)); return use(await $api.get('api/snippet'), ((res) => { const { snippets, languages } = res; languages.forEach(((language) => { snippets[language].map(((snippet) => ({ ...(snippet), language: language }))); })); })); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('includes array spread correctly', () => {
    const source = `type Query {
      items: [Item] {
        use(get('/api/item'), items => {
          const arr = [];
          arr.push(...items);
          return arr;
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        items:
          "try { const use = ((x, cb) => cb(x)); return use(await $api.get('/api/item'), ((items) => { const arr = []; arr.push(...items); return arr; })); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('should respect lazy loading also in conditionals', () => {
    const source = `type Query {
      items(arg: String): [Translation] {
        arg ? get('a').snippets.map(snippet => ({ ...snippet, arg })) : get('b')
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        items:
          "try { return (($data.arg) ? (await (async () => { const _0 = await $api.get('a'); return _0.snippets.map(((snippet) => ({ ...(snippet), arg: $data.arg }))); })()) : (await $api.get('b'))); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('should have no problems with chained awaited commands in nested use with conditional', () => {
    const source = `
    type Query {
      test(id: ID): Int {
        use(get('api/item').items, ([item]) => {
          id = id ? id : use(get('api/foo')
            .items.filter(m => m.type === 'bar'), ([foo]) => {
              foo = foo ? foo : post('api/foo');
              return foo.id;
            });

          return id;
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        test:
          "try { const use = ((x, cb) => cb(x)); const _0 = await $api.get('api/item'); return await use(_0.items, (async ([item]) => { ($data.id = (($data.id) ? ($data.id) : (await (async () => { const _1 = await $api.get('api/foo'); return await use(_1.items.filter(((m) => (m.type === 'bar'))), (async ([foo]) => { (foo = ((foo) ? (foo) : (await $api.post('api/foo')))); return foo.id; })); })()))); return $data.id; })); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('Should place async declarations on used .map function calls', () => {
    const source = `type Foo {
      product: String
      version: String
    }

    type Query {
      foo: [Foo] {
        get('api/product').items.map(product => {
          const versions = get(\`api/product/\${product.id}/version\`).items;
          return {
            product,
            versions,
          };
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        foo:
          "try { const _0 = await $api.get('api/product'); return await Promise.all(_0.items.map((async (product) => { const _1 = await $api.get(`api/product/${product.id}/version`); const versions = _1.items; return ({ product, versions }); }))); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }",
      },
    });
  });

  it('Should wrap any function using await in an async lambda', () => {
    const source = `type SoftwareProductWithVersion {
      product: String
      versions: [String]
    }

    type Query {
      test(productId: ID!): SoftwareProductWithVersion {
        use(
          get(\`api/product/productId\`), product => {
          const versions = get(\`api/product/productId/version\`).items;
          return {
            product,
            versions,
          };
        })
      }
    }`;
    const result = getConnectors(source);
    expect(result).toEqual({
      Query: {
        test:
          'try { const use = ((x, cb) => cb(x)); return await use(await $api.get(`api/product/productId`), (async (product) => { const _0 = await $api.get(`api/product/productId/version`); const versions = _0.items; return ({ product, versions }); })); } catch (err) { throw new Error(JSON.stringify(err, Object.getOwnPropertyNames(err))); }',
      },
    });
  });
});
