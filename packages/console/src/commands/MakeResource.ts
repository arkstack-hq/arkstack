import { applyRuntimeConfig, getDefaultConfig } from 'resora'
import { MakeResource as MakeResourceBase } from 'resora/cli'

import { config } from '@arkstack/common'

export class MakeResource extends MakeResourceBase {
  async handle(): Promise<undefined> {
    try {
      applyRuntimeConfig({ ...getDefaultConfig(), ...config('resources', {}) })
    } catch {
      /** */
    }

    return super.handle()
  }
}
