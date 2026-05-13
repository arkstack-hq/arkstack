import { env } from '@arkstack/common'
import path from 'node:path'

export default () => {
    return {
        /**
         * Default filesystem disk to be used by the framework.
         */
        default: env('FILESYSTEM_DISK', 'local'),

        /**
         * Available disks and their configurations. 
         * You can configure as many disks as you want, and even have multiple disks 
         * using the same driver.
         * 
         * Supported drivers: local, ftp, s3
         */
        disks: {
            local: {
                driver: 'local',
                root: path.join(process.cwd(), './storage/app'),
            },
            public: {
                driver: 'local',
                root: path.join(process.cwd(), './storage/app/public'),
            },
            ftp: {
                driver: 'ftp',
                host: env('FTP_HOST'),
                username: env('FTP_USERNAME'),
                password: env('FTP_PASSWORD'),
                port: env('FTP_PORT', 21),
                verbose: env('FTP_VERBOSE', false),
                privateKey: env('FTP_PRIVATE_KEY'),
            },
            s3: {
                driver: 's3',
                key: env('AWS_ACCESS_KEY_ID'),
                secret: env('AWS_SECRET_ACCESS_KEY'),
                region: env('AWS_DEFAULT_REGION'),
                bucket: env('AWS_BUCKET'),
                url: env('AWS_URL'),
                endpoint: env('AWS_ENDPOINT'),
            }
        },

        /**
         * Optional symbolic links to create when the `storage:link` command is executed.
         * The key of the object represents the link location, while the value represents the target location.  
         */
        links: {
            [path.join(process.cwd(), './public/storage')]: path.join(process.cwd(), './storage/app/public'),
        },

        /**
         * Optional file name generator function. 
         * If provided, this function will be used to generate unique file names 
         * for uploaded files when using the `saveFile` method of the Storage class.
         * 
         * @param originalName  The original name of the file
         * @returns             A unique file name
         *
         * fileNameGenerator: (originalName: string) => {
         *     const timestamp = Date.now()
         *     const randomString = Math.random().toString(36).substring(2, 8)
         *     const extension = path.extname(originalName)
         *     const baseName = path.basename(originalName, extension)
         *
         *     return `${baseName}-${timestamp}-${randomString}${extension}`
         * },
         */
    }
}