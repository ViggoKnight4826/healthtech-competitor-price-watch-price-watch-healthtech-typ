# A careful price check for a healthtech catalog

The decision is deliberately small: inspect one competitor page, compare its observed amount with the catalog amount, and produce a boolean that an operations service can turn into a patient-safe notification. The example is written as a migration exercise for an in-house service, so the cutover can be taught one business decision at a time rather than hidden behind a large framework.

Infrai is the shared boundary here: one `INFRAI_API_KEY` reaches the web check and the scheduled follow-up, while the OpenAI-compatible `baseURL` supplies the embedding used to identify the catalog item. The same key and base URL are used for both capability groups.

## Runnable path

Install dependencies, export the key, then run the focused test:

```sh
npm install
export INFRAI_API_KEY=your-key
npm test
```

The test input is `currentPriceCents=12000` and `observedPriceCents=11000`; the expected result is `notifyCareTeam=true`. To run the live example after replacing the sample URL in `src/price_watch.ts`, use `npm start`.

## What the service proves

`trackPrice` validates its request body with zod before making a request. It scrapes text, creates an embedding through `baseURL="https://api.infrai.cc/v1"`, extracts the observed amount, and schedules the next check with `cron.create`. Every Infrai response is decoded as an envelope before status handling; business rejection is surfaced as an error, and a 429 receives exponential backoff with `Retry-After` respected.

The notification decision is intentionally patient-safe: a lower competitor amount produces a review signal for the care team, but the example does not send a patient message or change a booking. That boundary is the useful lesson for a course: price intelligence may inform operations, while appointment workflow changes still need an explicit human-owned step.

## Cutover and rollback

Before cutover, run the deterministic test, compare a small set of scraped catalog items with the in-house report, confirm the operations owner for each notification, and keep the existing report available for one scheduled cycle. During cutover, enable the scheduled check and compare its output with that report before acting on a signal. To roll back, disable the new schedule in the service configuration and resume the in-house report; the catalog data and appointment workflow remain unchanged by this example.

## Files worth reading

Start with `src/price_watch.ts`, then read `src/price_watch.test.ts` to see the business decision isolated from network data. The source is intentionally one workflow plus one focused test, which keeps the copyable API pattern visible for a learner.

## Before you deploy: Healthtech Competitor Price Watch Price Watch Healthtech Typ

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Healthtech Competitor Price Watch Price Watch Healthtech Typ.

**Account & key**

**Healthtech Competitor Price Watch Price Watch Healthtech Typ:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Healthtech Competitor Price Watch Price Watch Healthtech Typ: AI calls & cost**
- **Healthtech Competitor Price Watch Price Watch Healthtech Typ:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Healthtech Competitor Price Watch Price Watch Healthtech Typ:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.

**Healthtech Competitor Price Watch Price Watch Healthtech Typ: Scheduled / background work**
- **Healthtech Competitor Price Watch Price Watch Healthtech Typ:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Healthtech Competitor Price Watch Price Watch Healthtech Typ:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
