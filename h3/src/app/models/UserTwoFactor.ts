import { UserTwoFactor as BaseUserTwoFactor } from '@arkstack/auth'
import { User } from './User'

export class UserTwoFactor extends BaseUserTwoFactor {
    protected static columns = {
        userId: 'user_id',
        secretCiphertext: 'secret_ciphertext',
        smsCodeHash: 'sms_code_hash',
        smsCodeExpiresAt: 'sms_code_expires_at',
        smsCodePurpose: 'sms_code_purpose',
        enabledAt: 'enabled_at',
        recoveryCodeHashes: 'recovery_code_hashes',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }

    user () {
        return this.belongsTo(User, 'userId', 'id')
    }
}