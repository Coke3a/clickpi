import { describe, it, expect, afterAll } from 'vitest'
import { serviceClient, createAuthedUser } from './helpers'

describe('row-level security isolation', () => {
  const cleanupStoreIds: number[] = []

  afterAll(async () => {
    const admin = serviceClient()
    for (const id of cleanupStoreIds) {
      await admin.from('stores').delete().eq('id', id)
    }
  })

  it('lets an owner see only their own store', async () => {
    const admin = serviceClient()
    const ownerA = await createAuthedUser()
    const ownerB = await createAuthedUser()

    const { data: storeA } = await admin
      .from('stores')
      .insert({ name: 'Store A', owner_user_id: ownerA.userId })
      .select()
      .single()
    cleanupStoreIds.push(storeA!.id)

    const { data: seenByA } = await ownerA.client.from('stores').select('*')
    expect(seenByA).toHaveLength(1)
    expect(seenByA![0].id).toBe(storeA!.id)

    const { data: seenByB } = await ownerB.client.from('stores').select('*')
    expect(seenByB).toHaveLength(0)
  })

  it("blocks an owner from reading another store's employees, destinations, links, and clicks", async () => {
    const admin = serviceClient()
    const ownerA = await createAuthedUser()
    const ownerB = await createAuthedUser()

    const { data: storeA } = await admin
      .from('stores')
      .insert({ name: 'Store A2', owner_user_id: ownerA.userId })
      .select()
      .single()
    cleanupStoreIds.push(storeA!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: storeA!.id, label: 'Facebook', target_url: 'https://facebook.com/x' })
      .select()
      .single()

    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: storeA!.id, name: 'Nok' })
      .select()
      .single()

    const { data: link } = await admin
      .from('links')
      .insert({
        store_id: storeA!.id,
        destination_id: destination!.id,
        employee_id: employee!.id,
        slug: 'rls-test-slug-1',
      })
      .select()
      .single()

    await admin.from('clicks').insert({
      link_id: link!.id,
      destination_id: destination!.id,
      employee_id: employee!.id,
      store_id: storeA!.id,
    })

    const { data: employeesSeenByB } = await ownerB.client
      .from('employees')
      .select('*')
      .eq('store_id', storeA!.id)
    expect(employeesSeenByB).toHaveLength(0)

    const { data: destinationsSeenByB } = await ownerB.client
      .from('destinations')
      .select('*')
      .eq('store_id', storeA!.id)
    expect(destinationsSeenByB).toHaveLength(0)

    const { data: linksSeenByB } = await ownerB.client.from('links').select('*').eq('store_id', storeA!.id)
    expect(linksSeenByB).toHaveLength(0)

    const { data: clicksSeenByB } = await ownerB.client.from('clicks').select('*').eq('store_id', storeA!.id)
    expect(clicksSeenByB).toHaveLength(0)

    const { data: employeesSeenByA } = await ownerA.client
      .from('employees')
      .select('*')
      .eq('store_id', storeA!.id)
    expect(employeesSeenByA).toHaveLength(1)
  })

  it('prevents authenticated users from directly inserting links (only triggers/service role may)', async () => {
    const admin = serviceClient()
    const owner = await createAuthedUser()

    const { data: store } = await admin
      .from('stores')
      .insert({ name: 'Store C', owner_user_id: owner.userId })
      .select()
      .single()
    cleanupStoreIds.push(store!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: store!.id, label: 'TikTok', target_url: 'https://tiktok.com/x' })
      .select()
      .single()

    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: store!.id, name: 'Beam' })
      .select()
      .single()

    const { error } = await owner.client.from('links').insert({
      store_id: store!.id,
      destination_id: destination!.id,
      employee_id: employee!.id,
      slug: 'should-not-be-allowed',
    })
    expect(error).not.toBeNull()
  })
})
