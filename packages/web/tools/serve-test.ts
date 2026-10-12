// Servidor aislado para pruebas de UI. Nunca se usa en producción ni en la entrega.
process.env.DATABASE_URL = 'file:/home/user/king-adrian-phase2-test.db';
process.env.DATABASE_AUTH_TOKEN = '';
const { default: app } = await import('../src/api');
const server = Bun.serve({ port: 4211, fetch: request => app.fetch(request) });
console.log('API de prueba aislada:', server.port);