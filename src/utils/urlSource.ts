/**
 * BorderCollie - URL Source Utility
 * 從外部 URL 載入專案資料
 */

export interface UrlSourceResult {
    success: boolean
    content?: string
    error?: string
    sourceUrl?: string
}

/**
 * Base64 URL-safe decode
 * 支援標準 Base64 和 URL-safe Base64
 */
export function decodeSourceUrl(encoded: string): string | null {
    try {
        // URL-safe Base64: 將 - 和 _ 轉回 + 和 /
        let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')

        // 補齊 padding
        const padding = base64.length % 4
        if (padding) {
            base64 += '='.repeat(4 - padding)
        }

        return decodeURIComponent(escape(atob(base64)))
    } catch (error) {
        console.error('Base64 decode error:', error)
        return null
    }
}

/**
 * 將 URL 編碼為 Base64 URL-safe 格式
 */
export function encodeSourceUrl(url: string): string {
    try {
        const base64 = btoa(unescape(encodeURIComponent(url)))
        // 轉為 URL-safe: + -> -, / -> _, 移除 padding
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    } catch (error) {
        console.error('Base64 encode error:', error)
        return ''
    }
}

/**
 * 從外部 URL 載入內容
 */
export async function fetchFromUrl(url: string): Promise<UrlSourceResult> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/plain, text/markdown, */*'
            }
        })

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: '找不到資源 (404)' }
            }
            return { success: false, error: `載入失敗 (${response.status})` }
        }

        const content = await response.text()

        if (!content.trim()) {
            return { success: false, error: '資源內容為空' }
        }

        return {
            success: true,
            content,
            sourceUrl: url
        }
    } catch (error) {
        console.error('URL fetch error:', error)

        // 判斷是否為 CORS 錯誤
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return {
                success: false,
                error: '無法載入資源，可能因 CORS 限制。請手動複製內容至編輯區。',
                sourceUrl: url
            }
        }

        return {
            success: false,
            error: '網路錯誤，請檢查連線狀態或手動複製內容。',
            sourceUrl: url
        }
    }
}

/**
 * 驗證是否為有效的 HTTP/HTTPS URL
 */
export function isValidSourceUrl(url: string): boolean {
    try {
        const parsed = new URL(url)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
        return false
    }
}
