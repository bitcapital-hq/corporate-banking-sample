import { EntityDatabase } from "ts-framework-sql";
import DatabaseConfig from '../config/database.config';
import * as Models from './models';

export default class MainDatabase extends EntityDatabase {
  public static readonly ENTITIES = [
    Models.Address,
    Models.BankAccount,
    Models.Boleto,
    Models.Payment,
    Models.Company,
    Models.Document,
    Models.Phone,
    Models.Person,
    Models.Accountable,
    Models.Wallet,
    Models.Session,
    Models.Salary
  ];

  protected static readonly instance: MainDatabase = new MainDatabase({
    connectionOpts: {
      ...DatabaseConfig,
      entities: Object.values(MainDatabase.ENTITIES),
    },
  } as any);

  /**
   * Gets the singleton database instance.
   */
  static getInstance(): any {
    return this.instance;
  }
}