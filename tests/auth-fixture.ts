import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
export const sql = new DatabaseSync(':memory:');
sql.exec(readFileSync(new URL('../drizzle/0000_furry_inhumans.sql', import.meta.url), 'utf8'));
// Seed before the additive migration to verify real legacy records survive it.
export function migrateAccounts() {
  sql.exec(
    readFileSync(new URL('../drizzle/0001_conscious_frightful_four.sql', import.meta.url), 'utf8'),
  );
}
export const requestContext = new AsyncLocalStorage<Headers>();
export async function headers() {
  return requestContext.getStore() || new Headers();
}
const db = {
  prepare(query: string) {
    const statement = sql.prepare(query);
    let values: any[] = [];
    return {
      bind(...args: any[]) {
        values = args;
        return this;
      },
      async first() {
        return statement.get(...values) ?? null;
      },
      async all() {
        return { results: statement.all(...values), success: true };
      },
      async run() {
        const result = statement.run(...values);
        return { meta: { changes: Number(result.changes) }, success: true };
      },
    };
  },
} as unknown as D1Database;
export const env = {
  DB: db,
  STUDIO_LEGACY_OWNER_EMAIL: 'owner@example.test',
  STUDIO_ENCRYPTION_KEY: btoa('0123456789abcdef0123456789abcdef'),
};
