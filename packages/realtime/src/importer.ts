import type { ModuleImporter } from './types'

/**
 * Load an optional SDK by its package specifier. Non-literal so bundlers leave
 * SDKs the app does not use out of the bundle.
 *
 * @param specifier
 * @returns
 */
export const defaultImporter: ModuleImporter = (specifier) => import(/* @vite-ignore */ specifier)
