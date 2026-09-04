import { describe, it, expect, afterEach } from 'vitest'
import { serviceClient } from './helpers'

describe('link lifecycle triggers', () => {
  const cleanupStoreIds: number[] = []

  afterEach(async () => {
    const admin = serviceClient()
    for (const id of cleanupStoreIds.splice(0)) {
      await admin.from('stores').delete().eq('id', id)
    }
  })

  async function makeStore() {
    const admin = serviceClient()
    const { data: authUser } = await admin.auth.admin.createUser({
      email: `trigger-test-${Date.now()}-${Math.random()}@example.com`,
      password: 'test-password-123!',
      email_confirm: true,
    })
    const { data: store } = await admin
      .from('stores')
      .insert({ name: 'Trigger Test Store', owner_user_id: authUser!.user!.id })
      .select()
      .single()
    cleanupStoreIds.push(store!.id)
    return store!.id as number
  }

  it('creates a link for every existing destination when a new employee is added', async () => {
    const admin = serviceClient()
    const storeId = await makeStore()

    await admin.from('destinations').insert([
      { store_id: storeId, label: 'Google Maps', target_url: 'https://maps.google.com/1' },
      { store_id: storeId, label: 'Facebook', target_url: 'https://facebook.com/1' },
    ])

    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: storeId, name: 'Fah' })
      .select()
      .single()

    const { data: links } = await admin.from('links').select('*').eq('employee_id', employee!.id)
    expect(links).toHaveLength(2)
    expect(new Set(links!.map((l) => l.destination_id)).size).toBe(2)
  })

  it('creates a link for every existing employee when a new destination is added', async () => {
    const admin = serviceClient()
    const storeId = await makeStore()

    await admin.from('employees').insert([
      { store_id: storeId, name: 'Ploy' },
      { store_id: storeId, name: 'Beam' },
      { store_id: storeId, name: 'Nok' },
    ])

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: storeId, label: 'TikTok', target_url: 'https://tiktok.com/1' })
      .select()
      .single()

    const { data: links } = await admin.from('links').select('*').eq('destination_id', destination!.id)
    expect(links).toHaveLength(3)
  })

  it("deactivates an employee's links when the employee is deactivated", async () => {
    const admin = serviceClient()
    const storeId = await makeStore()

    await admin
      .from('destinations')
      .insert({ store_id: storeId, label: 'Google Maps', target_url: 'https://maps.google.com/2' })
    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: storeId, name: 'Golf' })
      .select()
      .single()

    await admin.from('employees').update({ active: false }).eq('id', employee!.id)

    const { data: links } = await admin.from('links').select('*').eq('employee_id', employee!.id)
    expect(links!.every((l) => l.active === false)).toBe(true)
  })

  it("deactivates a destination's links when the destination is deactivated", async () => {
    const admin = serviceClient()
    const storeId = await makeStore()

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: storeId, label: 'Facebook', target_url: 'https://facebook.com/2' })
      .select()
      .single()
    await admin.from('employees').insert({ store_id: storeId, name: 'Ice' })

    await admin.from('destinations').update({ active: false }).eq('id', destination!.id)

    const { data: links } = await admin.from('links').select('*').eq('destination_id', destination!.id)
    expect(links!.every((l) => l.active === false)).toBe(true)
  })
})
