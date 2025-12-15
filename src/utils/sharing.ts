import pako from 'pako'
import { Base64 } from 'js-base64'

/**
 * Compress and encode string to URL-safe Base64
 */
export function encodeData(text: string): string {
    try {
        // 1. Convert string to Uint8Array
        const textEncoder = new TextEncoder()
        const data = textEncoder.encode(text)

        // 2. Gzip compress
        const compressed = pako.gzip(data)

        // 3. Base64 URL Safe encode
        // js-base64 supports initializing from Uint8Array
        return Base64.fromUint8Array(compressed, true) // true = url safe
    } catch (e) {
        console.error('Encoding failed:', e)
        return ''
    }
}

/**
 * Decode and decompress string from URL-safe Base64
 */
export function decodeData(encoded: string): string {
    try {
        // 1. Base64 decode to Uint8Array
        const compressed = Base64.toUint8Array(encoded)

        // 2. Gzip decompress
        const data = pako.ungzip(compressed)

        // 3. Convert back to string
        const textDecoder = new TextDecoder()
        return textDecoder.decode(data)
    } catch (e) {
        console.error('Decoding failed:', e)
        return ''
    }
}
