import { describe, expect, it, vi } from 'vitest'
import { trait, use, uses } from '../src/utils/traits'

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
