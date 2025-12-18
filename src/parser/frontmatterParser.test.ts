/**
 * BorderCollie - Frontmatter Parser Tests
 */

import { describe, it, expect } from 'vitest'
import {
    parseFrontmatter,
    serializeFrontmatter,
    extractWorkspaceName,
    generateUniqueName,
    type Frontmatter
} from './frontmatterParser'

describe('parseFrontmatter', () => {
    it('should parse standard frontmatter with all fields', () => {
        const text = `name: 專案A
gist: abc123
description: 這是描述
createdAt: 2025-12-18
---
AI OCR:
- BA, 2025-10, 2025-11: Andy 0.3`

        const result = parseFrontmatter(text)

        expect(result.frontmatter).not.toBeNull()
        expect(result.frontmatter?.name).toBe('專案A')
        expect(result.frontmatter?.gist).toBe('abc123')
        expect(result.frontmatter?.description).toBe('這是描述')
        expect(result.frontmatter?.createdAt).toBe('2025-12-18')
        expect(result.content).toContain('AI OCR:')
    })

    it('should parse frontmatter with quoted values', () => {
        const text = `name: "My Project: Test"
description: 'Single quoted'
---
content here`

        const result = parseFrontmatter(text)

        expect(result.frontmatter?.name).toBe('My Project: Test')
        expect(result.frontmatter?.description).toBe('Single quoted')
    })

    it('should parse frontmatter with only required name field', () => {
        const text = `name: 最小專案
---
專案內容`

        const result = parseFrontmatter(text)

        expect(result.frontmatter?.name).toBe('最小專案')
        expect(result.frontmatter?.gist).toBeUndefined()
        expect(result.content).toBe('專案內容')
    })

    it('should parse frontmatter with custom fields', () => {
        const text = `name: 自訂欄位專案
customField: 自訂值
anotherField: 123
---
內容`

        const result = parseFrontmatter(text)

        expect(result.frontmatter?.name).toBe('自訂欄位專案')
        expect(result.frontmatter?.customField).toBe('自訂值')
        expect(result.frontmatter?.anotherField).toBe('123')
    })

    it('should return null frontmatter for text without delimiter', () => {
        const text = `AI OCR:
- BA, 2025-10, 2025-11: Andy 0.3`

        const result = parseFrontmatter(text)

        expect(result.frontmatter).toBeNull()
        expect(result.content).toBe(text)
    })

    it('should return null frontmatter when name is missing', () => {
        const text = `gist: abc123
description: 沒有名稱的專案
---
內容`

        const result = parseFrontmatter(text)

        expect(result.frontmatter).toBeNull()
        expect(result.content).toBe(text)
    })
})

describe('serializeFrontmatter', () => {
    it('should serialize complete frontmatter', () => {
        const frontmatter: Frontmatter = {
            name: '專案A',
            gist: 'abc123',
            description: '描述',
            createdAt: '2025-12-18'
        }
        const content = 'AI OCR:\n- BA, 2025-10, 2025-11: Andy 0.3'

        const result = serializeFrontmatter(frontmatter, content)

        expect(result).toContain('name: 專案A')
        expect(result).toContain('gist: abc123')
        expect(result).toContain('description: 描述')
        expect(result).toContain('---')
        expect(result).toContain('AI OCR:')
    })

    it('should serialize frontmatter with custom fields', () => {
        const frontmatter: Frontmatter = {
            name: 'Test',
            customField: 'value'
        }
        const content = 'content'

        const result = serializeFrontmatter(frontmatter, content)

        expect(result).toContain('name: Test')
        expect(result).toContain('customField: value')
    })

    it('should skip empty/undefined fields', () => {
        const frontmatter: Frontmatter = {
            name: 'Test',
            gist: '',
            description: undefined as unknown as string
        }
        const content = 'content'

        const result = serializeFrontmatter(frontmatter, content)

        expect(result).toContain('name: Test')
        expect(result).not.toContain('gist:')
        expect(result).not.toContain('description:')
    })

    it('should quote values containing special characters', () => {
        const frontmatter: Frontmatter = {
            name: 'Project: Special'
        }
        const content = 'content'

        const result = serializeFrontmatter(frontmatter, content)

        expect(result).toContain('name: "Project: Special"')
    })
})

describe('extractWorkspaceName', () => {
    it('should extract name from valid frontmatter', () => {
        const text = `name: 提取的名稱
---
內容`

        expect(extractWorkspaceName(text)).toBe('提取的名稱')
    })

    it('should return null for text without frontmatter', () => {
        const text = `AI OCR:
- BA, 2025-10, 2025-11: Andy 0.3`

        expect(extractWorkspaceName(text)).toBeNull()
    })
})

describe('generateUniqueName', () => {
    it('should return base name when no conflict', () => {
        const existing = ['專案A', '專案B']

        expect(generateUniqueName('專案C', existing)).toBe('專案C')
    })

    it('should add suffix when name conflicts', () => {
        const existing = ['專案A', '專案B']

        expect(generateUniqueName('專案A', existing)).toBe('專案A (1)')
    })

    it('should increment suffix for multiple conflicts', () => {
        const existing = ['專案A', '專案A (1)', '專案A (2)']

        expect(generateUniqueName('專案A', existing)).toBe('專案A (3)')
    })
})
