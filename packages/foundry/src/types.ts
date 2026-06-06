// Augmentable Hooks Registry 
export interface HookRegistry { }

type Position = 'before' | 'after' | (string & {})

export type IHook = {
    [P in Position]?: (...args: any[]) => void
}

// Derive available hook names
export type HookName = keyof HookRegistry extends never ? string : keyof HookRegistry | (string & {})

// Derive the IHook type for a given name
export type HookFor<N extends string> = N extends keyof HookRegistry
    ? HookRegistry[N]
    : IHook

export type HookPos<N extends string, P extends string> = N extends keyof HookRegistry
    ? P extends keyof HookRegistry[N]
    ? HookRegistry[N][P]
    : (...args: any[]) => void
    : (...args: any[]) => void

export type HookPositions<N extends string> = N extends keyof HookRegistry
    ? keyof HookRegistry[N]
    : Position

export type HookArgs<N extends string, P extends string> = N extends keyof HookRegistry
    ? P extends keyof HookRegistry[N]
    ? HookRegistry[N][P] extends (...args: infer A) => any
    ? A
    : any[]
    : any[]
    : any[]