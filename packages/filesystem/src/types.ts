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
    password: FilesystemConfig['disks']['ftsp']['driver']
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

export type DriverConfig<K extends 'ftp' | 'local' | 's3' | (string & {}) = string & {}> = K extends 'ftp'
    ? FtpDriverConfig
    : (K extends 's3'
        ? S3DriverConfig
        : (K extends 'local'
            ? LocalDriverConfig
            : FtpDriverConfig | S3DriverConfig | LocalDriverConfig
        )
    )

export type DiskConfig =
    | LocalDriverConfig & { driver: 'local'; }
    | FtpDriverConfig & { driver: 'ftp'; }
    | S3DriverConfig & { driver: 's3'; }
    | { driver: string;[key: string]: any }

export type KnownDisks = {
    local: LocalDriverConfig & { driver: 'local'; }
    public: LocalDriverConfig & { driver: 'local'; }
    ftp: FtpDriverConfig & { driver: 'ftp'; }
    s3: S3DriverConfig & { driver: 's3'; }
}

export interface FilesystemConfig {
    default: 'local' | 'ftp' | 's3' | (string & {})
    disks: KnownDisks & { [key: string]: DiskConfig }
    links: Record<string, string>
    custom_drivers?: Record<string, DriverContract>
    fileNameGenerator?: (originalName: string) => string
}