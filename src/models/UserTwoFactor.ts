import { UserTwoFactor as BaseUserTwoFactor } from '../../packages/auth/src'
import User from './User'

export default class UserTwoFactor extends BaseUserTwoFactor {
    protected static override table = 'user_two_factors'
    protected static override columns = {
        userId: 'user_id',
        secretCiphertext: 'secret_ciphertext',
        smsCodeHash: 'sms_code_hash',
        smsCodeExpiresAt: 'sms_code_expires_at',
        smsCodePurpose: 'sms_code_purpose',
        enabledAt: 'enabled_at',
        recoveryCodeHashes: 'recovery_code_hashes',
    }

    user () {
        return this.belongsTo(User, 'userId', 'id')
    }
}
