/**
 * 测试环境验证
 * 确保 GM API mock 和测试框架正常工作
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { clearGMStorage, gmStorage } from '../setup'

describe('Test Environment Setup', () => {
  beforeEach(() => {
    clearGMStorage()
  })

  describe('GM_setValue / GM_getValue', () => {
    it('should store and retrieve string values', () => {
      GM_setValue('test_key', 'test_value')
      expect(GM_getValue('test_key')).toBe('test_value')
    })

    it('should store and retrieve object values', () => {
      const obj = { name: 'test', count: 42 }
      GM_setValue('test_obj', obj)
      expect(GM_getValue('test_obj')).toEqual(obj)
    })

    it('should return default value for non-existent key', () => {
      expect(GM_getValue('non_existent', 'default')).toBe('default')
    })
  })

  describe('GM_deleteValue', () => {
    it('should delete stored value', () => {
      GM_setValue('to_delete', 'value')
      GM_deleteValue('to_delete')
      expect(GM_getValue('to_delete', 'default')).toBe('default')
    })
  })

  describe('GM_listValues', () => {
    it('should list all stored keys', () => {
      GM_setValue('key1', 'value1')
      GM_setValue('key2', 'value2')
      const keys = GM_listValues()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
    })
  })

  describe('clearGMStorage', () => {
    it('should clear all stored values', () => {
      GM_setValue('key1', 'value1')
      GM_setValue('key2', 'value2')
      clearGMStorage()
      expect(gmStorage.size).toBe(0)
    })
  })
})
