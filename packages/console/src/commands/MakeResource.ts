import { MakeResource as MakeResourceBase, applyRuntimeConfig, getDefaultConfig } from 'resora'

import { config } from '@arkstack/common'

export class MakeResource extends MakeResourceBase {
    async handle(): Promise<undefined> {
        try {
            applyRuntimeConfig({ ...getDefaultConfig(), ...config('resources', {}) })
        } catch { /** */ }

        return super.handle()
    }
}
