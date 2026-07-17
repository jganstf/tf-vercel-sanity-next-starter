import {CogIcon} from '@sanity/icons'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import pluralize from 'pluralize-esm'

/**
 * Structure builder is useful whenever you want to control how documents are grouped and
 * listed in the studio or for adding additional in-studio previews or content to documents.
 * Learn more: https://www.sanity.io/docs/structure-builder-introduction
 */

// Types handled manually below (nested lists / singletons) rather than via the default flat list.
const DISABLED_TYPES = [
  'settings',
  'postSettings',
  'post',
  'postCategory',
  'assist.instruction.context',
]

export const structure: StructureResolver = (S: StructureBuilder) =>
  S.list()
    .title('Website Content')
    .items([
      // Posts, nested with its Categories sub-list.
      S.listItem()
        .title('Posts')
        .child(
          S.list()
            .title('Posts')
            .items([
              S.documentTypeListItem('post').title('All Posts'),
              S.documentTypeListItem('postCategory').title('Categories'),
            ]),
        ),
      ...S.documentTypeListItems()
        // Remove types handled manually above from the default flat list.
        .filter((listItem: any) => !DISABLED_TYPES.includes(listItem.getId()))
        // Pluralize the title of each document type.  This is not required but just an option to consider.
        .map((listItem) => {
          return listItem.title(pluralize(listItem.getTitle() as string))
        }),
      // Settings Singleton in order to view/edit the one particular document for Settings.  Learn more about Singletons: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
      S.listItem()
        .title('Site Settings')
        .child(S.document().schemaType('settings').documentId('siteSettings'))
        .icon(CogIcon),
      S.listItem()
        .title('Post Settings')
        .child(S.document().schemaType('postSettings').documentId('postSettings'))
        .icon(CogIcon),
    ])
