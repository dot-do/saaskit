/**
 * Team Page Generator
 *
 * Creates a team management page with user list, invite, and role management.
 */

import { createElement, useState, type ComponentType, type ReactNode, type ChangeEvent, type FormEvent } from 'react'
import type { AppGeneratorConfig } from '../types'
import { useTestContext } from '../test-utils'

/**
 * Create a Team page component
 */
export function createTeamPage(config: AppGeneratorConfig): ComponentType<unknown> {
  return function TeamPage() {
    const ctx = useTestContext()
    const { data, mutations, user } = ctx

    const teamMembers = data.teamMembers as Array<{
      id: string
      email: string
      name: string
      role: string
    }> | undefined

    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState('member')
    const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)

    // Check permissions for team page
    const canView = !user?.permissions || user.permissions.includes('team.read')

    // RBAC: Show 403 if no permission
    if (user && !canView) {
      return createElement('div', { 'data-page': 'team' }, [
        createElement('h1', { key: 'title' }, '403 - Not Authorized'),
      ])
    }

    const handleInvite = async () => {
      const inviteFn = mutations?.team?.invite
      if (inviteFn) {
        await inviteFn({ email: inviteEmail, role: inviteRole })
      }
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole('member')
    }

    const handleRemove = async (memberId: string) => {
      const removeFn = mutations?.team?.remove
      if (removeFn) {
        await removeFn(memberId)
      }
      setShowRemoveConfirm(null)
    }

    const handleRoleChange = async (memberId: string, newRole: string) => {
      const updateRoleFn = mutations?.team?.updateRole
      if (updateRoleFn) {
        await updateRoleFn(memberId, newRole)
      }
    }

    const children: ReactNode[] = []

    // Title
    children.push(createElement('h1', { key: 'title' }, 'Team'))

    // Invite button
    children.push(
      createElement(
        'button',
        {
          key: 'invite-btn',
          type: 'button',
          onClick: () => setShowInviteModal(true),
        },
        'Invite'
      )
    )

    // Team member list
    if (teamMembers && teamMembers.length > 0) {
      const memberElements = teamMembers.map((member) =>
        createElement('div', { key: member.id, className: 'team-member' }, [
          createElement('span', { key: 'email' }, member.email),
          createElement('span', { key: 'name' }, member.name),
          createElement(
            'select',
            {
              key: 'role',
              'data-testid': `role-select-${member.id}`,
              value: member.role,
              onChange: (e: ChangeEvent<HTMLSelectElement>) =>
                handleRoleChange(member.id, e.target.value),
            },
            [
              createElement('option', { key: 'member', value: 'member' }, 'member'),
              createElement('option', { key: 'admin', value: 'admin' }, 'admin'),
            ]
          ),
          createElement(
            'button',
            {
              key: 'remove',
              type: 'button',
              'data-testid': `remove-${member.id}`,
              onClick: () => setShowRemoveConfirm(member.id),
            },
            'Remove'
          ),
        ])
      )

      children.push(createElement('div', { key: 'members' }, memberElements))
    }

    // Invite modal
    if (showInviteModal) {
      children.push(
        createElement('div', { key: 'invite-modal', role: 'dialog' }, [
          createElement('h2', { key: 'title' }, 'Invite Team Member'),
          createElement('label', { key: 'email-label', htmlFor: 'invite-email' }, 'Email'),
          createElement('input', {
            key: 'email-input',
            id: 'invite-email',
            type: 'email',
            'aria-label': 'Email',
            value: inviteEmail,
            onChange: (e: ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value),
          }),
          createElement('label', { key: 'role-label', htmlFor: 'invite-role' }, 'Role'),
          createElement(
            'select',
            {
              key: 'role-select',
              id: 'invite-role',
              'aria-label': 'Role',
              value: inviteRole,
              onChange: (e: ChangeEvent<HTMLSelectElement>) => setInviteRole(e.target.value),
            },
            [
              createElement('option', { key: 'member', value: 'member' }, 'member'),
              createElement('option', { key: 'admin', value: 'admin' }, 'admin'),
            ]
          ),
          createElement(
            'button',
            { key: 'send', type: 'button', onClick: handleInvite },
            'Send Invite'
          ),
          createElement(
            'button',
            { key: 'cancel', type: 'button', onClick: () => setShowInviteModal(false) },
            'Cancel'
          ),
        ])
      )
    }

    // Remove confirmation dialog
    if (showRemoveConfirm) {
      children.push(
        createElement('div', { key: 'remove-confirm', role: 'dialog' }, [
          createElement('p', { key: 'message' }, 'Are you sure you want to remove this team member?'),
          createElement(
            'button',
            { key: 'confirm', type: 'button', onClick: () => handleRemove(showRemoveConfirm) },
            'Confirm'
          ),
          createElement(
            'button',
            { key: 'cancel', type: 'button', onClick: () => setShowRemoveConfirm(null) },
            'Cancel'
          ),
        ])
      )
    }

    return createElement('div', { 'data-page': 'team' }, children)
  }
}
