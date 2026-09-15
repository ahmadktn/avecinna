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

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // 1. Register CORS
  await fastify.register(cors, {
    origin: true,
  });

  // 2. Register Auth Plugin (JWT & Session resolver)
  await fastify.register(authPlugin);

  // 3. Register Route Modules
  await fastify.register(authRoutes, { prefix: '/api/v1' });
  await fastify.register(adminRoutes, { prefix: '/api/v1' });
  await fastify.register(unitRoutes, { prefix: '/api/v1' });
  await fastify.register(patientRoutes, { prefix: '/api/v1' });
  await fastify.register(breakGlassRoutes, { prefix: '/api/v1' });
  await fastify.register(documentsRoutes, { prefix: '/api/v1' });
  await fastify.register(auditRoutes, { prefix: '/api/v1' });

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
  });
}
