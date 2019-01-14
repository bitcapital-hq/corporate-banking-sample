import ConfigLoader from "./utils/ConfigLoader";
ConfigLoader.initialize(process.env.NODE_ENV);

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
import { AuthService, PaymentService, PayrollService, PersonService, DomainService } from "./services";
import BitCapital from "./BitCapital";

// Prepare server port
const port = process.env.PORT as any || 3000;

// Prepare global logger instance
const sentry = process.env.SENTRY_DSN ? { dsn: process.env.SENTRY_DSN } : undefined;
const logger = Logger.getInstance({ sentry });

const fileUpload = require('express-fileupload');
const app: express.Application = express();
app.use(fileUpload());

export default class MainServer extends Server {
  public bitCapital: BitCapital;
  public authService: AuthService;
  public domainService: DomainService;
  public paymentService: PaymentService;
  public payrollService: PayrollService;
  public personService: PersonService;
  
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
      ],
      ...options,
    }, app);
  }

  async onReady() {
    await super.onReady();
    
    this.bitCapital = await BitCapital.initialize();
    this.personService = PersonService.initialize({ logger: this.logger });
    this.authService = AuthService.initialize({ logger: this.logger });
    this.domainService = DomainService.initialize({ logger: this.logger });
    this.paymentService = PaymentService.initialize({ logger: this.logger });
    this.payrollService = PayrollService.initialize({ logger: this.logger });
  }
}