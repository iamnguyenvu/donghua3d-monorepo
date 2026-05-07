import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_key_change_me_2026',
  storageProvider: process.env.STORAGE_PROVIDER || 'LOCAL',
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost',
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Simple validations
if (!config.databaseUrl) {
  console.error('❌ Error: DATABASE_URL is not specified in the environment variables!');
}
