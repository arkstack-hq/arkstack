import { env } from '@arkstack/common'
import path from 'path/win32'

export default () => {
    return {
        default: env('FILESYSTEM_DISK', 'local'),
        disks: {
            local: {
                driver: 'local',
                root: path.join(process.cwd(), './storage/app'),
            },
            public: {
                driver: 'local',
                root: path.join(process.cwd(), './storage/app/public'),
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
        links: {
            [path.join(process.cwd(), './public/storage')]: path.join(process.cwd(), './storage/app/public'),
        }
    }
}