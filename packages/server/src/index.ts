import path from 'node:path';
import { createServer } from './server';

export { createServer } from './server';
export type { CreateServerOptions } from './server';

const port = Number(process.env.CUECLOCK_PORT ?? 8420);
const webDist = path.resolve(__dirname, '../../web/dist');

const { httpServer, engine } = createServer({ port, webDist });

httpServer.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`CueClock server listening on http://0.0.0.0:${port}`);
  // eslint-disable-next-line no-console
  console.log(`  Control: http://localhost:${port}/control.html`);
  // eslint-disable-next-line no-console
  console.log(`  Display: http://localhost:${port}/display.html`);
});

process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0));
});

export { engine };
