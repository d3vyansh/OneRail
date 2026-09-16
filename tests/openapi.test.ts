import request from 'supertest';
import { app } from '../src/app';
import { generateOpenApiDocument } from '../src/openapi/document';

describe('GET /openapi.json', () => {
  it('returns a valid-looking OpenAPI document', async () => {
    const res = await request(app).get('/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toBe('OneRail API');
  });

  it('documents every real route the app actually exposes', async () => {
    const res = await request(app).get('/openapi.json');
    const paths = Object.keys(res.body.paths);

    expect(paths.sort()).toEqual(
      [
        '/health',
        '/api/v1/user/signup',
        '/api/v1/user/signin',
        '/api/v1/train/checktrains',
        '/api/v1/train/checkfare',
        '/api/v1/train/subscribe-pnr',
      ].sort()
    );
  });

  it('documents the actual custom token header, not a generic Bearer scheme', async () => {
    const res = await request(app).get('/openapi.json');
    const scheme = res.body.components.securitySchemes.tokenAuth;

    expect(scheme).toEqual(
      expect.objectContaining({ type: 'apiKey', in: 'header', name: 'token' })
    );
  });
});

describe('GET /docs', () => {
  it('serves the Swagger UI HTML page', async () => {
    const res = await request(app).get('/docs/');

    expect(res.status).toBe(200);
    expect(res.type).toBe('text/html');
    expect(res.text).toContain('swagger-ui');
  });
});

describe('generateOpenApiDocument', () => {
  it('produces a document that is internally consistent across calls', () => {
    // Registration happens at module load, so this mainly guards against
    // someone accidentally making generation stateful/order-dependent.
    const first = generateOpenApiDocument();
    const second = generateOpenApiDocument();
    expect(first).toEqual(second);
  });
});
