import { ContactBody } from '@/components/public/contact-body'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { m } from '@/paraglide/messages'

export function ContactView() {
  useDocumentTitle(m.nav_contact())
  return <ContactBody />
}
