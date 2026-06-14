/*
**  Extracted from @traits-ts/core - Traits for TypeScript Classes
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import type { Model as ArkormModel } from 'arkormx'

/**
 * CRC32 implementation in TypeScript, adapted from https://stackoverflow.com/a/18639999
 * Note: This implementation is not cryptographically secure and is only used for generating 
 * unique identifiers for traits based on their factory function's string representation. 
 */
const crcTable = [] as number[]
for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++)
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1))
    crcTable[n] = c
}
export const crc32 = (str: string) => {
    let crc = 0 ^ (-1)
    for (let i = 0; i < str.length; i++)
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF]

    return (crc ^ (-1)) >>> 0
}

type ResolveTraitLike<T extends Trait | TypeFactory<Trait>> =
    T extends TypeFactory<Trait>
    ? ExtractFactory<ReturnType<T>>
    : T extends Trait
    ? ExtractFactory<T>
    : unknown;

type Combine<T extends any[]> =
    T extends [infer Head, ...infer Tail]
    ? Head & Combine<Tail>
    : object;

type MapClassesToPrototypes<T extends Array<(new () => any) & { prototype: any }>> = {
    [K in keyof T]: T[K]['prototype'];
}

type MapClassesToInstances<T extends Array<(new () => any) & { prototype: any }>> = {
    [K in keyof T]: InstanceType<T[K]>;
}

type CombineClasses<T extends Array<(new () => any) & { prototype: any }>> =
    (new () => Combine<MapClassesToInstances<T>>) & { prototype: Combine<MapClassesToPrototypes<T>> };

type ResolveTraitLikeArray<T extends Array<Trait | TypeFactory<Trait>>> = CombineClasses<{
    [K in keyof T]: ResolveTraitLike<T[K]>;
}>;

/**
 * utility type and function: constructor (function)
 */
type Cons<T = any> =
    new (...args: any[]) => T
const isCons =
    <T = any>
        (fn: unknown): fn is Cons<T> =>
        typeof fn === 'function' && !!fn.prototype && !!fn.prototype.constructor

type ArkormModelCons<T extends ArkormModel = ArkormModel> =
    abstract new (...args: any[]) => T

type DirectCons<T = any> =
    Cons<T> | ArkormModelCons<ArkormModel>

type DirectBase =
    DirectCons | ArkormModel

const isArkormModelInstance =
    (value: unknown): value is ArkormModel =>
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { constructor?: unknown }).constructor === 'function' &&
        typeof (value as { getAttribute?: unknown }).getAttribute === 'function' &&
        typeof (value as { setAttribute?: unknown }).setAttribute === 'function'

/**
 * utility type and function: constructor factory (function)
 */
type ConsFactory<T extends Cons = Cons, B = any> =
    (base: B) => T

/**
 * utility type and function: type factory (function)
 */
type TypeFactory<T = any> =
    () => T
const isTypeFactory =
    <T = any>
        (fn: unknown): fn is TypeFactory<T> =>
        typeof fn === 'function' && !fn.prototype && fn.length === 0

/**
 * utility type: map an object type into a bare properties type
 */
type Explode<T = any> =
    { [P in keyof T]: T[P] }

/**
 * utility type: convert two arrays of types into an array of union types
 */
type MixParams<T1 extends any[], T2 extends any[]> =
    T1 extends [] ? (
        T2 extends [] ? [] : T2
    ) : (
        T2 extends [] ? T1 : (
            T1 extends [infer H1, ...infer R1] ? (
                T2 extends [infer H2, ...infer R2] ?
                [H1 & H2, ...MixParams<R1, R2>]
                : []
            ) : []
        )
    )

/**
 * API: trait type
 */
type TraitDefTypeT = ConsFactory<Cons>
type TraitDefTypeST = (Trait | TypeFactory<Trait>)[] | undefined
export type Trait<
    T extends TraitDefTypeT = TraitDefTypeT,
    ST extends TraitDefTypeST = TraitDefTypeST
