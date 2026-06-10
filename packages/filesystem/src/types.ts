import { DriverContract, ObjectVisibility } from 'flydrive/types'

export interface FileLike {
    originalname: string
    buffer: Buffer
    mimetype: string
}

export interface CustomDiskDriverRegistry { }

export interface FtpDriverConfig {
    host: string
    username: string
    password: string
    port?: number
    verbose?: boolean | undefined
    privateKey?: string | undefined
}

export interface S3DriverConfig {
    credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
        sessionToken?: string | undefined;
        credentialScope?: string | undefined;
        accountId?: string | undefined;
    },
    url?: string
    key?: string
    secret?: string
    endpoint?: string
    region?: string
    bucket: string
    visibility: ObjectVisibility
    cdnUrl?: string
}

export interface LocalDriverConfig {
    root?: string
    location?: string | URL
    visibility: ObjectVisibility
}

export type CustomDiskConfig = keyof CustomDiskDriverRegistry extends never
    ? { driver: string;[key: string]: any }
    : { [K in keyof CustomDiskDriverRegistry]: CustomDiskDriverRegistry[K] & { driver: K } }[keyof CustomDiskDriverRegistry]

export type DiskConfig =
    | LocalDriverConfig & { driver: 'local' | 'public' }
    | FtpDriverConfig & { driver: 'ftp' }
    | S3DriverConfig & { driver: 's3' }
    | CustomDiskConfig

export type DriverConfig<K extends 'ftp' | 'local' | 's3' | (string & {}) = string & {}> =
    K extends 'ftp' ? FtpDriverConfig :
    K extends 's3' ? S3DriverConfig :
    K extends 'local' ? LocalDriverConfig :
    K extends keyof CustomDiskDriverRegistry ? CustomDiskDriverRegistry[K] :
    DiskConfig

export type KnownDisks = {
    local: LocalDriverConfig & { driver: 'local' }
    public: LocalDriverConfig & { driver: 'local' }
    ftp: FtpDriverConfig & { driver: 'ftp' }
    s3: S3DriverConfig & { driver: 's3' }
}

export interface FilesystemConfig {
    default: 'local' | 'ftp' | 's3' | keyof CustomDiskDriverRegistry | (string & {})
    disks: KnownDisks & CustomDiskDriverRegistry
    links: Record<string, string>
    custom_drivers?: Record<
        keyof CustomDiskDriverRegistry | (string & {}),
        DriverContract | (new (config?: CustomDiskConfig) => DriverContract)
    >
    fileNameGenerator?: (originalName: string) => string
}