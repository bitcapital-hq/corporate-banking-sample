import { Logger } from 'ts-framework-common';
import * as express from "express";
import Server, { ServerOptions } from 'ts-framework';
import UptimeService from './services/UptimeService';
import MainDatabase from './database';
import { 
  AuthController, 
  StatusController, 
  PersonController, 
  DomainController, 
  PaymentController } from './controllers';

// Prepare server port
const port = process.env.PORT as any || 3000;

// Prepare global logger instance
const sentry = process.env.SENTRY_DSN ? { dsn: process.env.SENTRY_DSN } : undefined;
const logger = Logger.getInstance({ sentry });

const fileUpload = require('express-fileupload');
const app: express.Application = express();
app.use(fileUpload());

export default class MainServer extends Server {
  
  constructor(options?: ServerOptions) {
    super({
      port,
      logger,
      sentry,
      router: { 
        controllers: { 
          StatusController,  
          DomainController,
          PersonController,
          AuthController,
          PaymentController
        }
      },
      children: [
        UptimeService.getInstance(),
        MainDatabase.getInstance()
        //ScheduledTasks.initialize()
      ],
      ...options,
    }, app);


  }
}
