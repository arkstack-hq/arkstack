import type { FastifyReply, FastifyRequest } from 'fastify'

import type { UploadedFile } from '../types'

/**
 * Reads a multipart body into plain `req.body` fields and multer-shaped files
 * on `req.uploads`. Requests that are not multipart pass through untouched.
 */
export const formdata = () => async (req: FastifyRequest, _reply: FastifyReply) => {
  if (!req.isMultipart()) return

  const body: Record<string, unknown> = {}
  const uploads: UploadedFile[] = []

  for await (const part of req.parts()) {
    if (part.type === 'file') {
      const buffer = await part.toBuffer()

      uploads.push({
        buffer,
        encoding: part.encoding,
        fieldname: part.fieldname,
        mimetype: part.mimetype,
        originalname: part.filename,
        size: buffer.byteLength,
      })

      continue
    }

    appendField(body, part.fieldname, part.value)
  }

  req.body = body
  req.uploads = uploads
}

export class FormDataMiddleware {
  handle(req: FastifyRequest, reply: FastifyReply) {
    return formdata()(req, reply)
  }
}

const appendField = (body: Record<string, unknown>, name: string, value: unknown) => {
  if (!(name in body)) {
    body[name] = value

    return
  }

  const current = body[name]

  body[name] = Array.isArray(current) ? [...current, value] : [current, value]
}