> = {
    id: number  /* unique id (primary,   for hasTrait)      */
    symbol: symbol  /* unique id (secondary, currently unused)  */
    factory: T
    superTraits: ST
}

/**
 * API: generate trait (regular variant)
 * 
 * @param factory 
 */
export function trait<
    T extends ConsFactory<Cons>
> (factory: T): Trait<T, undefined>

/**
 * API: generate trait (super-trait variant)
 * 
 * @param superTraits 
 * @param factory 
 */
export function trait<
    const ST extends (Trait | TypeFactory<Trait>)[],
    T extends ConsFactory<Cons, ResolveTraitLikeArray<ST>>
> (superTraits: ST, factory: T): Trait<T, ST>

/**
 * API: generate trait (technical implementation)
 * 
 * @param args 
 */
export function trait (...args: any[]): Trait<any, any> {
    const factory: ConsFactory<any, any> = (args.length === 2 ? args[1] : args[0])
    const superTraits: (Trait | TypeFactory<Trait>)[] = (args.length === 2 ? args[0] : undefined)

    return {
        id: crc32(factory.toString()),
        symbol: Symbol('trait'),
        factory,
        superTraits
    }
}

/**
 * utility types: extract factory from a trait
 */
type ExtractFactory<
    T extends Trait
> =
    T extends Trait<
        ConsFactory<infer C>,
        TraitDefTypeST
    > ? C : never

/**
 * utility types: extract supertraits from a trait
 */
type ExtractSuperTrait<
    T extends Trait
> =
    T extends Trait<
        TraitDefTypeT,
        infer ST extends TraitDefTypeST
    > ? ST : never

/**
 * utility type: derive type constructor: merge two constructors
 */
type DeriveTraitsConsConsMerge<
    A extends Cons,
    B extends Cons
> =
    A extends (new (...args: infer ArgsA) => infer RetA) ? (
        B extends (new (...args: infer ArgsB) => infer RetB) ? (
            new (...args: MixParams<ArgsA, ArgsB>) => RetA & RetB
        ) : never
    ) : never

/**
 * utility type: derive type constructor: extract plain constructor
 */
type DeriveTraitsConsCons<
    T extends DirectCons
> =
    new (...args: ConstructorParameters<T>) => InstanceType<T>

type DeriveTraitsConsDirectBase<
    T extends DirectBase
> =
    T extends ArkormModel ? new (...args: any[]) => T :
    T extends DirectCons ? DeriveTraitsConsCons<T> :
    never

/**
 * utility type: derive type constructor: from trait parts
 */
type DeriveTraitsConsTraitParts<
    C extends Cons,
    ST extends ((Trait | TypeFactory<Trait>)[] | undefined)
> =
    ST extends undefined ? DeriveTraitsConsCons<C> :
    ST extends [] ? DeriveTraitsConsCons<C> :
    DeriveTraitsConsConsMerge<
        DeriveTraitsConsCons<C>,
        DeriveTraitsConsAll<ST>> /* RECURSION */

/**
 * utility type: derive type constructor: from single trait
 */
type DeriveTraitsConsTrait<
    T extends Trait
> =
    DeriveTraitsConsTraitParts<
        ExtractFactory<T>,
        ExtractSuperTrait<T>>

/**
 * utility type: derive type constructor: from single trait or trait factory
 */
type DeriveTraitsConsOne<
    T extends (Trait | TypeFactory<Trait>)
> =
    T extends Trait ? DeriveTraitsConsTrait<T> :
    T extends TypeFactory<Trait> ? DeriveTraitsConsTrait<ReturnType<T>> :
    never

/**
 * utility type: derive type constructor: from one or more traits or trait factories
 */
type DeriveTraitsConsAll<
    T extends (((Trait | TypeFactory<Trait>)[] | [...(Trait | TypeFactory<Trait>)[], DirectBase]) | undefined)
