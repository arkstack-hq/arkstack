import { DriveDirectory, DriveFile, DriveManager } from 'flydrive'
import { DriverContract, ObjectMetaData, ObjectVisibility, SignedURLOptions, WriteOptions } from 'flydrive/types'
import { appUrl, config } from '@arkstack/common'
import { rmSync, symlinkSync } from 'node:fs'

import { Arkstack } from '@arkstack/contract'
import { FSDriver } from 'flydrive/drivers/fs'
import { FtpDriver } from './FtpDriver'
import { Logger } from '@h3ravel/shared'
import { Readable } from 'node:stream'
import { S3Driver } from 'flydrive/drivers/s3'
import path from 'node:path'

interface FileLike {
    originalname: string
    buffer: Buffer
    mimetype: string
}

export class Storage implements DriverContract {
    driver: DriveManager<any>
    services: Record<string, () => DriverContract> = {}
    diskName: string

    constructor() {
        for (const diskName in config('filesystem.disks')) {
            const diskConfig = config('filesystem.disks')[diskName]
            const driverFactory = this.driversMap[diskConfig.driver]

            if (!driverFactory) {
                throw new Error(`Unsupported driver: ${diskConfig.driver}`)
            }

            this.services[diskName] = () => driverFactory(diskConfig)
        }

        this.diskName = config('filesystem.default')
        this.driver = new DriveManager({
            default: config('filesystem.default'),
            services: this.services
        })
    }

    /**
     * Static method to get a disk instance directly from the Storage class without needing to instantiate it first.
     * 
     * @param diskName The name of the disk to use. If not provided, the default disk will be used.
     * @returns A Storage instance
     */
    static disk<K extends string> (diskName?: K): Storage {
        const storage = new Storage()

        if (diskName) {
            storage.diskName = diskName
            storage.driver = new DriveManager({
                default: diskName,
                services: storage.services
            })
        }

        return storage
    }

    /**
     * Generate a unique name for the file based on random numbers and original extension
     * 
     * @param file  The file object containing the original name
     * @returns     A unique file name
     */
    static generateName = (file: { name?: string; originalname?: string }): string => {
        const name = file.originalname || file.name || 'file'

        if (typeof config('filesystem.fileNameGenerator') === 'function') {
            return config('filesystem.fileNameGenerator')(name)
        }

        return Math.floor(Math.random() * 999999999999).toString() +
            '_' + Math.floor(Math.random() * 999999999999) +
            '.' + (name).split('.').pop()
    }

    /**
     * Save the file to the storage and return the public URL and the file path
     * 
     * @param file      The file object containing the file data
     * @param filePath  The path where the file should be saved
     * @param fileName  The name to save the file as (optional)
     * @returns         A tuple containing the public URL and the file path
     */
    static saveFile = async (
        file: FileLike,
        filePath: string = '',
        fileName?: string
    ): Promise<[string, string]> => {
        return new Storage().saveFile(file, filePath, fileName)
    }

    /**
     * Save the file to the storage and return the public URL and the file path
     * 
     * @param file      The file object containing the file data
     * @param filePath  The path where the file should be saved
     * @param fileName  The name to save the file as (optional)
     * @returns         A tuple containing the public URL and the file path
     */
    saveFile = async (
        file: FileLike,
        filePath: string = '',
        fileName?: string
    ): Promise<[string, string]> => {
        const name = fileName || Storage.generateName(file)
        const drive = this.driver.use()

        if (file instanceof File && !file.buffer) {
            file.buffer = Buffer.from(await file.arrayBuffer())
        }

        await drive.put(path.join(filePath, name), file.buffer)

        const url = await drive.getUrl(path.join(filePath, name))
        const pth = this.diskName === 'local' ? path.join(filePath, name) : url

        return [url, pth]
    }

