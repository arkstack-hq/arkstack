export default config = () => {
    return {
        app_url: env('APP_URL', 'http://localhost'),
        frontend_url: env('FRONTEND_URL', 'http://localhost:3000'),
    }
}