> =
    T extends [infer Only extends DirectBase] ? DeriveTraitsConsDirectBase<Only> :
    T extends [...infer Others extends (Trait | TypeFactory<Trait>)[], infer Last extends DirectBase] ? (
        Others extends [] ? DeriveTraitsConsDirectBase<Last> :
        DeriveTraitsConsConsMerge<
            DeriveTraitsConsAll<Others>, /* RECURSION */
            DeriveTraitsConsDirectBase<Last>>
    ) :
    T extends (Trait | TypeFactory<Trait>)[] ? (
        T extends [infer First extends (Trait | TypeFactory<Trait>)] ? (
            DeriveTraitsConsOne<First>
        ) : (
            T extends [
                infer First extends (Trait | TypeFactory<Trait>),
                ...infer Rest extends (Trait | TypeFactory<Trait>)[]] ? (
                DeriveTraitsConsConsMerge<
                    DeriveTraitsConsOne<First>,
                    DeriveTraitsConsAll<Rest>> /* RECURSION */
            ) : never
        )
    ) : never

/**
 * utility type: derive type constructor
 */
type DeriveTraitsCons<
    T extends ((Trait | TypeFactory<Trait>)[] | [...(Trait | TypeFactory<Trait>)[], DirectBase])
> =
    DeriveTraitsConsAll<T>

/**
 * utility type: derive type statics: merge two objects with statics
 */
type DeriveTraitsStatsConsMerge<
    T1 extends object,
    T2 extends object
> =
    T1 & T2

/**
 * utility type: derive type statics: extract plain statics
 */
type DeriveTraitsStatsCons<
    T extends DirectCons
> =
    Explode<T>

type DeriveTraitsStatsDirectBase<
    T extends DirectBase
> =
    T extends ArkormModel ? object :
    T extends DirectCons ? DeriveTraitsStatsCons<T> :
    never

/**
 * utility type: derive type statics: from trait parts
 */
type DeriveTraitsStatsTraitParts<
    C extends Cons,
    ST extends ((Trait | TypeFactory<Trait>)[] | undefined)
> =
    ST extends undefined ? DeriveTraitsStatsCons<C> :
    ST extends [] ? DeriveTraitsStatsCons<C> :
    DeriveTraitsStatsConsMerge<
        DeriveTraitsStatsCons<C>,
        DeriveTraitsStatsAll<ST>> /* RECURSION */

/**
 * utility type: derive type statics: from single trait
 */
type DeriveTraitsStatsTrait<
    T extends Trait
> =
    DeriveTraitsStatsTraitParts<
        ExtractFactory<T>,
        ExtractSuperTrait<T>>

/**
 * utility type: derive type statics: from single trait or trait factory
 */
type DeriveTraitsStatsOne<
    T extends (Trait | TypeFactory<Trait>)
> =
    T extends Trait ? DeriveTraitsStatsTrait<T> :
    T extends TypeFactory<Trait> ? DeriveTraitsStatsTrait<ReturnType<T>> :
    never

/**
 * utility type: derive type statics: from one or more traits or trait factories
 */
type DeriveTraitsStatsAll<
    T extends (((Trait | TypeFactory<Trait>)[] | [...(Trait | TypeFactory<Trait>)[], DirectBase]) | undefined)
> =
    T extends [infer Only extends DirectBase] ? DeriveTraitsStatsDirectBase<Only> :
    T extends [...infer Others extends (Trait | TypeFactory<Trait>)[], infer Last extends DirectBase] ? (
        Others extends [] ? DeriveTraitsStatsDirectBase<Last> :
        DeriveTraitsStatsConsMerge<
            DeriveTraitsStatsAll<Others>, /* RECURSION */
            DeriveTraitsStatsDirectBase<Last>>
    ) :
    T extends (Trait | TypeFactory<Trait>)[] ? (
        T extends [infer First extends (Trait | TypeFactory<Trait>)] ? (
            DeriveTraitsStatsOne<First>
        ) : (
            T extends [
                infer First extends (Trait | TypeFactory<Trait>),
                ...infer Rest extends (Trait | TypeFactory<Trait>)[]] ? (
                DeriveTraitsStatsConsMerge<
                    DeriveTraitsStatsOne<First>,
                    DeriveTraitsStatsAll<Rest>> /* RECURSION */
            ) : never
        )
    ) : never

