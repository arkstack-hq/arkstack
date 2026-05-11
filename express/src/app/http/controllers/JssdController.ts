import { BaseController } from '@controllers/BaseController'
import { Bind } from 'clear-router/decorators'
import { Resource, ResourceCollection } from 'resora'
import { Jssd } from '@app/models/Jssd'
import { Request } from '@arkstack/http'

/**
 * JssdController
 */
export default class JssdController extends BaseController {
    /**
     * Get all resource from the database
     */
    async index () {
        return new ResourceCollection(await Jssd.query().orderBy({ id: 'asc' }).get()).additional({
            status: 'success',
            message: 'OK',
            code: 200,
        }).response().setStatusCode(200)
    }

    /**
     * Get a specific resource from the database
     * 
     * @param jssd  
     */
     @Bind()
    async show (jssd: Jssd) {
        return new Resource(jssd).additional({
            status: 'success',
            message: 'OK',
            code: 200,
        }).response().setStatusCode(200)
    }

    /**
     * Create a new resource in the database
     * 
     * The calling route must recieve a multer.RequestHandler instance
     * 
     * @example router.post('/jssds', upload.none(), new AdminController().create)
     * 
     * @param req 
     */
    @Bind()
    async create (req: Request) {
        const data = await Jssd.query().create({
            data: req.body,
        })

        return new Resource({ data }).additional({
            status: 'success',
            message: 'New jssd created successfully',
            code: 201,
        }).response().setStatusCode(201)
    }

    /**
     * Update a specific resource in the database
     * 
     * @param jssd 
     * @param req 
     */
    @Bind()
    async update (jssd: Jssd, req: Request) {
        await jssd.update({
            data: req.body,
        })

        return new Resource(jssd).additional({
            status: 'success',
            message: 'jssd updated successfully',
            code: 202,
        }).response().setStatusCode(202)
    }

    /**
     * Delete a specific resource from the database
     * 
     * @param jssd  
     */
    async destroy (jssd: Jssd) {
        await jssd.delete()

        return new Resource({ data: {} }).additional({
            status: 'success',
            message: 'jssd deleted successfully',
            code: 202,
        }).response().setStatusCode(202)
    }
}
