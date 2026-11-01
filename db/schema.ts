import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const projects = sqliteTable('studio_projects', {
  id: text('id').primaryKey(),
  document: text('document').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
export const credentials = sqliteTable('studio_credentials', {
  provider: text('provider').primaryKey(),
  ciphertext: text('ciphertext').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const versions = sqliteTable('studio_versions', {
  id: text('id').primaryKey(),
  document: text('document').notNull(),
  createdAt: text('created_at').notNull(),
  commit: text('commit'),
  url: text('url'),
  kind: text('kind').notNull().default('snapshot'),
});