/**
 * utility type: derive type statics
 */
type DeriveTraitsStats<
    T extends ((Trait | TypeFactory<Trait>)[] | [...(Trait | TypeFactory<Trait>)[], DirectBase])
> =
    DeriveTraitsStatsAll<T>

/**
 * utility type: derive type from one or more traits or trait type factories
 */
type DeriveTraits<
    T extends ((Trait | TypeFactory<Trait>)[] | [...(Trait | TypeFactory<Trait>)[], DirectBase])
> =
    DeriveTraitsCons<T> &
    DeriveTraitsStats<T>

type TraitMethodHelpers = {
    getTraitMethods: <T extends TraitMethod = TraitMethod>(name: PropertyKey) => T[]
    callTraitMethods: <T = any>(name: PropertyKey, ...args: any[]) => T[]
}

type DeriveTraitsWithMethodHelpers<
    T extends ((Trait | TypeFactory<Trait>)[] | [...(Trait | TypeFactory<Trait>)[], DirectBase])
> =
    DeriveTraits<T> extends new (...args: infer Args) => infer Instance
    ? (new (...args: Args) => Instance & TraitMethodHelpers) &
        Omit<DeriveTraits<T>, 'prototype'> &
        TraitMethodHelpers
    : never

/**
 * utility function: add an additional invisible property to an object
 * 
 * @param cons 
 * @param field 
 * @param value 
 * @returns 
 */
const extendProperties =
    (cons: Cons, field: string | symbol, value: any) =>
        Object.defineProperty(cons, field, { value, enumerable: false, writable: false })

type TraitMethod = (...args: any[]) => any
type TraitMethodRegistry = Map<PropertyKey, TraitMethod[]>

const traitMethodRegistry = Symbol('trait-method-registry')

const cloneMethodRegistry = (target: Record<PropertyKey, any>): TraitMethodRegistry => {
    const registry = target[traitMethodRegistry] as TraitMethodRegistry | undefined

    return new Map(
        [...(registry?.entries() ?? [])].map(([name, methods]) => [name, [...methods]])
    )
}

const registerMethodScope = (
    target: Record<PropertyKey, any>,
    base: Record<PropertyKey, any>,
    ignored: Set<PropertyKey>,
) => {
    const registry = cloneMethodRegistry(base)

    for (const name of Reflect.ownKeys(target)) {
        if (ignored.has(name)) continue

        const descriptor = Object.getOwnPropertyDescriptor(target, name)
        const method = descriptor?.value

        if (typeof method !== 'function') continue

        const methods = registry.get(name)
        const previous = base?.[name]

        if (methods) {
            if (methods.at(-1) !== method) {
                methods.push(method)
            }

            registry.set(name, methods)
        } else if (typeof previous === 'function' && previous !== method) {
            registry.set(name, [previous, method])
        }
    }

    Object.defineProperty(target, traitMethodRegistry, {
        configurable: false,
        enumerable: false,
        value: registry,
        writable: false,
    })
}

/**
 * Registers conflicting trait methods
 * 
 * @param classInstance 
 * @param baseClass 
 */
const registerTraitMethods = (classInstance: Cons, baseClass: Cons) => {
    registerMethodScope(
        classInstance.prototype as Record<PropertyKey, any>,
        baseClass.prototype as Record<PropertyKey, any>,
        new Set<PropertyKey>(['constructor']),
    )
    registerMethodScope(
        classInstance as unknown as Record<PropertyKey, any>,
        baseClass as unknown as Record<PropertyKey, any>,
        new Set<PropertyKey>(['length', 'name', 'prototype', 'arguments', 'caller']),
    )
}

