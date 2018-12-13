export default {
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USER || "ricardo",
  password: process.env.DATABASE_PASSWORD || "ricardo",
  database: process.env.DATABASE_NAME || "ricardo",
  synchronize: true,
  logging: ["error", "query"],

  // IMPORTANT: Path should be relative to root
  entities: ["./api/models/**/*.ts"],
  migrations: ["./api/migrations/**/*.ts"],
  cli: {
    // IMPORTANT: Path should be relative to root
    entitiesDir: "./api/models",
    migrationsDir: "./api/migrations"
  }
};
