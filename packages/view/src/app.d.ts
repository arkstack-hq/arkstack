import type { view as viewHelper } from './helpers'

declare global {
    var view: typeof viewHelper
}

export {}
