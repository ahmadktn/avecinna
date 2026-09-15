import Fastify from 'fastify';
import cors from '@fastify/cors';
import authPlugin from './plugins/authPlugin.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.ts';
import unitRoutes from './routes/unit.js';
import patientRoutes from './routes/patients.js';

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
  await fastify.register(authRoutes);
  await fastify.register(adminRoutes);
  await fastify.register(unitRoutes);
  await fastify.register(patientRoutes);

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
