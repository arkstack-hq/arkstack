import { NextFunction, Request, RequestHandler, Response } from 'express'

import multer from 'multer'

export const formdata = multer({ storage: multer.memoryStorage() })

export class FormDataMiddleware {
    constructor(type: 'array', fieldName: string, maxCount?: number | undefined, options?: multer.Options)
    constructor(type: 'fields', fields: multer.Field[], options?: multer.Options)
    constructor(type: 'single', fieldName: string, options?: multer.Options)
    constructor(type: 'none' | 'any', options?: multer.Options)
    constructor(
        private type: 'any' | 'array' | 'fields' | 'none' | 'single',
        private name?: string | multer.Field[] | multer.Options,
        private count?: any,
        private options?: multer.Options
    ) { }

    handler(req: Request, res: Response, next: NextFunction) {
        let inst: RequestHandler
        const options: multer.Options = this.options ??
            (
                typeof this.name === 'object' && ['any', 'none'].includes(this.type)
                    ? this.name
                    : (typeof this.count === 'object' && 'storage' in this.count ? this.count : {})
            )

        const formdata = multer({ storage: multer.memoryStorage(), ...options })

        if (this.type === 'any' || this.type === 'none') {
            inst = formdata.any()
        } else if (this.type === 'array') {
            inst = formdata.array(String(this.name), this.count)
        } else if (this.type === 'fields') {
            inst = formdata.fields(
                Array.isArray(this.name) ? this.name : [this.name as multer.Field]
            )
        } else {
            inst = formdata.single(String(this.name))
        }

        return inst.call(inst, req, res, next)
    }
}