import { describe, expect, it, vi } from 'vitest'
import { callTraitMethods, getTraitMethods, trait, use, uses } from '../src/utils/traits'

import { Model } from 'arkormx'

const Addable = trait((Base) => class Addable extends Base {
    build = true

    add () {
        this.value = this.value + 1

        return this.value
    }
})

const Subtractable = trait((Base) => class Subtractable extends Base {
    subtract () {
        this.value = this.value - 1

        return this.value
    }
})

describe('Trait System', () => {
    it('should inherit properties from traits', () => {
        class MyClass extends use(Addable) {
            value = 0
        }

        const instance = new MyClass()
        expect(instance.build).toBe(true)
    })

    it('should create a trait that can be applied to a class', () => {
        class MyClass extends use(Subtractable) {
            value = 1
        }

        const instance = new MyClass()
        expect(instance.subtract()).toBe(0)
    })

    it('should allow traits to be applied in any order', () => {
        class MyClass extends use(Subtractable, Addable) {
            value = 0
        }

        const instance = new MyClass()
        expect(instance.add()).toBe(1)
        expect(instance.subtract()).toBe(0)
    })

    it('does not register methods without conflicts', () => {
        class MyClass extends use(Addable, Subtractable) {
            value = 0
        }

        const instance = new MyClass()

        expect(getTraitMethods(instance, 'add')).toEqual([])
        expect(getTraitMethods(instance, 'subtract')).toEqual([])
    })

    it('warns when calling a trait method without registered conflicts', () => {
        class MyClass extends use(Addable) {
            value = 0
        }

        const warn = vi.spyOn(console, 'warn').mockImplementation(() => { })

        expect(callTraitMethods(new MyClass(), 'missing')).toEqual([])
        expect(warn).toHaveBeenCalledOnce()
        expect(warn).toHaveBeenCalledWith('No conflicting trait methods found for "missing".')

        warn.mockRestore()
    })

    it('preserves conflicting instance trait methods in execution order', () => {
        class BaseClass {
            prefix = 'base'

            boot (value: string) {
                return this.prefix + ':' + value
            }
        }

        const First = trait(Base => class First extends Base {
            boot (value: string) {
                return 'first:' + value
            }
        })
        const Second = trait(Base => class Second extends Base {
            boot (value: string) {
                return 'second:' + value
            }
        })

        class MyClass extends use(First, Second, BaseClass) { }

        const instance = new MyClass()
        const methods = getTraitMethods(instance, 'boot')

        expect(instance.boot('ready')).toBe('first:ready')
        expect(methods.map(method => method('ready'))).toEqual([
            'base:ready',
            'second:ready',
            'first:ready',
        ])
        expect(callTraitMethods(instance, 'boot', 'done')).toEqual([
            'base:done',
            'second:done',
            'first:done',
        ])
    })

    it('preserves conflicting static trait methods in execution order', () => {
        class BaseClass {
            static prefix = 'base'

            static boot (value: string) {
                return this.prefix + ':' + value
            }
        }

        const First = trait(Base => class First extends Base {
            static boot (value: string) {
                return 'first:' + value
            }
        })
        const Second = trait(Base => class Second extends Base {
            static boot (value: string) {
                return 'second:' + value
            }
        })

        class MyClass extends use(First, Second, BaseClass) { }

        expect(MyClass.boot('ready')).toBe('first:ready')
        expect(callTraitMethods(MyClass, 'boot', 'done')).toEqual([
            'base:done',
            'second:done',
            'first:done',
        ])
    })

    it('should allow traits to be applied to classes that already have traits', () => {
        class MyClass extends use(Subtractable) {
            value = 0
        }

        class MySubClass extends use(Addable, MyClass) { }

        const instance = new MySubClass()
        expect(instance.add()).toBe(1)
        expect(instance.subtract()).toBe(0)
    })

    it('can check if an instance implements a trait', () => {
        class MyClass extends use(Addable) {
            value = 0
        }

        const instance = new MyClass()
        expect(instance.add()).toBe(1)
        expect(instance.subtract).toBeUndefined()
        expect(uses(instance, Addable)).toBe(true)
        expect(uses(instance, Subtractable)).toBe(false)
    })

    it('should allow a regular class to be used directly', () => {
        class BaseClass {
            static label = 'base'
            value = 1

            increment () {
                return this.value + 1
            }
        }

        class MyClass extends use(BaseClass) { }

        const instance = new MyClass()
        expect(instance.increment()).toBe(2)
        expect(instance instanceof BaseClass).toBe(true)
        expect(MyClass.label).toBe('base')
    })

    it('should allow a regular class to be used directly and mixed with traits', () => {
        class BaseClass {
            static label = 'base'
            value = 1

            increment () {
                return this.value + 1
            }
        }

        class MyClass extends use(Addable, Subtractable, BaseClass) { }

        const instance = new MyClass()
        expect(instance.add()).toBe(2)
        expect(instance.subtract()).toBe(1)
        expect(instance.increment()).toBe(2)
        expect(instance instanceof BaseClass).toBe(true)
        expect(MyClass.label).toBe('base')
    })

    const ModelAddable = trait(Base => class ModelAddable extends Base {
        add () {
            const value = Number(this.getAttribute('value') ?? 0) + 1
            this.setAttribute('value', value)

            return value
        }
    })

    it('should accept an Arkorm model to be used directly and mixed with traits', () => {
        class MyModel extends use(ModelAddable, Model) {
            static table = 'my_model'

            constructor() {
                super({ value: 1 })
            }

            increment () {
                return this.value + 1
            }
        }

        const instance = new MyModel()
        const value = Number(instance.getAttribute('value'))
        const added = instance.add()
        expect(added).toBeGreaterThan(value)
        expect(instance.increment()).toBeGreaterThan(added)
        expect(instance instanceof Model).toBe(true)
        expect(MyModel.table).toBe('my_model')
    })

    it('should accept an Arkorm model instance as a direct base', () => {
        class BaseModel extends Model {
            static table = 'base_model'
        }

        const base = new BaseModel({ value: 1 })

        class MyModel extends use(ModelAddable, base) { }

        const instance = new MyModel({ value: 1 })
        const value = Number(instance.getAttribute('value'))
        expect(instance.add()).toBeGreaterThan(value)
        expect(instance instanceof BaseModel).toBe(true)
        expect((MyModel as any).table).toBe('base_model')
    })

    it('expect mixin to be instanceof', () => {
        class MyClass extends use(Addable) {
            value = 0
        }

        class MySubClass extends use(Subtractable, MyClass) { }

        const instance = new MySubClass()
        expect(instance instanceof MySubClass).toBe(true)
        expect(instance instanceof MyClass).toBe(true)
    })

    const spy = vi.spyOn(console, 'log').mockImplementation(() => { })

    const Magic = trait(Base => class Magic extends Base {
        makeMagic () {
            return 'makeMagic'
        }
    })

    const Magical = trait(Base => class Magical extends Base {
        play () {
            return 'Playing'
        }

        static pause () {
            return 'Paused'
        }
    })

    const IRouter = trait(Base => class IRouter extends Base {
        static call () {
            return 'Called'
        }
    })

    const Proxiable = trait(Base => class Proxiable extends Base {
        constructor() {
            super()

            return new Proxy(this, {
                get (target, prop, receiver) {
                    const val = Reflect.get(target, prop, receiver) as any
                    if (typeof val === 'function' && val.name === 'proxied') return () => val().toUpperCase()

                    return val
                }
            })
        }

        proxied () {
            return 'it worked'
        }
    })

    class Router extends use(IRouter, Magic, Magical, Proxiable) {
        constructor() {
            super()
            console.log(this.makeMagic())
            console.log(this.play())
        }
    }

    const router = new Router()

    it('child class constructor has access to all parent methods', () => {
        expect(spy).toHaveBeenCalledTimes(2)
        expect(spy).toHaveBeenCalledWith('Playing')
        expect(spy).toHaveBeenCalledWith('makeMagic')
        spy.mockReset()
    })

    it('traits can implement proxies', () => {
        expect(router.proxied()).toBe('IT WORKED')
    })

    it('child class has acccess to all parent methods', () => {
        expect(router.makeMagic()).toBeTruthy()
        expect(router.play()).toBe('Playing')
    })

    it('child class has acccess to all static parent methods', () => {
        expect(Router.call()).toBe('Called')
        expect(Router.pause()).toBe('Paused')
    })

    it('child class can be confirmed to be using all mixed classes', () => {
        expect(uses(router, Magic)).toBeTruthy()
        expect(uses(router, Magical)).toBeTruthy()
        expect(uses(router, IRouter)).toBeTruthy()
    })
})
