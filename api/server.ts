import { Logger } from 'ts-framework-common';
import Server, { ServerOptions } from 'ts-framework';
import StatusController from './controllers/StatusController';
import UptimeService from './services/UptimeService';

// Prepare server port
const port = process.env.PORT as any || 3000;

// Prepare global logger instance
const sentry = process.env.SENTRY_DSN ? { dsn: process.env.SENTRY_DSN } : undefined;
const logger = Logger.getInstance({ sentry });

export default class MainServer extends Server {
  constructor(options?: ServerOptions) {
    super({
      port,
      logger,
      sentry,
      router: { 
        controllers: { StatusController } 
      },
      children: [
        UptimeService.getInstance()
      ],
      ...options,
    });
  }
}
