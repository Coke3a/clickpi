import type { Context } from 'hono'
import type { LinksRepository } from './linksRepository'

const FALLBACK_HTML = `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><title>ลิงก์นี้ไม่พร้อมใช้งาน</title></head>
<body style="font-family: system-ui, sans-serif; text-align:center; padding: 4rem 1rem; color:#4a3f55; background:#fffaf3;">
<h1>ลิงก์นี้ไม่พร้อมใช้งานแล้ว</h1>
<p>ลิงก์นี้อาจถูกปิดใช้งาน หรือไม่มีอยู่จริง กรุณาติดต่อร้านค้าโดยตรง</p>
</body></html>`

export function makeRedirectHandler(repository: LinksRepository) {
  return async function redirectHandler(c: Context) {
    const slug = c.req.param('slug') as string
    const link = await repository.findActiveLinkBySlug(slug)

    if (!link) {
      return c.html(FALLBACK_HTML, 404)
    }

    c.executionCtx.waitUntil(
      repository
        .recordClick({
          linkId: link.id,
          employeeId: link.employeeId,
          destinationId: link.destinationId,
          storeId: link.storeId,
          ipAddress: (c.req.header('cf-connecting-ip') ?? null) as string | null,
          userAgent: (c.req.header('user-agent') ?? null) as string | null,
          referrer: (c.req.header('referer') ?? null) as string | null,
        })
        .catch((err) => console.error('click insert failed', err))
    )

    return c.redirect(link.targetUrl, 302)
  }
}
