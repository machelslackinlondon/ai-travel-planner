# User onboarding

## Onboarding principle

Give the visitor value before asking them to register. Onboarding is the planning journey itself, not a separate product tour.

The target is a useful first plan in under three minutes on a phone.

## Entry point

**Heading:** Build your Jamaica trip

**Body:** Tell us what feels right for your visit. We will turn your choices into a simple plan using approved Jamaica travel content.

**Primary action:** Plan my trip

**Secondary action:** See how it works

**Trust note:** No account is needed to start. Transport to Jamaica is not included.

## Step 1 — Trip shape

**Heading:** First, the shape of your trip

Ask for:

- approximate dates or number of nights;
- adults and children;
- Montego Bay, Negril or Help me choose.

**Helper copy:** Approximate details are fine. You can change them later.

**Actions:** Continue; Back

**Progress label:** Step 1 of 4

Validation should appear beside the relevant field and in a short error summary. Keep the visitor's other answers.

## Step 2 — Interests

**Heading:** What would make this trip feel special?

**Body:** Choose up to three. We will use your priorities to shape the plan.

Choices:

- Beaches and water
- Jamaican food
- Music and culture
- Nature and adventure
- Family time
- Rest and wellness

**Progress label:** Step 2 of 4

Do not preselect an interest. Explain the three-choice limit before it becomes an error.

## Step 3 — Pace and spend

**Heading:** Set the pace

Pace choices:

- Relaxed — plenty of open time
- Balanced — one or two plans each day
- Active — make the most of each day

Spend choices:

- Value
- Mid-range
- Premium
- Flexible

**Helper copy:** This covers accommodation and on-island experiences. It does not include transport to Jamaica. Prices shown later may be confirmed, estimated or require a provider check.

**Progress label:** Step 3 of 4

## Step 4 — Stay and practical needs

**Heading:** A few final preferences

Ask for:

- hotel or resort, villa or apartment, guest house, or no preference;
- structured accessibility preferences, all optional;
- an optional note of no more than 300 characters.

**Accessibility helper:** We will use this to filter suggestions where information is available. Always confirm arrangements directly with the provider.

**Privacy note:** Do not include passport, payment, medical or other sensitive information.

**Primary action:** Build my plan

**Progress label:** Step 4 of 4

## Loading state

**Heading:** Putting your Jamaica plan together

**Body:** We are matching your choices with approved places and experiences.

Use a visible progress indicator that does not pretend to know an exact percentage. After eight seconds, add: “This is taking a little longer. Your choices are safe on this device.”

## First plan

**Heading:** Your first Jamaica plan

**Intro pattern:** “A [pace] [nights]-night outline centred on [resort area], with more [top interests].”

For each suggestion, show:

- why it fits;
- the resort area and content type;
- price status and source currency;
- date checked;
- source link;
- Save, Replace and Remove actions.

Show JMD and USD subtotals separately. Do not imply that one has been converted into the other.

**Primary action:** Save this trip

**Secondary action:** Keep editing without saving

Only now offer device-scoped saving.

## Save to this device

**Heading:** Save your plan to this device

**Body:** Connected mode stores the plan in MongoDB under a random identifier kept by this browser. No account is required.

**Primary action:** Save this trip

**Success heading:** Your trip is saved

**Success body:** This plan is available from My trip on this browser. Clearing browser storage or changing device removes access.

Provide **View saved trips** and **Keep editing** actions. If the API is unavailable, save a labelled local browser copy and say so clearly.

## Returning visitor

**Heading:** Welcome back

Load plans that match the random device identifier retained in local storage. Never merge or overwrite a saved plan silently.

Actions:

- Save this trip
- Not now

Explain that device scoping is not an account and does not provide cross-device access.

## Empty and error states

### No matching approved content

**Heading:** Let us widen the options

**Body:** We do not have enough approved matches for every preference yet. Try another resort area or make one interest flexible.

**Action:** Adjust my choices

### AI unavailable

**Heading:** Your plan is ready

**Body:** We built this plan from your preferences. Personalised wording is temporarily unavailable, but you can still edit and save it.

Do not describe this as an error unless the core plan also failed.

### Plan generation failed

**Heading:** We could not build the plan just now

**Body:** Your answers are still on this device. Please try again, or review your choices.

Actions:

- Try again
- Review my choices

### External provider unavailable

**Heading:** This provider link is unavailable

**Body:** Nothing has been booked or charged. Return to your plan and choose another option.

### Saved trips empty state

**Heading:** Your next Jamaica idea starts here

**Body:** Build a plan, then save it here when it feels right.

**Action:** Plan a trip

## Provider hand-off

Before opening a partner site, show a compact confirmation:

**Heading:** Continue to [provider name]

**Body:** You are leaving Visit Jamaica to check [accommodation or experience]. The provider controls live availability, final price, payment and cancellation terms.

Show the price status and checked date.

Actions:

- Continue to provider
- Stay with my plan

## Help copy

Answer these questions in plain language:

- How are suggestions chosen?
- Are prices and availability live?
- What does “check with provider” mean?
- Why do I need an email to save?
- How do I delete my trip?
- What information should I avoid entering?
- What happens when I visit a provider's site?

## First-pilot measurement

Measure only:

| Event | When it fires | Safe properties |
|---|---|---|
| `planner_started` | The visitor begins Step 1 | entry page |
| `brief_completed` | A valid Step 4 is submitted | resort-area choice, night band, interest count, pace |
| `plan_generated` | A valid plan is displayed | AI or fallback, number of items |
| `plan_saved` | The authenticated trip is stored | new or updated |
| `provider_handoff_opened` | An allowlisted provider is opened | content type, provider domain |

Do not send email, free text, accessibility choices, exact dates, party composition or the itinerary into product events.

## Five questions for observed pilot sessions

1. What did you expect to happen after selecting “Plan my trip”?
2. Which question, if any, was difficult to answer?
3. What part of the plan felt useful or untrustworthy?
4. What information did you need before continuing to a provider?
5. Would you return to this planner for a real Jamaica trip? Why or why not?

Observe behaviour before prompting. Fix confusing language and missing trust information before adding features.
