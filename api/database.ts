import { Logger } from 'ts-framework';

import {
  createConnection, getConnectionOptions,
  Connection, EntityManager, Repository, ObjectType, EntitySchema,
} from 'typeorm';

import Config from '../config';
import { EntityDatabase } from '../../lib';
import * as Models from './models';

export default class MainDatabase extends EntityDatabase {
  protected static readonly instance: MainDatabase = new MainDatabase({
    connectionOpts: {
      ...Config.database,
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