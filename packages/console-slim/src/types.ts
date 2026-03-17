export interface Core {
    [k: string]: any
    getDriver: () => {
        [k: string]: any
        name: string
    }
}

export interface ConsoleAppOptions {
    stubsDir?: string;
}