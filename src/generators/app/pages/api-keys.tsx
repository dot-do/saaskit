/**
 * API Keys Page Generator
 *
 * Creates an API keys management page with create, revoke, and scopes.
 */

import { createElement, useState, type ComponentType, type ReactNode, type ChangeEvent } from 'react'
import type { AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'

/**
 * Create an API Keys page component
 */
export function createAPIKeysPage(_config: AppGeneratorConfig): ComponentType<unknown> {
  return function APIKeysPage() {
    const ctx = useTestContext()
    const { data, mutations } = ctx

    const apiKeys = data.apiKeys as Array<{
      id: string
      name: string
      key: string
      lastUsedAt?: string | null
    }> | undefined

    const availableScopes = data.availableScopes as Array<{
      id: string
      name: string
      description: string
    }> | undefined

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newKeyName, setNewKeyName] = useState('')
    const [selectedScopes, setSelectedScopes] = useState<string[]>([])
    const [createdKey, setCreatedKey] = useState<string | null>(null)
    const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(null)

    const handleCreateKey = async () => {
      const createFn = mutations?.apiKeys?.create
      if (createFn) {
        const result = await createFn({ name: newKeyName, scopes: selectedScopes })
        const keyResult = result as { secretKey?: string }
        if (keyResult?.secretKey) {
          setCreatedKey(keyResult.secretKey)
        }
      }
    }

    const handleRevoke = async (keyId: string) => {
      const revokeFn = mutations?.apiKeys?.revoke
      if (revokeFn) {
        await revokeFn(keyId)
      }
      setShowRevokeConfirm(null)
    }

    const children: ReactNode[] = []

    // Title
    children.push(createElement('h1', { key: 'title' }, 'API Keys'))

    // Create button (outside modal) - only shown when modal is closed
    if (!showCreateModal) {
      children.push(
        createElement(
          'button',
          {
            key: 'create-btn',
            type: 'button',
            onClick: () => {
              setShowCreateModal(true)
              setCreatedKey(null)
              setNewKeyName('')
              setSelectedScopes([])
            },
          },
          'Create Key'
        )
      )
    }

    // Existing keys list
    if (apiKeys && apiKeys.length > 0) {
      const keyElements = apiKeys.map((key) =>
        createElement('div', { key: key.id, className: 'api-key' }, [
          createElement('span', { key: 'name' }, key.name),
          createElement('span', { key: 'key' }, key.key),
          key.lastUsedAt && createElement('span', { key: 'last-used' }, `Last used: ${key.lastUsedAt}`),
          createElement(
            'button',
            {
              key: 'revoke',
              type: 'button',
              onClick: () => setShowRevokeConfirm(key.id),
            },
            'Revoke'
          ),
        ])
      )

      children.push(createElement('div', { key: 'keys-list' }, keyElements))
    }

    // Create modal
    if (showCreateModal) {
      const modalContent: ReactNode[] = [
        createElement('h2', { key: 'title' }, 'Create API Key'),
        createElement('label', { key: 'name-label', htmlFor: 'key-name' }, 'Name'),
        createElement('input', {
          key: 'name-input',
          id: 'key-name',
          type: 'text',
          'aria-label': 'Name',
          value: newKeyName,
          onChange: (e: ChangeEvent<HTMLInputElement>) => setNewKeyName(e.target.value),
        }),
      ]

      // Scopes selection
      if (availableScopes && availableScopes.length > 0) {
        modalContent.push(
          createElement('label', { key: 'scopes-label' }, 'Scopes')
        )
        modalContent.push(
          createElement('div', { key: 'scopes', 'aria-label': 'Scopes' },
            availableScopes.map((scope) =>
              createElement('label', { key: scope.id }, [
                createElement('input', {
                  key: 'checkbox',
                  type: 'checkbox',
                  checked: selectedScopes.includes(scope.id),
                  onChange: (e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.checked) {
                      setSelectedScopes([...selectedScopes, scope.id])
                    } else {
                      setSelectedScopes(selectedScopes.filter((s) => s !== scope.id))
                    }
                  },
                }),
                createElement('span', { key: 'name' }, scope.name),
              ])
            )
          )
        )
      }

      // Show created key
      if (createdKey) {
        modalContent.push(
          createElement('div', { key: 'created-key' }, [
            createElement('p', { key: 'warning' }, 'This key will not be shown again. Save it now.'),
            createElement('code', { key: 'key' }, createdKey),
            createElement('button', { key: 'copy', type: 'button' }, 'Copy to Clipboard'),
          ])
        )
      } else {
        modalContent.push(
          createElement(
            'button',
            { key: 'create', type: 'button', onClick: handleCreateKey },
            'Generate'
          )
        )
      }

      modalContent.push(
        createElement(
          'button',
          { key: 'close', type: 'button', onClick: () => setShowCreateModal(false) },
          'Close'
        )
      )

      children.push(
        createElement('div', { key: 'create-modal', role: 'dialog' }, modalContent)
      )
    }

    // Revoke confirmation dialog
    if (showRevokeConfirm) {
      children.push(
        createElement('div', { key: 'revoke-confirm', role: 'dialog' }, [
          createElement('p', { key: 'message' }, 'Are you sure you want to revoke this API key?'),
          createElement(
            'button',
            { key: 'confirm', type: 'button', onClick: () => handleRevoke(showRevokeConfirm) },
            'Confirm'
          ),
          createElement(
            'button',
            { key: 'cancel', type: 'button', onClick: () => setShowRevokeConfirm(null) },
            'Cancel'
          ),
        ])
      )
    }

    return createElement('div', { 'data-page': 'api-keys' }, children)
  }
}
