import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LinksPage } from './LinksPage'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }))

describe('LinksPage', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('renders each link with employee, destination, and a copy button', async () => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() =>
        Promise.resolve({
          data: [
            {
              id: 1,
              slug: 'abc123',
              active: true,
              employees: { name: 'Somchai' },
              destinations: { label: 'Google Maps' },
            },
          ],
          error: null,
        })
      ),
    }
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    render(<LinksPage storeId={10} />)

    expect(await screen.findByText('Somchai')).toBeInTheDocument()
    expect(screen.getByText('Google Maps')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'คัดลอกลิงก์' }))

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/r/abc123`)
    )
  })
})
