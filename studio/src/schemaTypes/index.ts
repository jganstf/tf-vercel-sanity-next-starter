import {person} from './documents/person'
import {page} from './documents/page'
import {post} from './documents/post'
import {postCategory} from './documents/postCategory'
import {callToAction} from './objects/callToAction'
import {infoSection} from './objects/infoSection'
import {settings} from './singletons/settings'
import {postSettings} from './singletons/postSettings'
import {link} from './objects/link'
import {blockContent} from './objects/blockContent'
import button from './objects/button'
import {blockContentTextOnly} from './objects/blockContentTextOnly'

export const schemaTypes = [
  // Singletons
  settings,
  postSettings,
  // Documents
  page,
  post,
  postCategory,
  person,
  // Objects
  button,
  blockContent,
  blockContentTextOnly,
  infoSection,
  callToAction,
  link,
]
