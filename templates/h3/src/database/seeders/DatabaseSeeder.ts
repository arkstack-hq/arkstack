import { Seeder } from '@arkstack/database'
import { UserSeeder } from './UserSeeder'

export class DatabaseSeeder extends Seeder {
    public async run (): Promise<void> {
        this.call([
            UserSeeder
        ])
    }
}
