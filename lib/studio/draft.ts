import { projectSchema, type Project } from './model';
/** A local edit may be replayed only against its original server base. */
export function recoverDraft(raw: string, server: Project, revision: number) {
  const record = JSON.parse(raw);
  const project = projectSchema.parse(record.project);
  const serialized = JSON.stringify(project);
  const current = JSON.stringify(projectSchema.parse(server));
  if (serialized === current) return { kind: 'clean' as const, project };
  const sameBase =
    record.base !== undefined
      ? JSON.stringify(projectSchema.parse(record.base)) === current
      : record.revision === revision;
  return { kind: sameBase ? ('restore' as const) : ('conflict' as const), project };
}
