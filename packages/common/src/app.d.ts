import { GlobalConfig, GlobalEnv } from './system'

declare global {
  var env: GlobalEnv
  var config: GlobalConfig
  interface String {
    /**
     * Converts the string to title case.
     */
    titleCase (): string;
    /**
     * Converts the string to camel case.
     */
    camelCase (): string;
    /**
     * Converts the string to pascal case.
     */
    pascalCase (): string;
    /**
     * Truncates the string to a specified length while preserving words
     * and adds a suffix if necessary.
     * 
     * @param len Length of the string
     * @param suffix Suffix to add to the string
     */
    truncate (len: number, suffix?: string): string;
  }
}

export { }
