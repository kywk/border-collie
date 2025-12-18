/**
 * BorderCollie - Frontmatter Parser
 * 解析與序列化 Frontmatter 格式
 */

export interface Frontmatter {
    name: string                  // 必填：工作區名稱
    gist?: string                 // 選填：Gist ID
    description?: string          // 選填：描述
    createdAt?: string            // 選填：建立時間
    [key: string]: unknown        // 其他欄位
}

export interface ParsedDocument {
    frontmatter: Frontmatter | null
    content: string
}

const FRONTMATTER_DELIMITER = '---'

/**
 * 解析文件中的 Frontmatter
 * 
 * 格式：
 * ```
 * name: "專案名稱"
 * gist: "Gist ID"
 * description: "描述"
 * ---
 * [專案內容]
 * ```
 */
export function parseFrontmatter(text: string): ParsedDocument {
    const trimmedText = text.trim()
    
    // 尋找 --- 分隔符
    const delimiterIndex = trimmedText.indexOf(FRONTMATTER_DELIMITER)
    
    if (delimiterIndex === -1) {
        // 沒有 Frontmatter
        return {
            frontmatter: null,
            content: text
        }
    }
    
    const frontmatterSection = trimmedText.slice(0, delimiterIndex).trim()
    const contentSection = trimmedText.slice(delimiterIndex + FRONTMATTER_DELIMITER.length).trim()
    
    // 解析 Frontmatter 欄位
    const frontmatter = parseFrontmatterFields(frontmatterSection)
    
    if (!frontmatter || !frontmatter.name) {
        // Frontmatter 無效 (缺少必填的 name)
        return {
            frontmatter: null,
            content: text
        }
    }
    
    return {
        frontmatter,
        content: contentSection
    }
}

/**
 * 解析 Frontmatter 欄位
 */
function parseFrontmatterFields(text: string): Frontmatter | null {
    const lines = text.split('\n')
    const result: Record<string, unknown> = {}
    
    for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue
        
        // 格式: key: value 或 key: "value"
        const colonIndex = trimmedLine.indexOf(':')
        if (colonIndex === -1) continue
        
        const key = trimmedLine.slice(0, colonIndex).trim()
        let value: string = trimmedLine.slice(colonIndex + 1).trim()
        
        // 移除引號
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        
        result[key] = value
    }
    
    // 驗證必填欄位
    if (!result.name || typeof result.name !== 'string') {
        return null
    }
    
    return result as Frontmatter
}

/**
 * 序列化 Frontmatter 和內容為完整文件
 */
export function serializeFrontmatter(frontmatter: Frontmatter, content: string): string {
    const lines: string[] = []
    
    // 標準欄位順序
    const standardFields = ['name', 'gist', 'description', 'createdAt']
    const customFields: string[] = []
    
    // 分類欄位
    for (const key of Object.keys(frontmatter)) {
        if (!standardFields.includes(key)) {
            customFields.push(key)
        }
    }
    
    // 序列化標準欄位
    for (const key of standardFields) {
        const value = frontmatter[key]
        if (value !== undefined && value !== null && value !== '') {
            lines.push(formatFrontmatterLine(key, value))
        }
    }
    
    // 序列化自訂欄位
    for (const key of customFields) {
        const value = frontmatter[key]
        if (value !== undefined && value !== null && value !== '') {
            lines.push(formatFrontmatterLine(key, value))
        }
    }
    
    // 組合
    if (lines.length === 0) {
        return content
    }
    
    return `${lines.join('\n')}\n${FRONTMATTER_DELIMITER}\n${content}`
}

/**
 * 格式化單行 Frontmatter
 */
function formatFrontmatterLine(key: string, value: unknown): string {
    const strValue = String(value)
    // 若包含特殊字元則使用引號
    if (strValue.includes(':') || strValue.includes('\n') || strValue.includes('"')) {
        return `${key}: "${strValue.replace(/"/g, '\\"')}"`
    }
    return `${key}: ${strValue}`
}

/**
 * 從文件中提取專案名稱
 * 若有 Frontmatter 則使用 name，否則返回 null
 */
export function extractWorkspaceName(text: string): string | null {
    const { frontmatter } = parseFrontmatter(text)
    return frontmatter?.name ?? null
}

/**
 * 生成唯一的工作區名稱（自動加後綴）
 */
export function generateUniqueName(baseName: string, existingNames: string[]): string {
    if (!existingNames.includes(baseName)) {
        return baseName
    }
    
    let counter = 1
    let newName = `${baseName} (${counter})`
    
    while (existingNames.includes(newName)) {
        counter++
        newName = `${baseName} (${counter})`
    }
    
    return newName
}
