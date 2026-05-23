import type { ComposerRunner, SyncComposerRunner, ViewData } from './types'

import { mergeData, normalizeViewData } from './helpers'

export class ViewInstance implements PromiseLike<string> {
    private payload: ViewData
    private composersHaveRun = false

    constructor(
        readonly name: string,
        data: ViewData = {},
        private renderer: {
            render: (name: string, data?: ViewData) => Promise<string>
            renderSync: (name: string, data?: ViewData) => string
        },
        private runComposers: ComposerRunner,
        private runComposersSync: SyncComposerRunner,
        private renderName = name,
    ) {
        this.payload = normalizeViewData({ ...data })
    }

    get data () {
        return this.payload
    }

    with (key: string, value: any): this
    with (data: ViewData): this
    with (...data: any[]): this {
        mergeData(this.payload, data)

        return this
    }

    async render () {
        await this.compose()

        return await this.renderer.render(this.renderName, this.payload)
    }

    renderSync () {
        this.composeSync()

        return this.renderer.renderSync(this.renderName, this.payload)
    }

    then<TResult1 = string, TResult2 = never> (
        onfulfilled?: ((value: string) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
        return this.render().then(onfulfilled, onrejected)
    }

    private async compose () {
        if (this.composersHaveRun) {
            return
        }

        this.composersHaveRun = true
        await this.runComposers(this)
    }

    private composeSync () {
        if (this.composersHaveRun) {
            return
        }

        this.composersHaveRun = true
        this.runComposersSync(this)
    }
}
