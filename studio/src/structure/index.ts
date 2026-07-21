import {CogIcon, DocumentIcon, TagIcon} from '@sanity/icons'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import pluralize from 'pluralize-esm'

/**
 * Structure builder is useful whenever you want to control how documents are grouped and
 * listed in the studio or for adding additional in-studio previews or content to documents.
 * Learn more: https://www.sanity.io/docs/structure-builder-introduction
 */

const DISABLED_TYPES = ['settings', 'header', 'footer', 'media.tag', 'assist.instruction.context']

export const structure: StructureResolver = (S: StructureBuilder) =>
  S.list()
    .title('Website Content')
    .items([
      ...S.documentTypeListItems()
        // Remove the "assist.instruction.context", "settings", "header", "footer", and "media.tag" content from the list of content types
        .filter((listItem: any) => !DISABLED_TYPES.includes(listItem.getId()))
        // Pluralize the title of each document type.  This is not required but just an option to consider.
        .map((listItem) => {
          return listItem.title(pluralize(listItem.getTitle() as string))
        }),
      S.divider(),
      // Header Singleton in order to view/edit the one particular document for Header.
      S.listItem()
        .title('Header')
        .child(S.document().schemaType('header').documentId('header'))
        .icon(DocumentIcon),
      // Footer Singleton in order to view/edit the one particular document for Footer.
      S.listItem()
        .title('Footer')
        .child(S.document().schemaType('footer').documentId('footer'))
        .icon(DocumentIcon),
      // Media Tags list, moved out of the generic content list to sit alongside Header/Footer.
      S.listItem()
        .title('Media Tags')
        .child(S.documentTypeList('media.tag').title('Media Tags'))
        .icon(TagIcon),
      S.divider(),
      // Settings Singleton in order to view/edit the one particular document for Settings.  Learn more about Singletons: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
      S.listItem()
        .title('Site Settings')
        .child(S.document().schemaType('settings').documentId('siteSettings'))
        .icon(CogIcon),
    ])
