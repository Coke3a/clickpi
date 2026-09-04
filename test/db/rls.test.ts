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

    // The link_lifecycle_triggers migration already auto-created this link
    // the instant `employee` was inserted above; fetch it instead of
    // manually inserting a duplicate for the same (destination, employee) pair.
    const { data: link } = await admin
      .from('links')
      .select('*')
      .eq('destination_id', destination!.id)
      .eq('employee_id', employee!.id)
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

  it('lets an owner delete their own store\'s clicks but not another store\'s', async () => {
    const admin = serviceClient()
    const ownerA = await createAuthedUser()
    const ownerB = await createAuthedUser()

    const { data: storeA } = await admin
      .from('stores')
      .insert({ name: 'Store D', owner_user_id: ownerA.userId })
      .select()
      .single()
    cleanupStoreIds.push(storeA!.id)

    const { data: storeB } = await admin
      .from('stores')
      .insert({ name: 'Store E', owner_user_id: ownerB.userId })
      .select()
      .single()
    cleanupStoreIds.push(storeB!.id)

    const { data: destinationA } = await admin
      .from('destinations')
      .insert({ store_id: storeA!.id, label: 'Google Maps', target_url: 'https://maps.google.com/x' })
      .select()
      .single()

    const { data: employeeA } = await admin
      .from('employees')
      .insert({ store_id: storeA!.id, name: 'Ploy' })
      .select()
      .single()

    const { data: linkA } = await admin
      .from('links')
      .select('*')
      .eq('destination_id', destinationA!.id)
      .eq('employee_id', employeeA!.id)
      .single()

    await admin.from('clicks').insert([
      { link_id: linkA!.id, destination_id: destinationA!.id, employee_id: employeeA!.id, store_id: storeA!.id },
      { link_id: linkA!.id, destination_id: destinationA!.id, employee_id: employeeA!.id, store_id: storeA!.id },
    ])

    const { error: deleteByOtherOwnerError } = await ownerB.client
      .from('clicks')
      .delete()
      .eq('store_id', storeA!.id)
    expect(deleteByOtherOwnerError).toBeNull()
    const { data: stillThere } = await admin.from('clicks').select('*').eq('store_id', storeA!.id)
    expect(stillThere).toHaveLength(2)

    const { error: deleteByOwnerError } = await ownerA.client.from('clicks').delete().eq('store_id', storeA!.id)
    expect(deleteByOwnerError).toBeNull()
    const { data: afterOwnerDelete } = await admin.from('clicks').select('*').eq('store_id', storeA!.id)
    expect(afterOwnerDelete).toHaveLength(0)
  })
})
