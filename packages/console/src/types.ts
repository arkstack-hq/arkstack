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

export interface GroupedOption {
    name: string;
    value: string;
    description: string;
};