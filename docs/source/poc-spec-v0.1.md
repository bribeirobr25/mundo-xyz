# Shared World — POC v0.1


Public project-content export. Source wording and proposed/open status are retained. Personal attribution and internal source links are removed. The architecture companion was subsequently approved; its explicitly open decisions remain open.


A sentence becomes a coherent interpretation published in a persistent world; someone else continues the idea, and both people can recognize what changed and who contributed.

## 1. Foundations and hypotheses

Confirmed: “A shared illustrated world where you create with sentences and other people continue your ideas, building places and stories together.” One public world, starting with a small area; not separate worlds for each group. Proposed for the POC: a browser experience adapted to both mobile and desktop.

Product documentation and interface copy will be in English. Supported input languages and multilingual capabilities remain to be defined; this specification neither promises multilingual support nor imposes a new input-language restriction.

Hypotheses: friends and microcommunities may form the first test audience; recognizing your intent and having someone continue your idea create value. Free previews and paid publishing are a commercial hypothesis. Price is undecided. Around 40 hours is a scope constraint, not a delivery guarantee.

## 2. Functional scope

Proposed: a small catalog of owned or licensed isometric 2D assets, bounded placement areas, and a few narrative relationships. Natural language produces structured commands; the server validates the catalog, relationships, available space, and permissions. Never execute user- or model-generated code.

Demonstrable scenario: create a café for birds → add the narrative rule “the coffee prevents flight” → someone else creates a bus connected to the café. Supported relationships are represented through states, captions, and visual composition; there are no autonomous agents or universal physics.

In scope: explore, write, preview a draft, publish, continue an idea, inspect authorship/history, open a contextual link, and see real changes since the last visit. Out of scope: voice, uploads and personal information in content, unlimited 3D, universal simulation, clubs/tickets, capsules, anonymous gifts, creator payouts, and a virtual-land economy.

The world may start empty, but must offer an honest suggestion for the first action. Demonstrations and administrator contributions are labeled; never invent users or activity.

## 3. Journey and screens

1. Enter without signing in through the map or a creation link; see the scene, context, and available authorship information.
2. Select a location or contribution and choose to create or continue.
3. Write a short sentence. Proposed: an initial configurable limit of 240 characters, disclosed before entry.
4. Receive a local preview and a brief explanation of the interpretation. Edit, undo, or discard without changing the shared world.
5. Choose to publish; establish a persistent pseudonymous identity through a mechanism still to be selected. Show the rules, payment mode, and any price before confirmation.
6. The server revalidates the scene version and publishes exactly once. Show confirmation and a direct link; preserve the draft if an error occurs.
7. Another person opens the same context, tries a continuation, and publishes through the same flow.
8. Return to see actual changes since the last visit, without external notifications.

Proposed minimum screens: map with an object/history panel; composer with preview; publishing confirmation and result; a short updates list within the map. Separate administrator moderation. Prefer panels over additional pages.

Usable touch and keyboard controls, labeled actions, a text alternative to the illustration, and loading/error states. No mandatory audio or flashing effects; respect reduced-motion preferences. Links must focus on the creation, not simply open the starting area.

## 4. Rules and reliability

Authorship: every contribution retains its author, date, origin, and relationship to the previous contribution. Adding or transforming creates a new record/version; it never replaces original attribution. In the POC, nobody deletes, moves, or destructively overwrites someone else’s contribution. Allow only supported additive transformations; offer an alternative or a clear refusal for other requests.

Previews are private to the visitor and reversible. Publishing is public, explicitly confirmed, and persisted on the server. Two visitors receive changes without manually refreshing, through incremental updates or polling; do not promise instantaneous synchronization. Store the base version: if it changes, revalidate and request confirmation again whenever the interpretation or placement must change.

Proposed monetization for this stage: clearly labeled sandbox confirmation, with no charge; configurable price and flow. This tests understanding and functionality, not actual willingness to pay. Real payments belong in a separate experiment after a commercial decision. If introduced: pending, confirmed, failed, and published states; server-verified confirmation and idempotency linking payment to contribution. A confirmed payment with publication pending must be recoverable without another charge.

Safeguards: validate length, commands, and displayed text; reject offensive content or information that identifies people, with a warning not to enter personal information. No uploads. Limit frequency and volume per identity/session, with additional abuse controls. An administrator can hide content and record a reason without deleting the technical history. A public world does not require unrestricted publishing: the initial test may limit who can publish.

## 5. Data and measurement

| Record | Minimum required |
| --- | --- |
| Identity | Pseudonymous ID; no social profile or location. |
| World/object | IDs, asset, position, supported state, and version. |
| Contribution | ID, author, date, approved text, validated command, origin, and visibility. |
| Draft/publication | Base version, idempotency key, state, and recoverable error. |
| Last visit | Version/date seen by each visitor; retention policy to be defined before testing. |

Essential events: contextual opening, draft started, valid/rejected preview, sandbox confirmation, publication completed/failed/conflicted, shared link opened, continuation published, and change viewed on return. Do not send free-text sentences to the analytics tool.

Measure completed creations among attempts; delivered publications among confirmations; recipients who continue among link visitors; and returns to changes among authors whose creations received a continuation. Separate sandbox activity from real purchases. Do not set conversion targets without testing.

## 6. Acceptance and testing

1. In two independent sessions A/B, A’s preview does not change B’s scene.
2. A’s publication appears in B without a manual refresh and remains after refreshing both sessions.
3. Repeating confirmation or recovering from a failure neither duplicates the contribution nor loses the draft.
4. B continues the creation; history preserves authors and relationships, including after refresh.
5. A direct link opens the correct object and context; a hidden object shows an honest state without exposing moderated content.
6. An unsupported request neither charges nor silently publishes an approximation; it explains the limits and preserves editing.
7. Concurrent publications are revalidated; conflicts never silently overwrite changes.
8. On return, A sees only real, previously unseen changes; when nothing changed, there is no fabricated activity.

Proposed test: invite a small set of people, including pairs who have received no prior explanation. Ask them to create, share, continue, and return. Record where they need help, whether they recognize their sentence in the preview, and whether they understand attribution and publishing. Decide adjustments through observation; a small sample and sandbox do not validate the market.

## 7. Build sequence and decisions

1. Finalize the minimum catalog, supported relationships, public rules, and demonstrable example.
2. Deliver the map and deterministic composition; then sentence → validated command → local preview.
3. Add identity, persistence, idempotent publishing, and concurrency revalidation; test two sessions.
4. Add continuations, history, contextual links, moderation, and abuse limits.
5. Complete sandbox confirmation, measurement, real updates, and failure/mobile testing.

Scope cutoff: if sentence → preview → persistent publication → continuation in two sessions does not work, stop expanding and fix the core. Never cut validation, moderation, or recovery to add visual effects. Defer elaborate animations and real monetization.

For review: approve the catalog/relationships, identity at publishing, controlled publishing access, and sandbox. Define test duration, data retention, and hosting of the results. Stack, price, and real charging remain open; no platform is a confirmed requirement.
