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
 * existing `post.author` references would continue to resolve correctly
 * after this migration runs, now pointing at documents of type `staff`
 * instead of `person`, assuming the `_type` patch is accepted — see the
 * warning below.
 *
 * IMPORTANT: Sanity's content lake may reject in-place `_type` patches
 * (`_type` is typically treated as immutable). Before running this against
 * a real dataset, first validate with `--dry-run` against a scratch/staging
 * dataset that this patch is actually accepted. If it's rejected, the
 * correct fallback is a create-new-document-as-`staff` + delete-old-
 * `person`-document migration instead of an in-place `_type` patch — and
 * any code changes needed to preserve the original `_id` (so `post.author`
 * references keep resolving) if you switch strategies.
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
