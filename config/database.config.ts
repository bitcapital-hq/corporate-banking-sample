export default {
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5434", 10),
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "postgres",
  database: process.env.DATABASE_NAME || "my_bank",
  synchronize: true,
  logging: ["error"],

  // IMPORTANT: Path should be relative to root
  entities: ["./api/models/**/*.ts"],
  migrations: ["./api/migrations/**/*.ts"],
  cli: {
    // IMPORTANT: Path should be relative to root
    entitiesDir: "./api/models",
    migrationsDir: "./api/migrations"
  }
};
