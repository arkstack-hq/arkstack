import { AppConfig } from '@arkstack/common'

export default (): AppConfig => {
    return {
        env: env('APP_ENV', 'local'),
        key: env('APP_KEY', 'change-me'),
        url: env('APP_URL', 'http://localhost'),
        host: env('APP_HOST', '0.0.0.0'),
        name: env('APP_NAME', 'Arkstack'),
        frontend_url: env('FRONTEND_URL', 'http://localhost:3000'),
        debug: env('APP_DEBUG', false),
        timezone: env('APP_TIMEZONE', 'UTC'),
        locale: env('APP_LOCALE', 'en'),
        fallback_locale: env('APP_FALLBACK_LOCALE', 'en'),
        faker_locale: env('APP_FAKER_LOCALE', 'en_US'),
    }
}
