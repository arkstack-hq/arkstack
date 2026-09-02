import { Job } from '../../../../src'

/** An abstract base: not instantiable, so it must not be registered. */
export abstract class BaseFixtureJob extends Job { }

export class LoadedJob extends BaseFixtureJob {
    async handle () { }
}

export class AlsoLoadedJob extends Job {
    async handle () { }
}

/** A plain export that isn't a job at all. */
export const notAJob = () => 'nope'
