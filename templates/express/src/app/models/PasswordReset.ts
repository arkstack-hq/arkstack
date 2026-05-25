import { Model } from 'arkormx'

export class PasswordReset extends Model {
    declare id: string
    declare email: string | null
    declare phone: string | null
    declare token: string
    declare createdAt: Date
    declare updatedAt: Date

    static fromToken (token: string) {
        if (token.length > 6) {
            token = Buffer.from(token, 'base64url').toString().split('-')[0]
        }

        return this.query().where({ token }).firstOrFail()
    }

    /**
     * get the password reset link
     */
    link () {
        const b64Token = Buffer
            .from(str(this.token).append('-' + Math.random()).toString())
            .toString('base64url')

        return `${config('app.frontend_url')}/auth/reset-password?token=${b64Token}`
    }
}
