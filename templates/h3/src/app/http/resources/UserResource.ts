import { Resource } from 'resora'

/**
 * UserResource
 */
export default class extends Resource {
  /**
   * Build the response object
   * @returns this
   */
  data() {
    return this.toArray()
  }
}
