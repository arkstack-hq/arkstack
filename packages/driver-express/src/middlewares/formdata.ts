import { NextFunction, Request, RequestHandler, Response } from 'express'

import multer from 'multer'

export const formdata = multer({ storage: multer.memoryStorage() })

export class FormDataMiddleware {
    constructor(type: 'array', fieldName: string, maxCount?: number | undefined, options?: multer.Options)
    constructor(type: 'fields', fields: multer.Field[], options?: multer.Options)
    constructor(type: 'single', fieldName: string, options?: multer.Options)
    constructor(
        private type: 'any' | 'array' | 'fields' | 'none' | 'single',
        private name?: any,
        private count?: any,
        private options?: multer.Options
    ) { }

    handler (req: Request, res: Response, next: NextFunction) {
        let inst: RequestHandler
        const options: multer.Options = this.options ??
            (typeof this.count === 'object' && 'storage' in this.count ? this.count : {})

        const formdata = multer({ storage: multer.memoryStorage(), ...options })

        if (this.type === 'any' || this.type === 'none') {
            inst = formdata.any()
        } else if (this.type === 'array') {
            inst = formdata.array(this.name, this.count)
        } else if (this.type === 'fields') {
            inst = formdata.fields(this.name)
        } else {
            inst = formdata.single(this.name)
        }

        return inst.call(inst, req, res, next)
    }
}