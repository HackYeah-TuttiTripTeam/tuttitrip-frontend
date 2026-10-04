import { Menu, X } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import { type ReactNode, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import type { SessionStatus } from '@/hooks/use-session'
import { trackScrolled } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { BrandLogo } from './brand-mark'
import { LanguageMenu, type LanguageState } from './language-menu'

export interface PublicHeaderProps {
  /** Guests get login and sign-up, signed-in users a link to their trips. */
  status: SessionStatus
  language: LanguageState
  /** Deployment name; shown as a badge everywhere except production. */
  envLabel: string | null
  onLogin: () => void
  onSignup: () => void
  /** Extra controls next to the language switch (e.g. the theme toggle). */
  extras?: ReactNode
}

/** Scroll distance after which the header gets its border. */
const SCROLLED_AFTER_PX = 8
const focusRing = 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

const linkClass = cn(
  focusRing,
  'flex h-11 items-center rounded-full px-4 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground',
  '[&.active]:text-foreground [&.active]:underline [&.active]:decoration-2 [&.active]:decoration-primary [&.active]:underline-offset-8',
)

const productLinks = [
  { hash: 'how', title: () => m.nav_product_how(), hint: () => m.nav_product_how_hint() },
  {
    hash: 'fairness',
    title: () => m.nav_product_fairness(),
    hint: () => m.nav_product_fairness_hint(),
  },
] as const

/** Header of the public pages: logo, Navigation Menu on desktop, drawer on phones. */
export function PublicHeader({
  status,
  language,
  envLabel,
  onLogin,
  onSignup,
  extras,
}: PublicHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => trackScrolled(SCROLLED_AFTER_PX, setScrolled), [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] transition-colors duration-200 motion-reduce:transition-none',
        scrolled ? 'bg-background' : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 md:gap-4 md:px-6">
        <Link
          to={status === 'authenticated' ? '/trips' : '/'}
          className={cn('flex shrink-0 items-center rounded-md', focusRing)}
        >
          <BrandLogo className="h-8" />
        </Link>
        {envLabel && (
          <span className="hidden max-w-28 truncate rounded-full border px-2 py-0.5 font-mono text-muted-foreground text-xs md:inline-block">
            {envLabel}
          </span>
        )}

        <NavigationMenu aria-label={m.shell_nav_public()} className="ml-2 hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>{m.nav_product()}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-72 gap-1 p-1">
                  {productLinks.map((item) => (
                    <li key={item.hash}>
                      <NavigationMenuLink asChild>
                        <Link to="/" hash={item.hash} activeOptions={{ includeHash: true }}>
                          <span className="font-medium">{item.title()}</span>
                          <span className="text-muted-foreground">{item.hint()}</span>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                  <li>
                    <NavigationMenuLink asChild>
                      <Link to="/about" hash="inside" activeOptions={{ includeHash: true }}>
                        <span className="font-medium">{m.nav_product_inside()}</span>
                        <span className="text-muted-foreground">{m.nav_product_inside_hint()}</span>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/about" className={linkClass}>
                  {m.nav_about()}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/contact" className={linkClass}>
                  {m.nav_contact()}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <div className="hidden items-center gap-1 md:flex">
            <LanguageMenu language={language} />
            {extras}
          </div>
          {status === 'anonymous' && (
            <>
              <Button
                variant="outline"
                onClick={onLogin}
                className="h-11 rounded-full px-4 md:h-10 md:px-5"
              >
                {m.account_login()}
              </Button>
              <Button onClick={onSignup} className="hidden h-10 rounded-full px-5 md:inline-flex">
                {m.account_signup()}
              </Button>
            </>
          )}
          {status === 'authenticated' && (
            <Button asChild className="hidden h-10 rounded-full px-5 md:inline-flex">
              <Link to="/trips">{m.nav_trips()}</Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            aria-label={m.nav_menu_open()}
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="size-11 rounded-full md:hidden [&_svg:not([class*='size-'])]:size-6"
          >
            <Menu />
          </Button>
        </div>
      </div>

      <Drawer direction="right" open={open} onOpenChange={setOpen}>
        <DrawerContent className="w-[85%] max-w-sm gap-0 p-0">
          <div className="flex h-16 items-center justify-between border-b pr-2 pl-4">
            <DrawerTitle className="font-heading font-extrabold text-lg">
              {m.nav_menu_title()}
            </DrawerTitle>
            <DrawerDescription className="sr-only">{m.nav_menu_description()}</DrawerDescription>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={m.nav_menu_close()}
                className="size-11 rounded-full"
              >
                <X />
              </Button>
            </DrawerClose>
          </div>
          <nav
            aria-label={m.shell_nav_public()}
            className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
          >
            <p className="px-3 pt-2 pb-1 font-medium text-muted-foreground text-sm">
              {m.nav_product()}
            </p>
            {productLinks.map((item) => (
              <DrawerClose asChild key={item.hash}>
                <Link
                  to="/"
                  hash={item.hash}
                  activeOptions={{ includeHash: true }}
                  className={drawerLink}
                >
                  {item.title()}
                </Link>
              </DrawerClose>
            ))}
            <DrawerClose asChild>
              <Link
                to="/about"
                hash="inside"
                activeOptions={{ includeHash: true }}
                className={drawerLink}
              >
                {m.nav_product_inside()}
              </Link>
            </DrawerClose>
            <hr className="my-2" />
            <DrawerClose asChild>
              <Link to="/about" className={drawerLink}>
                {m.nav_about()}
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              <Link to="/contact" className={drawerLink}>
                {m.nav_contact()}
              </Link>
            </DrawerClose>
          </nav>
          <div className="flex flex-col gap-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {status === 'anonymous' && (
              <>
                <Button onClick={onSignup} className="h-11 rounded-full text-base">
                  {m.account_signup()}
                </Button>
                <Button variant="outline" onClick={onLogin} className="h-11 rounded-full text-base">
                  {m.account_login()}
                </Button>
              </>
            )}
            {status === 'authenticated' && (
              <DrawerClose asChild>
                <Button asChild className="h-11 rounded-full text-base">
                  <Link to="/trips">{m.nav_trips()}</Link>
                </Button>
              </DrawerClose>
            )}
            <div className="flex items-center justify-between">
              <LanguageMenu language={language} side="top" className="-ml-2" />
              {extras}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </header>
  )
}

const drawerLink = cn(
  focusRing,
  'flex min-h-12 items-center rounded-md px-3 font-medium text-base transition-colors hover:bg-accent',
  '[&.active]:text-primary',
)
