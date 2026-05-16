export const openapiSpec = {
    openapi: '3.0.0',
    info: { title: 'Notes App API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/register': {
        post: {
          summary: 'Register a new user',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'User registered successfully' },
            '400': { description: 'Validation error' },
            '409': { description: 'Email already registered' },
          },
        },
      },
      '/login': {
        post: {
          summary: 'Login and receive JWT',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'JWT token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { access_token: { type: 'string' } },
                  },
                },
              },
            },
            '401': { description: 'Invalid email or password' },
          },
        },
      },
      '/notes': {
        get: {
          summary: 'Get all notes (paginated)',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'tag', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'List of notes' }, '401': { description: 'Unauthorized' } },
        },
        post: {
          summary: 'Create a note',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'content'],
                  properties: {
                    title: { type: 'string' },
                    content: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Note created' }, '401': { description: 'Unauthorized' } },
        },
      },
      '/notes/{id}': {
        get: { summary: 'Get note by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Note data' }, '404': { description: 'Not found' } } },
        put: { summary: 'Update note', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated note' }, '404': { description: 'Not found' } } },
        delete: { summary: 'Delete note', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } } },
      },
      '/notes/{id}/share': {
        post: { summary: 'Share note with a user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Shared' }, '404': { description: 'Note or user not found' } } },
      },
      '/notes/{id}/versions': {
        get: { summary: 'Get version history of a note', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Version history array' } } },
      },
      '/notes/search': {
        get: { summary: 'Full-text search notes', parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Matching notes' } } },
      },
      '/about': {
        get: { summary: 'About this API', security: [], responses: { '200': { description: 'Author info and features' } } },
      },
    },
  };