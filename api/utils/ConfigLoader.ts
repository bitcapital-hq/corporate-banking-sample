import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { Logger } from "ts-framework-common";

export default class ConfigLoader {
  private static logger = Logger.getInstance();
  
  public static initialize(environment: string = "development") {
    const envPath = path.join(process.cwd(), "./config/env", `${environment}.env`);

    if (fs.existsSync(envPath)) {
      dotenv.config({
        path: envPath,
        debug: true
      });
      
      this.logger.debug(`Environment config loaded successfully from "${environment}.env"`);
    } else this.logger.warn(`Could not locate environment file at "${environment}.env"`);
  }
}