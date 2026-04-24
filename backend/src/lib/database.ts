export type SupportedDbType = 'mongodb' | 'postgresql' | 'mysql';

const DB_TYPE_ALIASES: Record<string, SupportedDbType> = {
  mongodb: 'mongodb',
  mongo: 'mongodb',
  postgresql: 'postgresql',
  postgres: 'postgresql',
  supabase: 'postgresql',
  mysql: 'mysql',
};

export function normalizeDbType(input?: string): SupportedDbType | null {
  if (!input) return null;
  const normalized = DB_TYPE_ALIASES[input.trim().toLowerCase()];
  return normalized || null;
}

export function detectDatabaseType(databaseUrl?: string, dbTypeOverride?: string): SupportedDbType {
  const normalizedOverride = normalizeDbType(dbTypeOverride);
  if (normalizedOverride) {
    return normalizedOverride;
  }

  if (!databaseUrl || !databaseUrl.trim()) {
    throw new Error('DATABASE_URL is required but was not provided.');
  }

  const normalizedUrl = databaseUrl.trim().toLowerCase();

  if (normalizedUrl.startsWith('mongodb://') || normalizedUrl.startsWith('mongodb+srv://')) {
    return 'mongodb';
  }

  if (normalizedUrl.includes('supabase.co')) {
    return 'postgresql';
  }

  if (normalizedUrl.startsWith('postgresql://') || normalizedUrl.startsWith('postgres://')) {
    return 'postgresql';
  }

  if (normalizedUrl.startsWith('mysql://')) {
    return 'mysql';
  }

  return 'mongodb';
}

export function getDetectedDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  const dbTypeOverride = process.env.DB_TYPE;
  const dbType = detectDatabaseType(databaseUrl, dbTypeOverride);

  return {
    dbType,
    databaseUrl,
    dbTypeOverride,
    isSupabase: (databaseUrl || '').toLowerCase().includes('supabase.co'),
  };
}
