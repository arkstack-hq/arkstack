import { AuthContract } from './Contracts/AuthContract'
import type { PersonalAccessToken } from '@app/models/PersonalAccessToken'
import { Session as HttpSession } from '@arkstack/http'
import { getModel } from '@arkstack/common'

/**
 * Represents an authenticated user session.
 *
 * @author 3m1n3nc3
 */
export class AuthSession extends HttpSession {
    constructor(private auth: AuthContract, current: HttpSession | undefined = (globalThis as any).session?.()) {
        super(current instanceof HttpSession ? current : undefined)
    }

    /**
     * Destroy the current session
     * 
     * @returns
     */
    override async destroy () {
        const pat = await this.token()

        if (pat) {
            await this.auth.logout(pat)
        }

        await super.destroy()

        return this
    }

    /**
     * Get the current auth session token
     * 
     * @returns
     */
    async token (): Promise<PersonalAccessToken | null> {
        if (!this.auth.getRequest()) {
            return null
        }

        const token = this.auth.getRequest()!.bearerToken()

        if (!token) {
            return null
        }

        const Model = await getModel<typeof PersonalAccessToken>('PersonalAccessToken')

        return await Model.query().where({ token }).first()
    }
}
