import { BaseController } from '@controllers/BaseController'
import UserCollection from '../resources/UserCollection'
import UserResource from '../resources/UserResource'

/**
 * UserController
 */
export default class UserController extends BaseController {
  /**
   * Get all resources
   *
   * @param req
   * @param res
   */
  index = async () => {
    return await new UserCollection([])
      .additional({
        status: 'success',
        message: 'OK',
        code: 200,
      })
      .response()
      .setStatusCode(200)
  }

  /**
   * Get a specific resource
   *
   * @param req
   * @param res
   */
  show = async () => {
    return new UserResource({ data: {} })
      .additional({
        status: 'success',
        message: 'OK',
        code: 200,
      })
      .response()
      .setStatusCode(200)
  }

  /**
   * Create a resource
   *
   * @param req
   * @param res
   */
  create = async () => {
    return new UserResource({ data: {} })
      .additional({
        status: 'success',
        message: 'New User created successfully',
        code: 201,
      })
      .response()
      .setStatusCode(201)
  }

  /**
   * Update a specific resource
   *
   * @param req
   * @param res
   */
  update = async () => {
    const data = await this.validate({
      name: 'string|required',
      age: 'numeric|required|min:22',
    })

    return new UserResource({ data })
      .additional({
        status: 'success',
        message: 'User updated successfully',
        code: 202,
      })
      .response()
      .setStatusCode(202)
  }

  /**
   * Delete a specific resource
   *
   * @param req
   * @param res
   */
  destroy = async () => {
    return new UserResource({ data: {} })
      .additional({
        status: 'success',
        message: 'User deleted successfully',
        code: 202,
      })
      .response()
      .setStatusCode(202)
  }
}
