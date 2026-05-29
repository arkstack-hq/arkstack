export default () => {

    return {
        allowed_origins: [
            'https://link1',
            'https://link2',
        ].filter(Boolean)
    }
}