# @arkstack/filesystem

Filesystem module for Arkstack, providing shared file storage and filesystem utitlities for the framework.

## Custom Drivers

@arkstack/filesystem allows you to configure and use custom storage drivers.

**CloudinaryFileDriver.ts**

```ts
import type { DriverContract, ObjectVisibility } from 'flydrive/types';
import type { CustomDiskConfig } from '@arkstack/filesystem';

export class CloudinaryFileDriver implements DriverContract {
  constructor(private config?: CustomDiskConfig) {}
  async exists(key: string) {}
  async get(key: string) {}
  async getStream(key: string) {}
  async getBytes(key: string) {}
  async getMetaData(key: string) {}
  async getVisibility(): Promise<ObjectVisibility> {}
  async getUrl(key: string) {}
  async getSignedUrl(key: string) {}
  async getSignedUploadUrl(key: string) {}
  async setVisibility() {}
  async put() {}
  async putStream() {}
  async copy() {}
  async move() {}
  async delete() {}
  async deleteAll() {}
  async listAll() {}
  async bucket() {}
}
```

**src/config/filesystem.ts**

```ts
import { CloudinaryFileDriver } from '../CloudinaryFileDriver';
export default () => {
  return {
    default: 'memory',
    disks: {
      images: {
        //...Other Disks Here
        driver: 'cloudinary',
      },
    },
    links: {},
    custom_drivers: {
      cloudinary: CloudinaryFileDriver,
    },
  };
};
```

To improve type safety and auto complete, you may augment the `CustomDiskDriverRegistry`

**env.d.ts**

```ts
declare module '@arkstack/filesystem' {
  interface CustomDiskDriverRegistry {
    cloudinary: { cloud_name: string; api_key: string; api_secret: string };
  }
}
```
