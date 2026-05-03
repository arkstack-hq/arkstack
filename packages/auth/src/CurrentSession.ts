import { AuthContract } from './Contracts/AuthContract'
import { PersonalAccessToken } from './Contracts/PersonalAccessToken'
import { getModel } from '@arkstack/common'

/**
 * The CurrentSession class represents the current authentication session and provides 
 * methods to manage it, such as destroying the session (logging out) and retrieving 
 * the current personal access token. It is used internally by the Auth class to 
 * handle session-specific operations.
 * 
 * @author Legacy (3m1n3nc3)
 * @since 1.0.0
 * @version 1.0.0
 * @see Auth
 */
export class CurrentSession {
    constructor(private auth: AuthContract) { }

    /**
     * Destroy the current session's personal access token, effectively 
     * logging out the user from this session.
     */
    async destroy () {
        const pat = await this.token()

        if (pat) {
            await this.auth.logout(pat)
        }
    }

    /**
     * Get the current session's personal access token
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
        const pat = await Model.query().where({ token }).first()

        return pat
    }
}
