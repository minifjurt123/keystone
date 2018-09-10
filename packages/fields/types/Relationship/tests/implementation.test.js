const gql = require('graphql-tag');
const Relationship = require('../').implementation;

class MockFieldAdapter {}

class MockListAdapter {
  newFieldAdapter = () => new MockFieldAdapter();
  prepareModel = () => {};
}

const mockFilterFragment = ['first: Int'];

const mockFilterAST = [
  {
    kind: 'InputValueDefinition',
    name: {
      value: 'first',
    },
    type: {
      name: {
        value: 'Int',
      },
    },
  },
];

function createRelationship({ path, config = {} }) {
  class MockList {
    // The actual implementation in `@keystonejs/core/List/index.js` returns
    // more, but we only want to test that this codepath is called
    getGraphqlFilterFragment = () => mockFilterFragment;
  }

  return new Relationship(path, config, {
    getListByKey: () => new MockList(),
    listKey: 'FakeList',
    listAdapter: new MockListAdapter(),
    fieldAdapterClass: MockFieldAdapter,
    defaultAccess: true,
  });
}

describe('Type Generation', () => {
  test('inputs for relationship fields in create args', () => {
    const relMany = createRelationship({
      path: 'foo',
      config: { many: true, ref: 'Zip' },
    });
    expect(relMany.getGraphqlCreateArgs()).toEqual(['foo: ZipRelateToManyInput']);

    const relSingle = createRelationship({
      path: 'foo',
      config: { many: false, ref: 'Zip' },
    });
    expect(relSingle.getGraphqlCreateArgs()).toEqual(['foo: ZipRelateToOneInput']);
  });

  test('inputs for relationship fields in update args', () => {
    const relMany = createRelationship({
      path: 'foo',
      config: { many: true, ref: 'Zip' },
    });
    expect(relMany.getGraphqlUpdateArgs()).toEqual(['foo: ZipRelateToManyInput']);

    const relSingle = createRelationship({
      path: 'foo',
      config: { many: false, ref: 'Zip' },
    });
    expect(relSingle.getGraphqlUpdateArgs()).toEqual(['foo: ZipRelateToOneInput']);
  });

  test('to-single relationship nested mutation input', () => {
    const relationship = createRelationship({
      path: 'foo',
      config: { many: false, ref: 'Zip' },
    });

    // We're testing the AST is as we expect it to be
    expect(gql(relationship.getGraphqlAuxiliaryTypes().join('\n'))).toMatchObject({
      definitions: [
        {
          kind: 'InputObjectTypeDefinition',
          name: {
            value: 'ZipRelateToOneInput',
          },
          fields: [
            {
              kind: 'InputValueDefinition',
              name: {
                value: 'create',
              },
              type: {
                name: {
                  value: 'ZipCreateInput',
                },
              },
            },
            {
              kind: 'InputValueDefinition',
              name: {
                value: 'connect',
              },
              type: {
                name: {
                  value: 'ZipWhereUniqueInput',
                },
              },
            },
            {
              kind: 'InputValueDefinition',
              name: {
                value: 'disconnect',
              },
              type: {
                name: {
                  value: 'ZipWhereUniqueInput',
                },
              },
            },
            {
              kind: 'InputValueDefinition',
              name: {
                value: 'disconnectAll',
              },
              type: {
                name: {
                  value: 'Boolean',
                },
              },
            },
          ],
        },
      ],
    });
  });

  test('to-many relationship nested mutation input', () => {
    const relationship = createRelationship({
      path: 'foo',
      config: { many: true, ref: 'Zip' },
    });

    // We're testing the AST is as we expect it to be
    expect(gql(relationship.getGraphqlAuxiliaryTypes().join('\n'))).toMatchObject({
      definitions: [
        {
          kind: 'InputObjectTypeDefinition',
          name: {
            value: 'ZipRelateToManyInput',
          },
          fields: [
            {
              kind: 'InputValueDefinition',
              name: {
                value: 'create',
              },
              type: {
                kind: 'ListType',
                type: {
                  name: {
                    value: 'ZipCreateInput',
                  },
                },
              },
            },
            {
              kind: 'InputValueDefinition',
              name: {
                value: 'connect',
              },
              type: {
                kind: 'ListType',
                type: {
                  name: {
                    value: 'ZipWhereUniqueInput',
                  },
                },
              },
            },
            {
              kind: 'InputValueDefinition',
              name: {
                value: 'disconnect',
              },
              type: {
                kind: 'ListType',
                type: {
                  name: {
                    value: 'ZipWhereUniqueInput',
                  },
                },
              },
            },
            {
              kind: 'InputValueDefinition',
              name: {
                value: 'disconnectAll',
              },
              type: {
                name: {
                  value: 'Boolean',
                },
              },
            },
          ],
        },
      ],
    });
  });

  test('to-single relationships cannot be filtered at the field level', () => {
    const path = 'foo';

    const relationship = createRelationship({
      path,
      config: { many: false, ref: 'Zip' },
    });

    // Wrap it in a mock type because all we get back is the fields
    const fieldSchema = `
      type MockType {
        ${relationship.getGraphqlOutputFields().join('\n')}
      }
    `;

    const fieldAST = gql(fieldSchema);

    expect(fieldAST).toMatchObject({
      definitions: [
        {
          fields: [
            {
              kind: 'FieldDefinition',
              name: {
                value: path,
              },
              arguments: [],
              type: {
                name: {
                  value: 'Zip',
                },
              },
            },
          ],
        },
      ],
    });

    expect(fieldAST.definitions[0].fields[0].arguments).toHaveLength(0);
  });

  test('to-many relationships can be filtered at the field level', () => {
    const path = 'foo';

    const relationship = createRelationship({
      path,
      config: { many: true, ref: 'Zip' },
    });

    // Wrap it in a mock type because all we get back is the fields
    const fieldSchema = `
      type MockType {
        ${relationship.getGraphqlOutputFields().join('\n')}
      }
    `;

    const fieldAST = gql(fieldSchema);

    expect(fieldAST).toMatchObject({
      definitions: [
        {
          fields: [
            {
              kind: 'FieldDefinition',
              name: {
                value: 'foo',
              },
              arguments: mockFilterAST,
              type: {
                kind: 'ListType',
                type: {
                  name: {
                    value: 'Zip',
                  },
                },
              },
            },
          ],
        },
      ],
    });

    expect(fieldAST.definitions[0].fields[0].arguments).toHaveLength(1);
  });
});