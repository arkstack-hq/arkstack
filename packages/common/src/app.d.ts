import type { GlobalConfig, GlobalEnv } from '.'

interface Stubs {
  api: string;
  model: string;
  resource: string;
  controller: string;
  collection: string;
  apiResource: string;
}

declare global {
  var env: GlobalEnv
  var config: GlobalConfig

  /**
   * Thows to abort the current request
   * 
   * @param message 
   * @param code 
   * @throws {RequestException}
   */
  function abort (
    message?: string,
    code?: number
  ): void

  /**
   * Asserts that a boolean condition is true. 
   * 
   * @param boolean 
   * @param message 
   * @param code 
   * @throws {RequestException} Throws if the boolean condition is true.
   */
  function abortIf<T> (
    boolean: T,
    message?: string,
    code?: number,
  ): asserts  boolean is T

  /**
   * Asserts that a value is not null or undefined. 
   * 
   * @param value 
   * @param message 
   * @param code 
   * @throws {RequestException} Throws if the value is null or undefined.
   */
  function assertFound<T> (
    value: T | null | undefined,
    message: string,
    code: number = 404,
  ): asserts value is T

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

declare module 'resora' {
  interface Config {
    stubs: Stubs;
  }

  interface ResoraConfig {
    stubs?: Partial<Stubs> | undefined
  }
}

export { }
