import appConfig from './app'

export default () => {
  const app = appConfig()

  return {
    allowed_origins: [
      app.url,
      app.frontend_url,
      ...env('CORS_ALLOWED_ORIGINS', '')
        .split(',')
        .map((origin: string) => origin.trim()),
    ].filter(Boolean),
  }
}
