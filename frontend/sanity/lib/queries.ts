import {defineQuery} from 'next-sanity'

export const settingsQuery = defineQuery(`*[_type == "settings"][0]`)

const postFields = /* groq */ `
  _id,
  "status": select(_originalId in path("drafts.**") => "draft", "published"),
  "title": coalesce(title, "Untitled"),
  "slug": slug.current,
  excerpt,
  coverImage,
  "date": coalesce(date, _updatedAt),
  "author": author->{firstName, lastName, picture},
`

const linkReference = /* groq */ `
  _type == "link" => {
    "page": page->slug.current,
    "post": post->slug.current
  }
`

const linkFields = /* groq */ `
  link {
      ...,
      ${linkReference}
      }
`

export const getPageQuery = defineQuery(`
  *[_type == 'page' && slug.current == $slug][0]{
    _id,
    _type,
    name,
    slug,
    heading,
    subheading,
    "pageBuilder": pageBuilder[]{
      ...,
      _type == "callToAction" => {
        ...,
        button {
          ...,
          ${linkFields}
        }
      },
      _type == "infoSection" => {
        content[]{
          ...,
          markDefs[]{
            ...,
            ${linkReference}
          }
        }
      },
    },
  }
`)

export const sitemapData = defineQuery(`
  *[_type == "page" || _type == "post" && defined(slug.current)] | order(_type asc) {
    "slug": slug.current,
    _type,
    _updatedAt,
  }
`)

export const allPostsQuery = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(date desc, _updatedAt desc) {
    ${postFields}
  }
`)

export const morePostsQuery = defineQuery(`
  *[_type == "post" && _id != $skip && defined(slug.current)] | order(date desc, _updatedAt desc) [0...$limit] {
    ${postFields}
  }
`)

export const postQuery = defineQuery(`
  *[_type == "post" && slug.current == $slug] [0] {
    content[]{
    ...,
    markDefs[]{
      ...,
      ${linkReference}
    }
  },
    ${postFields}
  }
`)

export const postPagesSlugs = defineQuery(`
  *[_type == "post" && defined(slug.current)]
  {"slug": slug.current}
`)

export const pagesSlugs = defineQuery(`
  *[_type == "page" && defined(slug.current)]
  {"slug": slug.current}
`)

export const faqSettingsQuery = defineQuery(`*[_type == "faqSettings"][0]{
  title,
  intro,
  defaultSeo,
}`)

// Resolves a faqCategory's own nested parent chain up to 5 levels deep.
// GROQ has no native arbitrary recursion, so this is a practical bound
// rather than a guarantee of arbitrary depth.
const faqCategoryPath = /* groq */ `
  "pathSegments": [
    parent->parent->parent->parent->slug.current,
    parent->parent->parent->slug.current,
    parent->parent->slug.current,
    parent->slug.current,
    slug.current
  ][defined(@)]
`

export const faqCategoryTreeQuery = defineQuery(`
  *[_type == "faqCategory" && defined(slug.current)]{
    _id,
    title,
    ${faqCategoryPath}
  }
`)

export const faqPagesSlugs = defineQuery(`
  *[_type == "faq" && defined(slug.current) && defined(category->slug.current)]{
    "path": [
      ...category->{${faqCategoryPath}}.pathSegments,
      slug.current
    ]
  }
`)

export const faqQuery = defineQuery(`
  *[_type == "faq" && slug.current == $slug && category->slug.current == $categorySlug][0]{
    _id,
    question,
    shortAnswer,
    longAnswer,
    seo,
    "category": category->{
      title,
      ${faqCategoryPath}
    },
  }
`)

export const faqsByCategoryQuery = defineQuery(`
  *[_type == "faq" && category->slug.current == $categorySlug] | order(question asc){
    question,
    shortAnswer,
    "slug": slug.current,
  }
`)
