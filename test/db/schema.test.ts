import { describe, it, expect, afterEach } from 'vitest'
import { serviceClient } from './helpers'

describe('core schema constraints', () => {
  const cleanupStoreIds: number[] = []

  afterEach(async () => {
    const admin = serviceClient()
    for (const id of cleanupStoreIds.splice(0)) {
      await admin.from('stores').delete().eq('id', id)
    }
  })

  it('enforces one link per (destination, employee) pair', async () => {
    const admin = serviceClient()

    const { data: authUser } = await admin.auth.admin.createUser({
      email: `schema-test-${Date.now()}@example.com`,
      password: 'test-password-123!',
      email_confirm: true,
    })

    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ name: 'Schema Test Store', owner_user_id: authUser!.user!.id })
      .select()
      .single()
    expect(storeError).toBeNull()
    cleanupStoreIds.push(store!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: store!.id, label: 'Google Maps', target_url: 'https://maps.google.com/x' })
      .select()
      .single()

    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: store!.id, name: 'Somchai' })
      .select()
      .single()

    // The link_lifecycle_triggers migration already auto-created a link for
    // this (destination, employee) pair the instant `employee` was inserted
    // above, so a manual insert for the same pair is the duplicate.
    const { error: duplicateLinkError } = await admin.from('links').insert({
      store_id: store!.id,
      destination_id: destination!.id,
      employee_id: employee!.id,
      slug: 'schema-test-slug-1',
    })
    expect(duplicateLinkError).not.toBeNull()
    expect(duplicateLinkError!.message).toMatch(/duplicate key value/i)
  })
})
