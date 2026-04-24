const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const prismaDir = path.join(rootDir, 'prisma');
const targetSchemaPath = path.join(prismaDir, 'schema.prisma');
const mongoTemplatePath = path.join(prismaDir, 'schema.mongo.prisma');
const sqlTemplatePath = path.join(prismaDir, 'schema.sql.prisma');

const aliases = {
  mongodb: 'mongodb',
  mongo: 'mongodb',
  postgresql: 'postgresql',
  postgres: 'postgresql',
  supabase: 'postgresql',
  mysql: 'mysql',
};

function normalizeDbType(input) {
  if (!input) return null;
  return aliases[String(input).trim().toLowerCase()] || null;
}

function detectDatabaseType(databaseUrl, dbTypeOverride) {
  const override = normalizeDbType(dbTypeOverride);
  if (override) return override;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  const normalized = String(databaseUrl).trim().toLowerCase();

  if (normalized.startsWith('mongodb://') || normalized.startsWith('mongodb+srv://')) return 'mongodb';
  if (normalized.includes('supabase.co')) return 'postgresql';
  if (normalized.startsWith('postgresql://') || normalized.startsWith('postgres://')) return 'postgresql';
  if (normalized.startsWith('mysql://')) return 'mysql';

  return 'mongodb';
}

function loadTemplate(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeSchema(schema) {
  fs.writeFileSync(targetSchemaPath, schema, 'utf8');
}

function run() {
  const databaseUrl = process.env.DATABASE_URL;
  const dbTypeOverride = process.env.DB_TYPE;
  const dbType = detectDatabaseType(databaseUrl, dbTypeOverride);

  let schema;
  if (dbType === 'mongodb') {
    schema = loadTemplate(mongoTemplatePath);
  } else {
    const sqlProvider = dbType === 'mysql' ? 'mysql' : 'postgresql';
    schema = loadTemplate(sqlTemplatePath).replace(/__SQL_PROVIDER__/g, sqlProvider);
  }

  writeSchema(schema);

  const mode = dbType === 'mongodb' ? 'mongodb' : dbType === 'postgresql' ? 'postgresql/supabase' : 'mysql';
  console.log(`[prisma] schema.prisma prepared for ${mode}.`);
}

run();
