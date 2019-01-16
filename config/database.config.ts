export default {
  type: "postgres",
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
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
