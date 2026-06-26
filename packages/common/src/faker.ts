import * as fakerLocales from '@faker-js/faker'
import { Faker, type ImageModule } from '@faker-js/faker'

import { PictwoFakerImage, pictwoImage } from '@pictwo/faker'

import { configLoader } from './ConfigLoader'

const config =
    globalThis.config ??
    ((key: never, def: unknown) => configLoader.resolve(key, def))

const fallbackLocale = 'en'

const resolveLocale = () => {
    const locale = config('app.locale', fallbackLocale)

    if (
        typeof locale === 'string' &&
        locale in fakerLocales &&
        typeof fakerLocales[locale as keyof typeof fakerLocales] === 'object'
    ) {
        return fakerLocales[locale as keyof typeof fakerLocales]
    }

    return fakerLocales[fallbackLocale]
}

const fakerInstance = new Faker({
    locale: [resolveLocale() as never].filter(Boolean),
})

const { faker: _, ...image } = fakerInstance.image as ImageModule & {
    faker?: unknown
}

export const faker = {
    ...fakerInstance,
    image: Object.assign({}, image, pictwoImage()),
} as Faker & {
    image: ImageModule & PictwoFakerImage
}