/**
 * Return every trait implementation for a method, bound to the supplied
 * instance or class. Methods are ordered from the base implementation to the
 * currently active trait implementation.
 * 
 * @param target 
 * @param name 
 * @returns 
 */
export const getTraitMethods = <T extends TraitMethod = TraitMethod> (
    target: object | Cons,
    name: PropertyKey,
): T[] => {
    const scope = typeof target === 'function'
        ? target as unknown as Record<PropertyKey, any>
        : Object.getPrototypeOf(target) as Record<PropertyKey, any>
    const registry = scope?.[traitMethodRegistry] as TraitMethodRegistry | undefined

    return (registry?.get(name) ?? []).map(method => method.bind(target) as T)
}

/**
 * Invoke every trait implementation for a method in registration order.
 * 
 * @param target 
 * @param name 
 * @param args 
 * @returns 
 */
export const callTraitMethods = <T = any> (
    target: object | Cons,
    name: PropertyKey,
    ...args: any[]
): T[] => {
    const methods = getTraitMethods(target, name)

    if (methods.length === 0) {
        console.warn(`No conflicting trait methods found for "${String(name)}".`)

        return []
    }

    return methods.map(method => method(...args) as T)
}

/**
 * utility function: get raw trait
 * 
 * @param x 
 * @returns 
 */
const rawTrait = (x: (Trait | TypeFactory<Trait>)) =>
    isTypeFactory(x) ? x() : x

/**
 * utility function: derive a trait
 * 
 * @param trait$ 
 * @param baseClass 
 * @param derived 
 * @returns 
 */
const deriveTrait = (
    trait$: Trait | TypeFactory<Trait>,
    baseClass: Cons<any>,
    derived: Map<number, boolean>
) => {
    /*  get real trait  */
    const trait = rawTrait(trait$)

    /*  guard against an undefined/invalid trait, which otherwise crashes below
        with a cryptic "Cannot read properties of undefined (reading 'id')". The
        usual cause is a circular import: a trait module is evaluated before it
        finished initializing (e.g. a trait that imports a model which imports
        the class that uses the trait).  */
    if (trait === undefined || trait === null || typeof trait.id !== 'number')
        throw new Error(
            'use(): received an undefined or invalid trait. This usually means a circular '
            + 'import — the trait module had not finished initializing when use() ran. Avoid '
            + 'importing models at the top level of trait modules, or break the import cycle.',
        )

    /*  start with base class  */
    let classInstance = baseClass

    /*  in case we still have not derived this trait...  */
    if (!derived.has(trait.id)) {
        derived.set(trait.id, true)

        /*  iterate over all of its super traits  */
        if (trait.superTraits !== undefined)
            for (const superTrait of reverseTraitList(trait.superTraits))
                classInstance = deriveTrait(superTrait, classInstance, derived) /*  RECURSION  */

        /*  derive this trait  */
        const base = classInstance
        classInstance = trait.factory(classInstance)
        registerTraitMethods(classInstance, base)
        extendProperties(classInstance, 'id', crc32(trait.factory.toString()))
        extendProperties(classInstance, trait.symbol, true)
    }

    return classInstance
}

/**
 * utility function: get reversed trait list
 * 
 * @param traits 
 * @returns 
 */
const reverseTraitList = (traits: (Trait | TypeFactory<Trait>)[]) =>
    traits.slice().reverse() as (Trait | TypeFactory<Trait>)[]

type UsableTraits = (
    [Trait | TypeFactory<Trait>, ...(Trait | TypeFactory<Trait>)[]] |
    [...(Trait | TypeFactory<Trait>)[], DirectBase]
)

