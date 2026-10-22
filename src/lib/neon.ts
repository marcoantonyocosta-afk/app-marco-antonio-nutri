import { createAuthClient } from '@neondatabase/auth';
import { neon } from '@neondatabase/serverless';

const authUrl =
  import.meta.env.VITE_NEON_AUTH_URL || '';

const databaseUrl =
  import.meta.env.VITE_NEON_DATABASE_URL || '';

export const authClient = createAuthClient(authUrl);

export const sql = neon(databaseUrl);

