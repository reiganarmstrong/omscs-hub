interface Env {
  DB: D1Database;
  CLERK_SECRET_KEY: string;
  CORS_ORIGIN?: string;
  OPERATOR_CLERK_USER_ID?: string;
}
