import appConfig from './app'

export default () => {
    const app = appConfig()

    return {
        allowed_origins: [
            app.url,
            app.frontend_url,
        ].filter(Boolean)
    }
}