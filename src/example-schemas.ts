export const toyInput = `
  type Foo {
    id: ID
    name: String
  }

  type Bar {
    id: ID
    age: Int
  }

  type Query {
    foo: [Foo]

    bar(name: String): Bar {
      get('api')
        .map(x => find({ name, ...x }).map(y => y.element))
        .filter(x => !x)
        .map(x => \`Hello there \${x.y} from \${name}\`)
    }

    qxz(id: ID!, name: String, ages: [Int]): [Bar] {
      get('api')
    }

    items(hashes: [String]): [Foo] {
      (hashes && hashes.length) ?
        post('api/item', {
          hashes,
          content: '',
        }).items
      :
        get('api/item').items
    }
  }

  type Mutation {
    foo(a: String, b: Double): [Int] {
      post('api/foo', {
        body: get('api'),
      })
    }
  }

  type Subscription {
    foo: [Foo] {
      listen('foo')
    }
  }
`;
