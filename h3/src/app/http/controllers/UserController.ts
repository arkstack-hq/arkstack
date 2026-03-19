import { BaseController } from '@controllers/BaseController'
import { HttpContext } from 'clear-router/types/h3'
import { Storage } from '@arkstack/filesystem'
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
  index = async ({ req }: HttpContext) => {
    return await new UserCollection([])
      .additional({
        status: 'success',
        message: 'OK',
        code: 200,
      })
      .response(req)
      .setStatusCode(200)
  }

  /**
   * Get a specific resource
   *
   * @param req
   * @param res
   */
  show = async ({ req }: HttpContext) => {
    return new UserResource({ data: {} })
      .additional({
        status: 'success',
        message: 'OK',
        code: 200,
      })
      .response(req)
      .setStatusCode(200)
  }

  /**
   * Create a resource
   *
   * @param req
   * @param res
   */
  create = async ({ req }: HttpContext) => {
    return new UserResource({ data: {} })
      .additional({
        status: 'success',
        message: 'New User created successfully',
        code: 201,
      })
      .response(req)
      .setStatusCode(201)
  }

  /**
   * Update a specific resource
   *
   * @param req
   * @param res
   */
  update = async ({ req }: HttpContext) => {
    const data = await this.validate({
      name: 'string|required',
      age: 'numeric|required|min:22',
      image: 'required|image|mimes:jpg,png|max:2048',
    })

    Storage.disk('public').saveFile(data.image)

    return new UserResource({ data })
      .additional({
        status: 'success',
        message: 'User updated successfully',
        code: 202,
      })
      .response(req)
      .setStatusCode(202)
  }

  /**
   * Delete a specific resource
   *
   * @param req
   * @param res
   */
  destroy = async ({ req }: HttpContext) => {
    return new UserResource({ data: {} })
      .additional({
        status: 'success',
        message: 'User deleted successfully',
        code: 202,
      })
      .response(req)
      .setStatusCode(202)
  }
}
