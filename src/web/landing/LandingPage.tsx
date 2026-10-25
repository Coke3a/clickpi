import { useState } from 'react'
import { AuthForm, type AuthMode } from '../auth/AuthForm'
import { Mascot } from '../components/Mascot'
import './LandingPage.css'

// Illustrative only — the preview is labelled as sample data on the page.
const SAMPLE_LEADERBOARD = [
  { name: 'พนักงาน A', clicks: 128 },
  { name: 'พนักงาน B', clicks: 97 },
  { name: 'พนักงาน C', clicks: 64 },
  { name: 'พนักงาน D', clicks: 31 },
]

const STEPS = [
  {
    title: 'ใส่ปลายทางของร้าน',
    body: 'วางลิงก์หน้ารีวิว Google Maps, เพจ Facebook, TikTok หรือ URL ไหนก็ได้ที่อยากให้ลูกค้าไป',
  },
  {
    title: 'เพิ่มรายชื่อพนักงาน',
    body: 'ระบบสร้างลิงก์เฉพาะตัวให้พนักงานทุกคน ครบทุกปลายทาง นำไปทำ QR code ติดหน้าร้านหรือส่งในแชตได้เลย',
  },
  {
    title: 'ดู KPI ได้ตลอดเวลา',
    body: 'ลูกค้าสแกนแล้วไปหน้ารีวิวทันที ระบบบันทึกว่ามาจากพนักงานคนไหน แล้วจัดอันดับให้บนแดชบอร์ด',
  },
]

const FEATURES = [
  { icon: 'link', title: 'ลิงก์อัตโนมัติ', body: 'พนักงาน × ปลายทาง ได้ลิงก์ครบทุกคู่ ไม่ต้องสร้างเอง' },
  { icon: 'bolt', title: 'ไปถึงหน้ารีวิวทันที', body: 'ลูกค้าไม่ต้องรอหรือกรอกอะไร ระบบบันทึกเบื้องหลัง' },
  { icon: 'user', title: 'นับลูกค้าไม่ซ้ำ', body: 'คนเดิมกดซ้ำหลายครั้ง นับเป็นหนึ่ง ตัวเลขยุติธรรมกับทุกคน' },
  { icon: 'calendar', title: 'เลือกช่วงเวลาได้', body: '7 วัน 30 วัน หรือกำหนดวันเอง พร้อมกราฟแนวโน้มรายวัน' },
  { icon: 'download', title: 'Export CSV', body: 'ดึงตัวเลขไปคิดโบนัสหรือทำรายงานใน Excel / Sheets' },
  { icon: 'lock', title: 'ข้อมูลแยกต่อร้าน', body: 'แต่ละร้านเห็นเฉพาะข้อมูลของตัวเอง ป้องกันที่ระดับฐานข้อมูล' },
] as const

const FAQ = [
  {
    q: 'พนักงานต้องสมัครหรือโหลดแอปไหม?',
    a: 'ไม่ต้อง มีแค่เจ้าของร้านที่เข้าสู่ระบบ พนักงานแค่ใช้ลิงก์หรือ QR code ของตัวเอง',
  },
  {
    q: 'ทำ QR code ยังไง?',
    a: 'คัดลอกลิงก์ของพนักงานจากหน้า “ลิงก์” แล้วนำไปสร้าง QR ด้วยเครื่องมือฟรีตัวไหนก็ได้',
  },
  {
    q: 'ใช้ได้กับแพลตฟอร์มไหนบ้าง?',
    a: 'ทุก URL — Google Maps, Facebook, TikTok, LINE OA, Instagram หรือเว็บไซต์ของร้าน',
  },
]

const ICON_PATHS: Record<(typeof FEATURES)[number]['icon'], string> = {
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  user: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21c0-4 4-6 8-6s8 2 8 6',
  calendar: 'M6 5h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3ZM3 10h18M8 3v4M16 3v4',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  lock: 'M6 11h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2ZM8 11V7a4 4 0 0 1 8 0v4',
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      className="landing-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  )
}

