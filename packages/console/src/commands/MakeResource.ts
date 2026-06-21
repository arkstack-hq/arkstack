import { MakeResource as MakeResourceBase, applyRuntimeConfig, getDefaultConfig } from 'resora'

import { config } from '@arkstack/common'

export class MakeResource extends MakeResourceBase {
    async handle (): Promise<undefined> {
        // Apply the application's resora configuration (src/config/resources.ts)
        // merged over resora's defaults so generation works without a standalone
        // resora.config.js.
        try {
            applyRuntimeConfig({ ...getDefaultConfig(), ...config('resources', {}) })
        } catch {
            /** No resources config; fall back to resora defaults. */
        }

        return super.handle()
    }
}
