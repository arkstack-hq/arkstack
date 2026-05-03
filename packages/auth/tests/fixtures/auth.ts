import { PersonalAccessToken, User } from '../../src'

import { SignJWT } from 'jose'
import { getModel } from '@arkstack/common'
import { randomUUID } from 'node:crypto'

export const authSecret = 'test-secret'

const users: User[] = []
const personalAccessTokens: PersonalAccessToken[] = []

export const createAuthUser = async (attributes: Partial<Pick<User, 'email' | 'name' | 'password'>> = {}) => {
    const user = await (await getModel<typeof User>('User')).query().create({
        email: attributes.email ?? `auth-test-${randomUUID()}@example.com`,
        name: attributes.name ?? 'Auth Test',
        password: attributes.password ?? 'password',
    })

    users.push(user)

    return user
}

export const createAuthToken = async (subject: string | number) => await new SignJWT({
    sub: subject.toString(),
})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(authSecret))

export const createPersonalAccessToken = async (userId: string | number, token: string) => {
    const personalAccessToken = await (await getModel<typeof PersonalAccessToken>('PersonalAccessToken')).query().create({
        abilities: [],
        lastUsedAt: new Date(),
        name: 'Test device',
        token,
        userId,
    })

    personalAccessTokens.push(personalAccessToken)

    return personalAccessToken
}

export const cleanupAuthRecords = async () => {
    await Promise.all(personalAccessTokens.splice(0).map(async token => await token.delete()))
    await Promise.all(users.splice(0).map(async user => await user.delete()))
}
