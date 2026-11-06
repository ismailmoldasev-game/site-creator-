import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const accounts = sqliteTable('studio_accounts', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().unique(),
  createdAt: text('created_at').notNull(),
});
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
export const versions = sqliteTable(
  'studio_versions',
  {
    id: text('id').primaryKey(),
    document: text('document').notNull(),
    createdAt: text('created_at').notNull(),
    commit: text('commit'),
    url: text('url'),
    kind: text('kind').notNull().default('snapshot'),
    projectId: text('project_id').notNull().default('main'),
  },
  (table) => [index('studio_versions_project_created').on(table.projectId, table.createdAt)],
);
