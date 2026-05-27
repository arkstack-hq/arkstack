export type KitName = 'express' | 'h3' | 'fastify' | 'koa' | 'nest' | 'next' | 'nuxt'

export interface Template {
    name: string;
    alias: 'express' | 'h3' | 'express-lean' | 'h3-lean';
    hint: string;
    source: string;
    lean?: boolean;
    locked?: boolean;
    baseAlias?: 'express' | 'h3';
    prereleaseSource?: string;
}