import { Hash } from '@arkstack/common'
import { ModelFactory } from '@arkstack/database'
import { User } from '@app/models/User'
import { faker } from '@faker-js/faker'

export class UserFactory extends ModelFactory<User> {
    protected model = User

    protected definition (_sequence: number) {
        return {
            'name': faker.person.fullName(),
            'email': faker.internet.email(),
            'password': Hash.make('password'),
        }
    }
}
