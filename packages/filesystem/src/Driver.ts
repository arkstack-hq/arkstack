import { CustomDiskDriverRegistry, DriverConfig, FtpDriverConfig, LocalDriverConfig, S3DriverConfig } from './types'
import { DriverContract, SignedURLOptions } from 'flydrive/types'

import { FSDriver } from 'flydrive/drivers/fs'
import { FtpDriver } from './FtpDriver'
import { S3Driver } from 'flydrive/drivers/s3'
import { appUrl } from '@arkstack/common'

type BuiltInDriverMap = { [K in keyof Driver]: Driver[K] }

type DriverFor<K extends string> = K extends keyof BuiltInDriverMap
    ? ReturnType<BuiltInDriverMap[K]>
    : ReturnType<BuiltInDriverMap['custom']>

export class Driver {
    private static customDrivers = new Map<keyof CustomDiskDriverRegistry | (string & {}), DriverContract>()

    constructor(private config: DriverConfig) { }

    static make<K extends 'local' | 'ftp' | 's3' | (string & {})> (
        name: K,
        config: DriverConfig<K>
    ): DriverFor<K> {
        if (!['local', 'ftp', 's3'].includes(name) && !this.customDrivers.has(name)) {
            throw new Error(`Unsupported driver: ${name}`)
        }

        const driver = new Driver(config)

        if (this.customDrivers.has(name)) {
            return driver.custom(name) as DriverFor<K>
        }

        return driver['ftp'].apply(this) as DriverFor<K>

    }

    local () {
        const config = this.config as LocalDriverConfig

        return new FSDriver({
            location: config.location ?? new URL(config.root!, import.meta.url),
            visibility: config.visibility ?? 'public',
            urlBuilder: {
                async generateURL (key: string, _path: string) {
                    return appUrl(key)
                },

                async generateSignedURL (key: string, _path: string, _opts: SignedURLOptions) {
                    return appUrl(key)
                },
            },
        })
    }

    s3 () {
        const config = this.config as S3DriverConfig

        return new S3Driver({
            credentials: config.credentials ?? {
                accessKeyId: config.key!,
                secretAccessKey: config.secret!,
            },
            endpoint: config.endpoint,
            region: config.region,
            bucket: config.bucket,
            visibility: 'private',
            cdnUrl: config.cdnUrl ?? config.url,
        })
    }

    ftp () {
        const config = this.config as FtpDriverConfig

        return new FtpDriver({
            host: config.host,
            username: config.username,
            password: config.password,
            port: config.port,
            verbose: config.verbose,
            privateKey: config.privateKey,
        })
    }

    custom (name: string): DriverContract {
        if (!Driver.customDrivers.has(name)) {
            throw new Error(`Unsupported driver: ${name} has not been registered`)
        }

        return Driver.customDrivers.get(name)!
    }

    /**
     * Register a new custom driver
     * 
     * @param name 
     * @param driver 
     */
    static registerDriver (name: string, driver: DriverContract) {
        Driver.customDrivers.set(name, driver)
    }

    /**
     * Unregister a new custom driver
     * 
     * @param name 
     */
    static removeDriver (name: string) {
        Driver.customDrivers.delete(name)
    }
}