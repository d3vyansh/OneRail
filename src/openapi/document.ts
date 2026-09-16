import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'OneRail API',
      version: '1.0.0',
      description:
        'Train search, fare lookup, and PNR status tracking over the IRCTC RapidAPI, with JWT-authenticated accounts.',
    },
    servers: [{ description: 'This server', url: '/' }],
  });
}
