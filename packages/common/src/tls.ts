import { networkInterfaces } from 'node:os'

export interface TlsCredentials {
    /** PEM-encoded private key. */
    key: string
    /** PEM-encoded certificate. */
    cert: string
}

/** Minimal shape of the `selfsigned` module we rely on. */
interface Selfsigned {
    generate(
        attrs: Array<{ name: string; value: string }>,
        options: Record<string, unknown>,
    ): { private: string; cert: string }
}

let devCertCache: TlsCredentials | undefined

/**
 * Generate (and cache) an in-memory self-signed TLS certificate for local HTTPS
 * development. `selfsigned` is imported lazily so it's only loaded when secure
 * dev mode is actually used.
 *
 * The certificate is not trusted by browsers (expect the usual self-signed
 * warning); it exists only so the dev server can speak HTTPS.
 *
 * @param host  The common name for the certificate (defaults to `localhost`).
 */
export const devTlsCredentials = async (
    host: string = 'localhost'
): Promise<TlsCredentials> => {
    if (devCertCache) {
        return devCertCache
    }

    const mod = await import('selfsigned') as unknown as { default?: Selfsigned } & Selfsigned
    const selfsigned = mod.default ?? mod

    const pems = selfsigned.generate(
        [{ name: 'commonName', value: host }],
        { days: 365, keySize: 2048, algorithm: 'sha256' },
    )

    devCertCache = { key: pems.private, cert: pems.cert }

    return devCertCache
}

/**
 * The machine's first non-internal IPv4 address — its address on the local
 * network — or `undefined` when only loopback interfaces are available.
 */
export const localNetworkAddress = (): string | undefined => {
    for (const list of Object.values(networkInterfaces())) {
        for (const net of list ?? []) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address
            }
        }
    }

    return undefined
}
