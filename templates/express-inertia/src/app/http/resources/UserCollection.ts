import { ResourceCollection } from 'resora'
import { UserResource } from './UserResource'

/**
 * UserCollection
 */
export class UserCollection extends ResourceCollection {
  collects = UserResource
  /**
   * Build the response object
   * @returns this
   */
  data () {
    return this.toObject()
  }
}
