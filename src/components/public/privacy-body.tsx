import { ArrowUpRight } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import type { CSSProperties, ReactNode } from 'react'
import { EXTERNAL_LINK, GITHUB_ORG_URL } from '@/lib/links'
import { m } from '@/paraglide/messages'
import { Section, textLinkClass } from './section'

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright'

interface PolicySection {
  id: string
  title: string
  body: ReactNode
}

const P = ({ children }: { children: ReactNode }) => (
  <p className="max-w-prose text-base leading-relaxed">{children}</p>
)

const List = ({ items }: { items: string[] }) => (
  <ul className="flex max-w-prose list-disc flex-col gap-1.5 pl-5 leading-relaxed marker:text-muted-foreground">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
)

/** A browser-storage entry: the key is a technical name, so it is not translated. */
const STORAGE: { key: string; where: () => string; purpose: () => string }[] = [
  {
    key: 'tuttitrip-theme',
    where: m.privacy_storage_where_local,
    purpose: m.privacy_storage_theme,
  },
  {
    key: 'PARAGLIDE_LOCALE',
    where: m.privacy_storage_where_local,
    purpose: m.privacy_storage_locale,
  },
  {
    key: '@@auth0spajs@@…',
    where: m.privacy_storage_where_local,
    purpose: m.privacy_storage_auth0,
  },
  {
    key: 'tuttitrip.join-token',
    where: m.privacy_storage_where_session,
    purpose: m.privacy_storage_join,
  },
  {
    key: 'tuttitrip-demo-session',
    where: m.privacy_storage_where_session,
    purpose: m.privacy_storage_demo,
  },
  {
    key: 'tuttitrip:stale-asset-reload',
    where: m.privacy_storage_where_session,
    purpose: m.privacy_storage_reload,
  },
]

function sections(): PolicySection[] {
  return [
    {
      id: 'who',
      title: m.privacy_who_title(),
      body: <P>{m.privacy_who_p1()}</P>,
    },
    {
      id: 'login',
      title: m.privacy_login_title(),
      body: (
        <>
          <P>{m.privacy_login_p1()}</P>
          <P>{m.privacy_login_p2()}</P>
        </>
      ),
    },
    {
      id: 'data',
      title: m.privacy_data_title(),
      body: (
        <>
          <P>{m.privacy_data_intro()}</P>
          <List
            items={[
              m.privacy_data_trips(),
              m.privacy_data_people(),
              m.privacy_data_prefs(),
              m.privacy_data_invites(),
              m.privacy_data_plans(),
            ]}
          />
          <P>{m.privacy_data_others()}</P>
        </>
      ),
    },
    {
      id: 'demo',
      title: m.privacy_demo_title(),
      body: <P>{m.privacy_demo_p1()}</P>,
    },
    {
      id: 'ai',
      title: m.privacy_ai_title(),
      body: (
        <>
          <P>{m.privacy_ai_p1()}</P>
          <P>{m.privacy_ai_p2()}</P>
          <P>{m.privacy_ai_p3()}</P>
        </>
      ),
    },
    {
      id: 'hosting',
      title: m.privacy_hosting_title(),
      body: (
        <List
          items={[
            m.privacy_hosting_cloudflare(),
            m.privacy_hosting_backend(),
            m.privacy_hosting_auth0(),
          ]}
        />
      ),
    },
    {
      id: 'assets',
      title: m.privacy_assets_title(),
      body: (
        <>
          <P>{m.privacy_assets_p1()}</P>
          <P>{m.privacy_assets_p2()}</P>
        </>
      ),
    },
    {
      id: 'osm',
      title: m.privacy_osm_title(),
      body: (
        <>
          <P>{m.privacy_osm_p1()}</P>
          <P>{m.privacy_osm_p2()}</P>
          <div>
            <a href={OSM_COPYRIGHT_URL} className={textLinkClass} {...EXTERNAL_LINK}>
              {m.privacy_osm_link()}
              <ArrowUpRight aria-hidden="true" className="size-4" />
              <span className="sr-only">({m.external_link_new_tab()})</span>
            </a>
          </div>
        </>
      ),
    },
    {
      id: 'storage',
      title: m.privacy_storage_title(),
      body: (
        <>
          <P>{m.privacy_storage_intro()}</P>
          <ul className="flex max-w-prose flex-col divide-y rounded-lg border">
            {STORAGE.map((row) => (
              <li key={row.key} className="flex flex-col gap-1 px-4 py-3">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <code className="break-all font-mono text-sm">{row.key}</code>
                  <span className="text-muted-foreground text-sm">{row.where()}</span>
                </span>
                <span className="leading-relaxed">{row.purpose()}</span>
              </li>
            ))}
          </ul>
          <P>{m.privacy_storage_outro()}</P>
        </>
      ),
    },
    {
      id: 'rights',
      title: m.privacy_rights_title(),
      body: (
        <>
          <P>{m.privacy_rights_p1()}</P>
          <P>{m.privacy_rights_p2()}</P>
        </>
      ),
    },
    {
      id: 'changes',
      title: m.privacy_changes_title(),
      body: <P>{m.privacy_changes_p1()}</P>,
    },
    {
      id: 'contact',
      title: m.privacy_contact_title(),
      body: (
        <>
          <P>{m.privacy_contact_p1()}</P>
          <div className="flex flex-wrap items-center gap-x-6">
            <Link to="/contact" className={textLinkClass}>
              {m.privacy_contact_link()}
            </Link>
            <a href={GITHUB_ORG_URL} className={textLinkClass} {...EXTERNAL_LINK}>
              {m.footer_github()}
              <ArrowUpRight aria-hidden="true" className="size-4" />
              <span className="sr-only">({m.external_link_new_tab()})</span>
            </a>
          </div>
        </>
      ),
    },
  ]
}

export function PrivacyBody() {
  const list = sections()
  return (
    <Section className="py-10 md:py-16">
      <div className="grid gap-10 md:grid-cols-[14rem_1fr] md:gap-16">
        <header className="flex flex-col gap-5 md:col-span-2 md:max-w-3xl">
          <h1 className="hero-rise text-balance font-extrabold text-4xl leading-[1.05] tracking-tight md:text-5xl">
            {m.privacy_title()}
          </h1>
          <p
            className="hero-rise max-w-prose text-lg text-muted-foreground leading-relaxed"
            style={{ '--rise-delay': '80ms' } as CSSProperties}
          >
            {m.privacy_lede()}
          </p>
          <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
            <strong className="font-medium text-foreground">{m.privacy_updated()}.</strong>{' '}
            {m.privacy_scope()}
          </p>
        </header>

        <nav aria-label={m.privacy_toc()} className="hidden md:block">
          <ol className="sticky top-24 flex flex-col text-sm">
            {list.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-flex min-h-9 items-center rounded-md px-1 text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-10">
          {list.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="flex scroll-mt-24 flex-col gap-3"
            >
              <h2 id={`${section.id}-title`} className="font-bold text-2xl tracking-tight">
                {section.title}
              </h2>
              {section.body}
            </section>
          ))}
        </div>
      </div>
    </Section>
  )
}
