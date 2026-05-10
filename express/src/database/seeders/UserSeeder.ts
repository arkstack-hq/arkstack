import { Seeder } from '@arkstack/database'
import { User } from 'src/app/models/User'

export class UserSeeder extends Seeder {
    public async run (): Promise<void> {
        User.factory(5).create()
    }
}