export function LandingPage() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const topClicks = SAMPLE_LEADERBOARD[0].clicks

  return (
    <div className="landing">
      <header className="landing-nav">
        <nav className="landing-container landing-nav__inner" aria-label="หลัก">
          <a href="#top" className="landing-nav__brand">
            <Mascot size={36} />
            <span>ClicKPI</span>
          </a>
          <div className="landing-nav__links">
            <a href="#how">วิธีใช้งาน</a>
            <a href="#features">ฟีเจอร์</a>
            <a href="#faq">คำถามที่พบบ่อย</a>
            <a href="#login" className="landing-nav__login" onClick={() => setMode('sign-in')}>
              เข้าสู่ระบบ
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section id="top" className="landing-hero">
          <div className="landing-container landing-hero__inner">
            <div className="landing-hero__copy">
              <span className="landing-pill">สำหรับเจ้าของร้านที่อยากได้รีวิวมากขึ้น</span>
              <h1>
                รู้ทันทีว่าพนักงานคนไหน
                <br />
                ชวนลูกค้าไปรีวิวร้านได้มากที่สุด
              </h1>
              <p className="landing-hero__lead">
                ClicKPI สร้างลิงก์ติดตามแยกให้พนักงานแต่ละคน ลูกค้าสแกนแล้วไปหน้ารีวิว Google Maps, Facebook หรือ
                TikTok ของร้านได้ทันที ส่วนคุณดูผลเป็นอันดับ KPI ได้บนแดชบอร์ดเดียว
              </p>
              <ul className="landing-hero__points">
                <li>ลิงก์ของพนักงานทุกคน ถูกสร้างให้อัตโนมัติ</li>
                <li>ไม่ต้องให้พนักงานสมัครหรือติดตั้งแอปใดๆ</li>
                <li>นับเฉพาะลูกค้าที่ไม่ซ้ำ กดซ้ำไม่ทำให้ตัวเลขเพี้ยน</li>
              </ul>
            </div>
            <div id="login" className="landing-hero__auth">
              <AuthForm mode={mode} onModeChange={setMode} />
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-container landing-preview">
            <div className="landing-preview__copy">
              <span className="landing-eyebrow">แดชบอร์ด KPI</span>
              <h2>
                เห็นอันดับพนักงาน
                <br />
                ในหน้าเดียว
              </h2>
              <p>
                เลือกช่วงเวลา 7 วัน 30 วัน หรือกำหนดเอง กรองตามปลายทางว่าเป็น Google Maps หรือ Facebook แล้ว export
                เป็น CSV ไปทำโบนัสหรือรายงานต่อได้เลย
              </p>
            </div>
            <figure className="landing-preview__card">
              <div className="landing-preview__head">
                <span>อันดับพนักงาน · 30 วันล่าสุด</span>
                <span className="landing-preview__tag">ข้อมูลตัวอย่าง</span>
              </div>
              <ol className="landing-preview__rows">
                {SAMPLE_LEADERBOARD.map((row, index) => (
                  <li key={row.name} className="landing-preview__row">
                    <span className="landing-preview__rank">{index + 1}</span>
                    <span>{row.name}</span>
                    <span className="landing-preview__track">
                      <span
                        className={`landing-preview__bar landing-preview__bar--${index + 1}`}
                        style={{ width: `${Math.round((row.clicks / topClicks) * 100)}%` }}
                      />
                    </span>
                    <span className="landing-preview__count">{row.clicks}</span>
                  </li>
                ))}
              </ol>
              <figcaption>ภาพประกอบหน้าแดชบอร์ด — ชื่อและตัวเลขเป็นข้อมูลสมมติ</figcaption>
            </figure>
          </div>
        </section>

        <section id="how" className="landing-section landing-section--white">
          <div className="landing-container">
            <div className="landing-section__heading">
              <span className="landing-eyebrow">วิธีใช้งาน</span>
              <h2>เริ่มได้ใน 3 ขั้นตอน</h2>
            </div>
            <ol className="landing-steps">
              {STEPS.map((step, index) => (
                <li key={step.title} className="landing-step">
                  <span className={`landing-step__num landing-step__num--${index + 1}`}>{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-container">
            <div className="landing-section__heading">
              <span className="landing-eyebrow">ฟีเจอร์</span>
              <h2>ทำเรื่องเดียว และทำให้ง่าย</h2>
            </div>
            <ul className="landing-features">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="landing-feature">
                  <Icon path={ICON_PATHS[feature.icon]} />
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="landing-section landing-section--white">
          <div className="landing-container landing-faq">
            <h2>คำถามที่พบบ่อย</h2>
            {FAQ.map((item, index) => (
              <details key={item.q} className="landing-faq__item" open={index === 0}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <div className="landing-container landing-cta__inner">
            <div>
              <h2>พร้อมดูว่าใครคือดาวเด่นของร้าน?</h2>
              <p>สมัครด้วยอีเมล ตั้งค่าร้านเสร็จในไม่กี่นาที</p>
            </div>
            <a href="#login" className="landing-cta__button" onClick={() => setMode('sign-up')}>
              เริ่มใช้งานฟรี
            </a>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">© {new Date().getFullYear()} ClicKPI</div>
      </footer>
    </div>
  )
}
