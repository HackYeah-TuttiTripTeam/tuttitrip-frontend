// Fixed values of the planning screens. The algorithm parameters mirror docs/algorytm.md in
// tuttitrip-backend; the numbers themselves always come from the API, these only describe scales.

/** Fairness slider alpha (E5, section 3 of docs/algorytm.md): 0 favours the total benefit. */
export const ALPHA_MIN = 0
/** Fairness slider alpha: 3 favours equality. */
export const ALPHA_MAX = 3
/** Step of the fairness slider. */
export const ALPHA_STEP = 0.5
/** The default alpha: balanced (Nash, the weighted log); `fairness_alpha` of a new trip (section 6). */
export const ALPHA_DEFAULT = 1

/** Lowest weight of a person; the API allows max/min up to 3 (section 2), so with all weights at least 1 any pick is valid. */
export const WEIGHT_MIN = 1
/** Highest weight of a person. */
export const WEIGHT_MAX = 3
/** Step of a weight slider. */
export const WEIGHT_STEP = 0.5
/** The weight of a child or of the grandmother's day, like the API's presets (CHILD_WEIGHT, FOCUS_WEIGHT). */
export const WEIGHT_RAISED = 2

/** Whole percent: `r` is a share, the screen says "87%". */
export const PERCENT = 100
/** Offset in `r = (u + 10) / (u* + 10)` (E4, section 3). */
export const R_OFFSET = 10
/** Top of the scale of `q`, the satisfaction with one domain (E2): 0 to 100. */
export const Q_MAX = 100
/** Decimal places of the Jain index, "0,94". */
export const JAIN_DIGITS = 2
/**
 * The surcharge on an unverified price, delta = 0,15 (E6, section 6), in percent. Only a fallback
 * for the note under a price: the amount itself comes from the API (`price_inflated`), and the
 * administrator may change delta (backend#96).
 */
export const UNVERIFIED_SURCHARGE_PCT = 15
/** Cents in a unit of money, to add decimal amounts without float error. */
export const CENTS = 100
