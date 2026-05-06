import { IUser } from './models/interfaces'

declare module 'resora' {
  interface Config {
    stubs: {
      controller: string;
      api: string;
      model: string;
      apiResource: string;
    };
  }
}

export { }
