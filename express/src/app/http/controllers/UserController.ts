import { Resource, ResourceCollection } from 'resora'

import { BaseController } from '@controllers/BaseController'
import { Bind } from 'clear-router/decorators'
import { User } from 'src/app/models/User'

/**
 * UserController
 */
export default class UserController extends BaseController {
  /**
   * Get all resources
   *
   * @param req
   */
  async index () {
    const users = await User.query().paginate(5)

    return new ResourceCollection(users)
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
   * @param res
   */
  @Bind()
  async show (user: User) {
    return new Resource(user)
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
   * @param res
   */
  async create () {
    return new Resource({ data: {} })
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
   * @param res
   */
  async update () {
    const data = await this.validate({
      name: 'string|required',
      age: 'numeric|required|min:30',
    })

    return new Resource({ data })
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
   * @param res
   */
  async destroy () {
    return new Resource({ data: {} })
      .additional({
        status: 'success',
        message: 'User deleted successfully',
        code: 202,
      })
      .response()
      .setStatusCode(202)
  }
}
