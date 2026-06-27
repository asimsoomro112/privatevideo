/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");

const target = process.argv[2];

if (!target || !["sqlite", "postgresql"].includes(target)) {
  console.error("Usage: node scripts/switch-db.js [sqlite|postgresql]");
  process.exit(1);
}

const schemaPath = path.join(__dirname, "../prisma/schema.prisma");

if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found at: ${schemaPath}`);
  process.exit(1);
}

let schemaContent = fs.readFileSync(schemaPath, "utf8");

// 1. Switch the provider
const providerRegex = /(datasource\s+db\s*{[\s\S]*?provider\s*=\s*")(\w+)("[\s\S]*?})/i;

if (!providerRegex.test(schemaContent)) {
  console.error("Could not find datasource db block with provider config in schema.prisma");
  process.exit(1);
}

schemaContent = schemaContent.replace(providerRegex, `$1${target}$3`);

// 2. Handle directUrl: present for postgresql, removed for sqlite
const hasDirectUrl = /directUrl\s*=/.test(schemaContent);

if (target === "sqlite") {
  // Remove the directUrl line for SQLite (SQLite doesn't support it)
  schemaContent = schemaContent.replace(/\n?\s*directUrl\s*=\s*env\([^)]*\)\n?/g, "\n");
} else if (target === "postgresql" && !hasDirectUrl) {
  // Add directUrl after the url line for PostgreSQL
  schemaContent = schemaContent.replace(
    /(url\s*=\s*env\("[^"]*"\))/,
    '$1\n  directUrl = env("DIRECT_URL")'
  );
}

fs.writeFileSync(schemaPath, schemaContent, "utf8");
console.log(`Successfully switched database provider in schema.prisma to "${target}"`);
