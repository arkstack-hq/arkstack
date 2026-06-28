import { Resource } from 'resora'

/**
 * UserResource
 */
export class UserResource extends Resource {
  /**
   * Build the response object
   * @returns this
   */
  data () {
    return this.toObject()
  }
}
