import { EntityDatabase } from "ts-framework-sql";
import DatabaseConfig from '../config/database.config';
import * as Models from './models';

export default class MainDatabase extends EntityDatabase {
  protected static readonly instance: MainDatabase = new MainDatabase({
    connectionOpts: {
      ...DatabaseConfig,
      entities: Object.values(Models),
    },
  } as any);

  /**
   * Gets the singleton database instance.
   */
  static getInstance(): any {
    return this.instance;
  }
}