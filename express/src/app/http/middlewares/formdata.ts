import multer from 'multer'

export const formdata = multer({ storage: multer.memoryStorage() })