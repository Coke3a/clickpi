import { describe, it, expect, afterAll } from 'vitest'
import { serviceClient, createAuthedUser } from './helpers'

describe('KPI RPC functions', () => {
  const cleanupStoreIds: number[] = []

  afterAll(async () => {
    const admin = serviceClient()
    for (const id of cleanupStoreIds) {
      await admin.from('stores').delete().eq('id', id)
    }
  })

  it('ranks employees by click count within the given range and destination', async () => {
    const admin = serviceClient()
    const owner = await createAuthedUser()

    const { data: store } = await admin
      .from('stores')
      .insert({ name: 'KPI Test Store', owner_user_id: owner.userId })
      .select()
      .single()
    cleanupStoreIds.push(store!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: store!.id, label: 'Google Maps', target_url: 'https://maps.google.com/3' })
      .select()
      .single()

    const { data: employees } = await admin
      .from('employees')
      .insert([
        { store_id: store!.id, name: 'Top Performer' },
        { store_id: store!.id, name: 'Low Performer' },
      ])
      .select()

    const [top, low] = employees!
    const { data: links } = await admin.from('links').select('*').eq('destination_id', destination!.id)

    const topLink = links!.find((l) => l.employee_id === top.id)!
    const lowLink = links!.find((l) => l.employee_id === low.id)!

    await admin.from('clicks').insert([
      { link_id: topLink.id, employee_id: top.id, destination_id: destination!.id, store_id: store!.id },
      { link_id: topLink.id, employee_id: top.id, destination_id: destination!.id, store_id: store!.id },
      { link_id: lowLink.id, employee_id: low.id, destination_id: destination!.id, store_id: store!.id },
    ])

    const { data: leaderboard, error } = await owner.client.rpc('get_leaderboard', {
      p_from: '2000-01-01T00:00:00Z',
      p_to: '2100-01-01T00:00:00Z',
      p_destination_id: destination!.id,
    })

    expect(error).toBeNull()
    expect(leaderboard![0].employee_id).toBe(top.id)
    expect(leaderboard![0].click_count).toBe(2)
    expect(leaderboard![1].employee_id).toBe(low.id)
    expect(leaderboard![1].click_count).toBe(1)
  })

  it('dedupes repeat clicks from the same client_id in the leaderboard', async () => {
    const admin = serviceClient()
    const owner = await createAuthedUser()

    const { data: store } = await admin
      .from('stores')
      .insert({ name: 'KPI Dedup Store', owner_user_id: owner.userId })
      .select()
      .single()
    cleanupStoreIds.push(store!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: store!.id, label: 'Google Maps', target_url: 'https://maps.google.com/dedup' })
      .select()
      .single()
    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: store!.id, name: 'Dedup Tester' })
      .select()
      .single()
    const { data: link } = await admin
      .from('links')
      .select('*')
      .eq('destination_id', destination!.id)
      .eq('employee_id', employee!.id)
      .single()

    await admin.from('clicks').insert([
      // same browser clicking twice: counts once
      { link_id: link!.id, employee_id: employee!.id, destination_id: destination!.id, store_id: store!.id, client_id: 'client-a' },
      { link_id: link!.id, employee_id: employee!.id, destination_id: destination!.id, store_id: store!.id, client_id: 'client-a' },
      // a different browser: counts as a second unique click
      { link_id: link!.id, employee_id: employee!.id, destination_id: destination!.id, store_id: store!.id, client_id: 'client-b' },
      // no cookie on this one (e.g. blocked): still counts on its own
      { link_id: link!.id, employee_id: employee!.id, destination_id: destination!.id, store_id: store!.id, client_id: null },
    ])

    const { data: leaderboard, error } = await owner.client.rpc('get_leaderboard', {
      p_from: '2000-01-01T00:00:00Z',
      p_to: '2100-01-01T00:00:00Z',
      p_destination_id: destination!.id,
    })

    expect(error).toBeNull()
    expect(leaderboard![0].employee_id).toBe(employee!.id)
    expect(leaderboard![0].click_count).toBe(3)
  })

  it('buckets clicks by day for the trend function', async () => {
    const admin = serviceClient()
    const owner = await createAuthedUser()

    const { data: store } = await admin
      .from('stores')
      .insert({ name: 'KPI Trend Store', owner_user_id: owner.userId })
      .select()
      .single()
    cleanupStoreIds.push(store!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: store!.id, label: 'Facebook', target_url: 'https://facebook.com/3' })
      .select()
      .single()
    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: store!.id, name: 'Trend Tester' })
      .select()
      .single()
    const { data: link } = await admin
      .from('links')
      .select('*')
      .eq('destination_id', destination!.id)
      .eq('employee_id', employee!.id)
      .single()

    await admin.from('clicks').insert([
      { link_id: link!.id, employee_id: employee!.id, destination_id: destination!.id, store_id: store!.id },
      { link_id: link!.id, employee_id: employee!.id, destination_id: destination!.id, store_id: store!.id },
    ])

    const { data: trend, error } = await owner.client.rpc('get_click_trend', {
      p_from: '2000-01-01T00:00:00Z',
      p_to: '2100-01-01T00:00:00Z',
      p_destination_id: destination!.id,
      p_granularity: 'day',
    })

    expect(error).toBeNull()
    expect(trend).toHaveLength(1)
    expect(trend![0].click_count).toBe(2)
  })

  it('dedupes repeat clicks from the same client_id within a trend bucket', async () => {
    const admin = serviceClient()
    const owner = await createAuthedUser()

    const { data: store } = await admin
      .from('stores')
      .insert({ name: 'KPI Trend Dedup Store', owner_user_id: owner.userId })
      .select()
      .single()
    cleanupStoreIds.push(store!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: store!.id, label: 'Facebook', target_url: 'https://facebook.com/dedup' })
      .select()
      .single()
    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: store!.id, name: 'Trend Dedup Tester' })
      .select()
      .single()
    const { data: link } = await admin
      .from('links')
      .select('*')
      .eq('destination_id', destination!.id)
      .eq('employee_id', employee!.id)
      .single()

    await admin.from('clicks').insert([
      { link_id: link!.id, employee_id: employee!.id, destination_id: destination!.id, store_id: store!.id, client_id: 'client-a' },
      { link_id: link!.id, employee_id: employee!.id, destination_id: destination!.id, store_id: store!.id, client_id: 'client-a' },
      { link_id: link!.id, employee_id: employee!.id, destination_id: destination!.id, store_id: store!.id, client_id: 'client-b' },
    ])

    const { data: trend, error } = await owner.client.rpc('get_click_trend', {
      p_from: '2000-01-01T00:00:00Z',
      p_to: '2100-01-01T00:00:00Z',
      p_destination_id: destination!.id,
      p_granularity: 'day',
    })

    expect(error).toBeNull()
    expect(trend).toHaveLength(1)
    expect(trend![0].click_count).toBe(2)
  })

  it('buckets by day using Asia/Bangkok time, not UTC', async () => {
    const admin = serviceClient()
    const owner = await createAuthedUser()

    const { data: store } = await admin
      .from('stores')
      .insert({ name: 'KPI Timezone Store', owner_user_id: owner.userId })
      .select()
      .single()
    cleanupStoreIds.push(store!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: store!.id, label: 'TikTok', target_url: 'https://tiktok.com/4' })
      .select()
      .single()
    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: store!.id, name: 'Timezone Tester' })
      .select()
      .single()
    const { data: link } = await admin
      .from('links')
      .select('*')
      .eq('destination_id', destination!.id)
      .eq('employee_id', employee!.id)
      .single()

    // 2026-09-04T18:00:00Z is 2026-09-05T01:00:00+07:00 in Bangkok. A
    // UTC-based date_trunc would bucket this under Sept 4; the correct
    // Bangkok-local bucket is midnight Sept 5 Bangkok, i.e. 2026-09-04T17:00:00Z.
    await admin.from('clicks').insert({
      link_id: link!.id,
      employee_id: employee!.id,
      destination_id: destination!.id,
      store_id: store!.id,
      clicked_at: '2026-09-04T18:00:00Z',
    })

    const { data: trend, error } = await owner.client.rpc('get_click_trend', {
      p_from: '2026-01-01T00:00:00Z',
      p_to: '2027-01-01T00:00:00Z',
      p_destination_id: destination!.id,
      p_granularity: 'day',
    })

    expect(error).toBeNull()
    expect(trend).toHaveLength(1)
    expect(new Date(trend![0].bucket).getTime()).toBe(new Date('2026-09-04T17:00:00Z').getTime())
    expect(trend![0].click_count).toBe(1)
  })

  it('rejects an invalid granularity', async () => {
    const owner = await createAuthedUser()
    const { error } = await owner.client.rpc('get_click_trend', {
      p_from: '2000-01-01T00:00:00Z',
      p_to: '2100-01-01T00:00:00Z',
      p_destination_id: null,
      p_granularity: 'year',
    })
    expect(error).not.toBeNull()
  })
})
