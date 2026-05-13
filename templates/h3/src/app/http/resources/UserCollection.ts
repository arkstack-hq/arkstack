import { ResourceCollection } from 'resora'
import UserResource from './UserResource'

/**
 * UserCollection
 */
export default class extends ResourceCollection {
  collects = UserResource

  /**
   * Build the response object
   * @returns this
   */
  data() {
    return this.toArray()
  }
}
