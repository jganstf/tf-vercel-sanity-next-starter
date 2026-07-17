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

// Builds the full nested URL path for a page by walking up to 4 levels of `parent` references,
// e.g. a page nested two levels deep resolves to "grandparent/parent/child".
const pagePathExpr = /* groq */ `
  array::join(
    [
      parent->parent->parent->parent->slug.current,
      parent->parent->parent->slug.current,
      parent->parent->slug.current,
      parent->slug.current,
      slug.current
    ][defined(@)],
    "/"
  )
`

const pagePath = /* groq */ `"path": ${pagePathExpr}`

const linkReference = /* groq */ `
  _type == "link" => {
    "page": page->{${pagePath}}.path,
    "post": post->slug.current
  }
`

const linkFields = /* groq */ `
  link {
      ...,
      ${linkReference}
      }
`

export const footerQuery = defineQuery(`
  *[_type == "footer"][0]{
    legalMenu[]{
      label,
      ${linkFields}
    }
  }
`)

export const getPageQuery = defineQuery(`
  *[_type == 'page']{
    _id,
    _type,
    title,
    slug,
    parent,
    ${pagePath},
    "seo": {
      "title": coalesce(seo.title, title),
      "description": seo.description,
      "image": seo.image,
      "noIndex": seo.noIndex == true
    },
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
  }[path == $slug][0]
`)

export const sitemapData = defineQuery(`
  *[_type == "page" || _type == "post" && defined(slug.current)] | order(_type asc) {
    "slug": select(_type == "page" => ${pagePathExpr}, slug.current),
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
  {${pagePath}}
`)