/**
 * API: derive a class from one or more traits or trait type factories
 * 
 * @param traits 
 * @returns 
 */
export function use
    <T extends UsableTraits>
    (withMethodHelpers: true, ...traits: T): DeriveTraitsWithMethodHelpers<T>
export function use
    <T extends UsableTraits>
    (...traits: T): DeriveTraits<T>
export function use (...args: any[]): any {
    const withMethodHelpers = args[0] === true
    const traits = (withMethodHelpers ? args.slice(1) : args) as UsableTraits

    /*  run-time sanity check  */
    if (traits.length === 0)
        throw new Error('invalid number of parameters (expected one or more traits)')

    /*  determine the base class (classInstance) and the list of traits (lot)  */
    let classInstance: Cons<any>
    let lot: (Trait | TypeFactory<Trait>)[]
    const last = traits[traits.length - 1]
    if (isCons(last) && !isTypeFactory(last)) {
        /*  case 1: with trailing regular class  */
        classInstance = last
        lot = traits.slice(0, -1) as (Trait | TypeFactory<Trait>)[]
    } else if (isArkormModelInstance(last)) {
        /*  case 2: with trailing Arkorm model instance  */
        classInstance = last.constructor as Cons<any>
        lot = traits.slice(0, -1) as (Trait | TypeFactory<Trait>)[]
    } else {
        /*  case 3: just regular traits or trait type factories  */
        classInstance = class ROOT { }
        lot = traits as (Trait | TypeFactory<Trait>)[]
    }

    /*  track already derived traits  */
    const derived = new Map<number, boolean>()

    /*  iterate over all traits  */
    for (const trait of reverseTraitList(lot))
        classInstance = deriveTrait(trait, classInstance, derived)

    if (withMethodHelpers) {
        classInstance = class TraitMethodEnabled extends classInstance {
            getTraitMethods<T extends TraitMethod = TraitMethod> (name: PropertyKey): T[] {
                return getTraitMethods<T>(this, name)
            }

            callTraitMethods<T = any> (name: PropertyKey, ...args: any[]): T[] {
                return callTraitMethods<T>(this, name, ...args)
            }

            static getTraitMethods<T extends TraitMethod = TraitMethod> (name: PropertyKey): T[] {
                return getTraitMethods<T>(this, name)
            }

            static callTraitMethods<T = any> (name: PropertyKey, ...args: any[]): T[] {
                return callTraitMethods<T>(this, name, ...args)
            }
        }
    }

    return classInstance
}

/**
 * internal type: implements trait type
 */
type DerivedType<T extends Trait> =
    InstanceType<ExtractFactory<T>>

/**
 * internal type: implements trait type or trait type factory
 */
export type Derived<T extends (Trait | TypeFactory<Trait> | Cons)> =
    T extends TypeFactory<Trait> ? DerivedType<ReturnType<T>> :
    T extends Trait ? DerivedType<T> :
    T extends Cons ? T :
    never

/**
 * API: type guard for checking whether class instance is derived from a trait
 * 
 * @param instance 
 * @param trait 
 * @returns 
 */
export function uses
    <T extends (Trait | TypeFactory<Trait> | Cons)>
    (instance: unknown, trait: T): instance is Derived<T> {
    /*  ensure the class instance is really an object  */
    if (typeof instance !== 'object' || instance === null)
        return false
    let obj = instance

    /*  special case: regular class  */
    if (isCons(trait) && !isTypeFactory(trait))
        return (instance instanceof trait)

    /*  regular case: trait or trait type factory...  */
    const t = (isTypeFactory(trait) ? trait() : trait) as Trait
    const idTrait = t['id']
    while (obj) {
        if (Object.hasOwn(obj, 'constructor')) {
            const id = ((obj.constructor as any)['id'] as number) ?? 0
            if (id === idTrait)
                return true
        }
        obj = Object.getPrototypeOf(obj)
    }

    return false
}
