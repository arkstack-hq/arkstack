export default config = () => {
    return {
        key: env('APP_KEY', 'change-me'),
        url: env('APP_URL', 'http://localhost'),
        frontend_url: env('FRONTEND_URL', 'http://localhost:3000'),
    }
}