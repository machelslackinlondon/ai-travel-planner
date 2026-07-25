import { z } from 'zod'

export const resortAreaSchema = z.enum(['montego-bay', 'negril'])
export const resortChoiceSchema = z.enum(['montego-bay', 'negril', 'help-me-choose'])
export const paceSchema = z.enum(['relaxed', 'balanced', 'active'])
export const spendSchema = z.enum(['value', 'mid-range', 'premium', 'flexible'])
export const interestSchema = z.enum(['beach', 'food', 'culture', 'nature', 'family', 'relaxation'])
export const accommodationStyleSchema = z.enum(['hotel-resort', 'villa-apartment', 'guest-house', 'no-preference'])
export const accessibilitySchema = z.enum(['step-free', 'mobility-support', 'visual-support', 'hearing-support', 'quiet-space'])

export const tripBriefSchema = z.object({
  timingMode: z.enum(['nights', 'dates']),
  nights: z.number().int().min(1).max(21),
  startDate: z.string().max(10).nullish(),
  endDate: z.string().max(10).nullish(),
  adults: z.number().int().min(1).max(12),
  children: z.number().int().min(0).max(12),
  resortArea: resortChoiceSchema,
  interests: z.array(interestSchema).min(1).max(3),
  pace: paceSchema,
  spendLevel: spendSchema,
  accommodationStyle: accommodationStyleSchema,
  accessibility: z.array(accessibilitySchema).max(5),
  note: z.string().max(300),
}).superRefine((brief, context) => {
  if (brief.timingMode === 'dates') {
    if (!brief.startDate) context.addIssue({ code: 'custom', path: ['startDate'], message: 'Choose an approximate start date.' })
    if (!brief.endDate) context.addIssue({ code: 'custom', path: ['endDate'], message: 'Choose an approximate end date.' })
    if (brief.startDate && brief.endDate && brief.endDate <= brief.startDate) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be after the start date.' })
    }
  }
})

export type TripBrief = z.infer<typeof tripBriefSchema>

export const contentItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['destination', 'stay', 'experience', 'information']),
  title: z.string().min(1),
  summary: z.string().min(1),
  resortArea: resortAreaSchema,
  interests: z.array(z.string()),
  pace: z.enum(['relaxed', 'balanced', 'active', 'any']),
  suitableFor: z.array(z.string()),
  sourceUrl: z.string().url(),
  checkedAt: z.iso.date(),
  priceStatus: z.enum(['confirmed', 'estimated', 'check-with-provider']),
  priceBand: z.enum(['free', 'value', 'mid-range', 'premium', 'unknown']),
  priceAmount: z.number().nonnegative().optional(),
  currency: z.enum(['JMD', 'USD']).optional(),
  imagePath: z.string().startsWith('/images/'),
  imageAlt: z.string().min(1),
  published: z.boolean(),
})

export type ContentItem = z.infer<typeof contentItemSchema>

export const recommendationSchema = z.object({
  contentId: z.string().min(1),
  reason: z.string().min(1).max(180),
})

export const itineraryDaySchema = z.object({
  day: z.number().int().positive(),
  title: z.string().min(1).max(80),
  itemIds: z.array(z.string()).max(3),
})

export const aiNarrativeSchema = z.object({
  summary: z.string().min(1).max(240),
  recommendations: z.array(recommendationSchema).min(1).max(9),
  days: z.array(itineraryDaySchema).min(1).max(21),
})

export type AiNarrative = z.infer<typeof aiNarrativeSchema>

export const tripPlanSchema = aiNarrativeSchema.extend({
  id: z.string().min(1),
  brief: tripBriefSchema,
  selectedArea: resortAreaSchema,
  generationMode: z.enum(['ai', 'fallback']),
  generatedAt: z.string(),
  fallbackMessage: z.string().optional(),
})

export type TripPlan = z.infer<typeof tripPlanSchema>

const evidenceValueSchema = z.object({
  value: z.union([z.string(), z.boolean(), z.number(), z.array(z.string()), z.null()]),
  confidence: z.number().min(0).max(1),
  source: z.enum(['user', 'brief', 'itinerary', 'default']),
})