    /**
     * Return a boolean indicating if the file exists
     */
    exists (key: string): Promise<boolean> {
        return this.driver.use().exists(key)
    }
    /**
     * Return contents of a object for the given key as a UTF-8 string.
     * Should throw "E_CANNOT_READ_FILE" error when the file
     * does not exists.
     */
    get (key: string): Promise<string> {
        return this.driver.use().get(key)
    }
    /**
     * Return contents of a object for the given key as a Readable stream.
     * Should throw "E_CANNOT_READ_FILE" error when the file
     * does not exists.
     */
    getStream (key: string): Promise<Readable> {
        return this.driver.use().getStream(key)
    }
    /**
     * Return contents of an object for the given key as an Uint8Array.
     * Should throw "E_CANNOT_READ_FILE" error when the file
     * does not exists.
     */
    getBytes (key: string): Promise<Uint8Array> {
        return this.driver.use().getBytes(key)
    }
    /**
     * Return metadata of an object for the given key.
     */
    getMetaData (key: string): Promise<ObjectMetaData> {
        return this.driver.use().getMetaData(key)
    }
    /**
     * Return the visibility of the file
     */
    getVisibility (key: string): Promise<ObjectVisibility> {
        return this.driver.use().getVisibility(key)
    }
    /**
     * Return the public URL to access the file
     */
    getUrl (key: string): Promise<string> {
        return this.driver.use().getUrl(key)
    }
    /**
     * Return the signed/temporary URL to access the file
     */
    getSignedUrl (key: string, options?: SignedURLOptions): Promise<string> {
        return this.driver.use().getSignedUrl(key, options)
    }
    /**
     * Return the signed/temporary URL that can be used to directly upload
     * the file contents to the storage.
     */
    getSignedUploadUrl (key: string, options?: SignedURLOptions): Promise<string> {
        return this.driver.use().getSignedUploadUrl(key, options)
    }
    /**
     * Update the visibility of the file
     */
    setVisibility (key: string, visibility: ObjectVisibility): Promise<void> {
        return this.driver.use().setVisibility(key, visibility)
    }
    /**
     * Write object to the destination with the provided
     * contents.
     */
    put (key: string, contents: string | Uint8Array | FileLike, options?: WriteOptions): Promise<void> {
        if (!(contents instanceof Uint8Array) && typeof contents !== 'string') {
            contents = contents.buffer
        }

        return this.driver.use().put(key, contents, options)
    }
    /**
     * Write object to the destination with the provided
     * contents as a readable stream
     */
    putStream (key: string, contents: Readable, options?: WriteOptions): Promise<void> {
        return this.driver.use().putStream(key, contents, options)
    }
    /**
     * Copy the file from within the disk root location. Both
     * the "source" and "destination" will be the key names
     * and not absolute paths.
     */
    copy (source: string, destination: string, options?: WriteOptions): Promise<void> {
        return this.driver.use().copy(source, destination, options)
    }
    /**
     * Move the file from within the disk root location. Both
     * the "source" and "destination" will be the key names
     * and not absolute paths.
     */
    move (source: string, destination: string, options?: WriteOptions): Promise<void> {
        return this.driver.use().move(source, destination, options)
    }
    /**
     * Delete the file for the given key. Should not throw
     * error when file does not exist in first place
     */
    delete (key: string): Promise<void> {
        return this.driver.use().delete(key)
    }
    /**
     * Delete the files and directories matching the provided prefix.
     */
    deleteAll (prefix: string): Promise<void> {
        return this.driver.use().deleteAll(prefix)
    }
    /**
     * The list all method must return an array of objects with
     * the ability to paginate results (if supported).
     */
    listAll (prefix: string, options?: {
        recursive?: boolean;
        paginationToken?: string;
    }): Promise<{
        paginationToken?: string;
        objects: Iterable<DriveFile | DriveDirectory>;
    }> {
        return this.driver.use().listAll(prefix, options)
    }
    /**
     * Switch bucket at runtime if supported.
     */
    bucket (bucket: string): DriverContract {
        return (this.driver.use() as any).bucket(bucket)
    }

    /**
     * Create symbolic links for all configured links in the application configuration.
     */
    static link ({ force = false }: { force?: boolean } = {}): void {
        for (const link in config('filesystem.links')) {
            const target = config('filesystem.links')[link]

            const unlink = link.replace(Arkstack.rootDir(), '')
            const untarget = target.replace(Arkstack.rootDir(), '')

            try {
                if (force) rmSync(link, { recursive: true, force: true })
                symlinkSync(target, link)

                Logger.log([
                    [' SUCCESS ', 'bgGreen'],
                    [`[${unlink}]`, 'green'],
                    ['is now linked to', 'white'],
                    [`[${untarget}].`, 'green']
                ], ' ')
            } catch (error: any) {
                if (error.code === 'EEXIST') {
                    Logger.log([
                        [' INFO ', 'bgBlue'],
                        [`[${unlink}]`, 'green'],
                        ['is already linked to', 'white'],
                        [`[${untarget}].`, 'green']
                    ], ' ')
                } else {
                    Logger.log([
                        [' ERROR ', 'bgRed'],
                        ['Failed to create symbolic link from', 'white'],
                        [`[${unlink}]`, 'green'],
                        ['to', 'white'],
                        [`[${untarget}]`, 'green'],
                        [error.message, 'red']
                    ], ' ')
                }
            }
        }
    }

    private driversMap: Record<string, (conf: Record<string, any>) => DriverContract> = {
        local: (conf: Record<string, any>) => new FSDriver({
            location: new URL(conf.root, import.meta.url),
            visibility: 'public',
            urlBuilder: {
                async generateURL (key: string, _path: string) {
                    return appUrl(key)
                },

                async generateSignedURL (key: string, _path: string, _opts: SignedURLOptions) {
                    return appUrl(key)
                },
            },
        }),
        s3: (conf: Record<string, any>) => new S3Driver({
            credentials: {
                accessKeyId: conf.key,
                secretAccessKey: conf.secret,
            },
            endpoint: conf.endpoint,
            region: conf.region,
            bucket: conf.bucket,
            visibility: 'private',
            cdnUrl: conf.url,
        }),
        ftp: (conf: Record<string, any>) => new FtpDriver({
            host: conf.host,
            username: conf.username,
            password: conf.password,
            port: conf.port,
            verbose: conf.verbose,
            privateKey: conf.privateKey,
        }),
    }
}