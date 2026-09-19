import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/authPlugin';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import unitRoutes from './routes/unit';
import patientRoutes from './routes/patients';
import { breakGlassRoutes } from './routes/breakGlass';
import { documentsRoutes } from './routes/documents';
import { auditRoutes } from './routes/audit';
import { healthRoutes } from './routes/health';
import appointmentsRoutes from './routes/appointments';
import clerkRoutes from './routes/clerk';

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        keywords: ['example'],
      },
    },
  });

  // 1. Register CORS
  await fastify.register(cors, {
    origin: true,
  });

  // Handle empty JSON bodies gracefully without throwing FST_ERR_CTP_EMPTY_JSON_BODY
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, defaultDone) => {
    if (typeof body === 'string' && body.trim() === '') {
      return defaultDone(null, {});
    }
    try {
      const json = JSON.parse(body as string);
      defaultDone(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      defaultDone(err, undefined);
    }
  });

  // 2. Register Swagger Documentation (if installed)
  try {
    const swaggerModule: any = await import('@fastify/swagger');
    const swaggerUiModule: any = await import('@fastify/swagger-ui');

    await fastify.register(swaggerModule.default || swaggerModule, {
      openapi: {
        info: {
          title: 'Avecinna Secure EMR API',
          description:
            'Context-Aware Secure Electronic Medical Records API (CAAC, Two-Tier Break-Glass, OWASP API3 Admin Redaction, Isolated Merkle Audit Ledger)',
          version: '1.0.0',
        },
        tags: [
          {
            name: 'Authentication & Profile',
            description:
              'User login, active ward context switching, session details, and self profile updates.',
          },
          {
            name: 'User & Ward Administration',
            description:
              'Full staff account management (CRUD), role assignment, and hospital ward creation (System Admin ONLY).',
          },
          {
            name: 'Head of Unit Supervision',
            description:
              'Ward staff roster inspection and security alert monitoring for department heads.',
          },
          {
            name: 'Patient Records (CAAC & DTO)',
            description:
              'Context-Aware Access Control (CAAC) evaluated patient directory & role-scoped DTO masking.',
          },
          {
            name: 'Two-Tier Break-Glass Emergency',
            description:
              'Tier 1 fast emergency summary & Tier 2 reasoned full record unlock with audit logging.',
          },
          {
            name: 'Medical Documents & Lab Results',
            description:
              'Document upload and lab result attachments with binary SHA-256 integrity hashing.',
          },
          {
            name: 'Cryptographic Audit Ledger & Security Alerts',
            description:
              'Real-time SHA-256 linear hash chain & Merkle Tree verification and security alert management.',
          },
          {
            name: 'System Health',
            description: 'Dual PostgreSQL database connection health monitoring.',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    });

    await fastify.register(swaggerUiModule.default || swaggerUiModule, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });
    fastify.log.info('📚 Swagger OpenAPI documentation registered at /docs');
  } catch (err) {
    fastify.log.warn(
      'Swagger dependencies not loaded. Install via: bun add @fastify/swagger @fastify/swagger-ui'
    );
  }

  // 3. Register Auth Plugin (JWT & Session resolver)
  await fastify.register(authPlugin);

  // 4. Register Health Check Route
  await fastify.register(healthRoutes);

  // 5. Register Route Modules
  await fastify.register(authRoutes, { prefix: '/api/v1' });
  await fastify.register(adminRoutes, { prefix: '/api/v1' });
  await fastify.register(unitRoutes, { prefix: '/api/v1' });
  await fastify.register(patientRoutes, { prefix: '/api/v1' });
  await fastify.register(breakGlassRoutes, { prefix: '/api/v1' });
  await fastify.register(documentsRoutes, { prefix: '/api/v1' });
  await fastify.register(auditRoutes, { prefix: '/api/v1' });
  await fastify.register(appointmentsRoutes, { prefix: '/api/v1' });
  await fastify.register(clerkRoutes, { prefix: '/api/v1' });

  return fastify;
}

if (process.env.NODE_ENV !== 'test') {
  const server = await buildApp();
  const port = Number(process.env.PORT) || 4000;
  const host = process.env.HOST || '0.0.0.0';

  server.listen({ port, host }, (err, address) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
    server.log.info(`🚀 Avecinna Fastify Backend running at ${address}`);
    server.log.info(`📋 Swagger UI Documentation available at ${address}/docs`);
    server.log.info(`🏥 System Health Check endpoint available at ${address}/health`);
  });
}
