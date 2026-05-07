import type { Edge } from 'edge.js'
import type { ViewInstance } from './ViewInstance'

export type ComposerRunner = (view: ViewInstance) => Promise<void>

export type SyncComposerRunner = (view: ViewInstance) => void

export type ViewData = Record<string, any>

export type ViewName = string

export type ViewComposerHandler = (view: ViewInstance) => void | Promise<void>

export interface ViewComposerObject {
    compose: ViewComposerHandler
}

export type ViewComposerClass = new () => ViewComposerObject

export type ViewComposer = ViewComposerHandler | ViewComposerObject | ViewComposerClass

export type ViewComposerName = ViewName | ViewName[]

export type ViewFactoryOptions = {
    cache?: boolean
    viewsPath?: string | URL
    packageViewsPath?: string
    edge?: Edge
}
