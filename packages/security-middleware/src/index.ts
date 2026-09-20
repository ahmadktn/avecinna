/**
 * @avecina/security-middleware
 * Compatibility wrapper re-exporting from the universal @avecina/sdk
 */

export * from '../../security-sdk/src/index.js';
export { createAvecinnaExpressMiddleware } from './express/avecinnaExpress.js';
export { createAvecinnaFastifyPlugin } from './fastify/avecinnaFastify.js';
