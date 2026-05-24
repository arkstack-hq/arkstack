import appConfig from './app'

export default config = () => {
    const app = appConfig()

    return {
        allowed_origins: [
            app.app_url,
            app.frontend_url,
        ].filter(Boolean)
    }
}