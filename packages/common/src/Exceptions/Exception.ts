export class Exception extends Error {
    name: string

    constructor(message?: string, options?: ErrorOptions) {
        super(message, options)
        this.name = 'Exception'
    }
}