import { Resource, ResourceCollection } from 'resora'

import { BaseController } from '@controllers/BaseController'
import { HttpContext } from 'clear-router/types/express'

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
  index = async ({ res }: HttpContext) => {
    return new ResourceCollection({ data: [] }, res)
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
  show = async ({ res }: HttpContext) => {
    return new Resource({ data: {} }, res)
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
  create = async ({ res }: HttpContext) => {
    return new Resource({ data: {} }, res)
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
  update = async () => {
    const data = await this.validate({
      name: 'string|required',
      age: 'numeric|required|min:30',
      // image: 'required|image|mimes:jpg,png|max:2048',
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
  destroy = async ({ res }: HttpContext) => {
    return new Resource({ data: {} }, res)
      .additional({
        status: 'success',
        message: 'User deleted successfully',
        code: 202,
      })
      .response()
      .setStatusCode(202)
  }
}
