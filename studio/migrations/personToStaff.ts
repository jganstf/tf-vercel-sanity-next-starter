import {defineMigration, at, set} from 'sanity/migrate'

/**
 * One-time migration: renames every `person` document to `staff`.
 *
 * This does NOT backfill the new required `slug` or `department` fields —
 * there's no reasonable automatic default for either, so migrated documents
 * will show validation warnings in Studio until an editor fills them in.
 *
 * Reference integrity: `post.author` references store only a document `_id`,
 * and this migration does not change any document `_id` — only `_type` — so
 * existing `post.author` references continue to resolve correctly after this
 * migration runs, now pointing at documents of type `staff` instead of `person`.
 *
 * To run this migration against a real dataset (do this manually, not as
 * part of any automated process):
 *   npx sanity migration run personToStaff --project <projectId> --dataset <dataset>
 * Add --no-dry-run once you've reviewed the dry-run output.
 */
export default defineMigration({
  title: 'Convert person documents to staff',
  documentTypes: ['person'],
  migrate: {
    document(doc) {
      return [at('_type', set('staff'))]
    },
  },
})
