export default () => {
    return {
        env: env('APP_ENV', 'local'),
        key: env('APP_KEY', 'change-me'),
        url: env('APP_URL', 'http://localhost'),
        name: env('APP_NAME', 'Arkstack'),
        frontend_url: env('FRONTEND_URL', 'http://localhost:3000'),
    }
}