const travellerProfileSchema = z.object({
  budget: evidenceValueSchema,
  interests: evidenceValueSchema,
  accessibilityNeeds: evidenceValueSchema,
  groupNeeds: evidenceValueSchema,
  pace: evidenceValueSchema,
  destination: evidenceValueSchema,
  dates: evidenceValueSchema,
  fixedItemIds: z.array(z.string()),
  flexibleItemIds: z.array(z.string()),
  searchIntent: evidenceValueSchema,
  followUpQuestion: z.string().nullable().optional(),
})

const validationIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(['error', 'warning']),
  day: z.number().int().optional().nullable(),
  contentId: z.string().optional().nullable(),
})

export const customisationResultSchema = z.object({
  draftId: z.string(),
  traceId: z.string(),
  status: z.enum(['valid', 'invalid', 'needs-input', 'no-results']),
  resultMode: z.enum(['demo', 'live', 'hybrid-live', 'hybrid-fallback', 'live-fallback']),
  originalItinerary: tripPlanSchema,
  proposedItinerary: tripPlanSchema.optional().nullable(),
  profile: travellerProfileSchema,
  changes: z.array(z.object({
    type: z.enum(['added', 'removed', 'moved']),
    contentId: z.string(),
    title: z.string(),
    fromDay: z.number().int().optional().nullable(),
    toDay: z.number().int().optional().nullable(),
    reason: z.string(),
  })),
  critic: z.object({
    valid: z.boolean(),
    errors: z.array(validationIssueSchema),
    warnings: z.array(validationIssueSchema),
    suggestedRepairs: z.array(z.object({
      code: z.string(),
      message: z.string(),
      contentId: z.string().optional().nullable(),
      day: z.number().int().optional().nullable(),
    })),
  }).optional().nullable(),
  repairCount: z.number().int().min(0).max(1),
  followUpQuestion: z.string().optional().nullable(),
  fallbackUsed: z.boolean(),
})

export type CustomisationResult = z.infer<typeof customisationResultSchema>

export const customisationDraftSchema = z.object({
  tripId: z.string(),
  requestedChange: z.string().min(3).max(500),
  result: customisationResultSchema,
})

export type CustomisationDraft = z.infer<typeof customisationDraftSchema>

export const aiPlannerActivitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['destination', 'attraction', 'hotel', 'restaurant', 'activity', 'event']),
  description: z.string().min(1),
  rating: z.number().min(0).max(5),
  priceLevel: z.enum(['free', 'value', 'mid-range', 'premium']),
})

export const aiPlannerResponseSchema = z.object({
  id: z.string().uuid(),
  tripName: z.string().min(1),
  duration: z.string().min(1),
  summary: z.string().min(1),
  estimatedBudget: z.string().min(1),
  interpretedRequest: z.object({
    destination: z.string().nullable(),
    days: z.number().int().min(1).max(14),
    interests: z.array(z.string()),
    priceLevel: z.string().nullable(),
  }),
  days: z.array(z.object({
    day: z.number().int().positive(),
    title: z.string().min(1),
    activities: z.array(aiPlannerActivitySchema),
  })).min(1).max(14),
  recommendations: z.array(aiPlannerActivitySchema),
  sources: z.array(z.string()),
  generationMode: z.enum(['ai', 'fallback']),
  searchBackend: z.enum(['mock', 'elasticsearch']),
  generatedAt: z.string(),
  warnings: z.array(z.string()),
})

export type AiPlannerResponse = z.infer<typeof aiPlannerResponseSchema>

export const allowedEventNames = [
  'planner_started',
  'brief_completed',
  'plan_generated',
  'plan_saved',
  'provider_handoff_opened',
  'search_performed',
  'destination_viewed',
  'ai_planner_requested',
  'itinerary_generated',
  'itinerary_saved',
  'destination_favourited',
  'trip_customisation_offered',
  'trip_customisation_started',
  'trip_customisation_generated',
  'trip_customisation_applied',
  'trip_customisation_abandoned',
  'trip_customisation_fallback_used',
] as const

export const productEventSchema = z.object({
  sessionId: z.string().uuid(),
  eventName: z.enum(allowedEventNames),
  properties: z.record(z.string(), z.union([z.string().max(40), z.number().int().min(0).max(100), z.boolean()])).default({}),
})

export type ProductEvent = z.infer<typeof productEventSchema>
