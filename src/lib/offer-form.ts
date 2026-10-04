import { z } from 'zod'
import { OFFER_TEXT_MAX_CHARS, OFFER_URL_MAX_CHARS } from '@/lib/accommodation'
import { m } from '@/paraglide/messages'

/** The paste form: the offer text, an optional link and the nights it is for. */
export const offerFormSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, { error: () => m.offer_text_required() })
    .max(OFFER_TEXT_MAX_CHARS, {
      error: () => m.offer_text_too_long({ max: OFFER_TEXT_MAX_CHARS }),
    }),
  url: z
    .string()
    .trim()
    .max(OFFER_URL_MAX_CHARS)
    .refine((value) => value === '' || /^https?:\/\/[^\s/]+/.test(value), {
      error: () => m.offer_url_invalid(),
    }),
  nights: z.array(z.string()).min(1, { error: () => m.offer_nights_required() }),
})

export type OfferFormValues = z.infer<typeof offerFormSchema>
