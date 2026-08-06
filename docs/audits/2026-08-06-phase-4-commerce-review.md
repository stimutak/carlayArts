# Phase 4 commerce, policy, and accessibility review

Status: implementation self-review against the `93c12ec` inventory baseline. This is evidence for expert review, not a substitute for owner policy approval, assistive-technology testing, or the Phase 6 independent accessibility gate.

## Release blockers that remain intentionally closed

- The authoritative content collection contains 39 `sold`, 21 `not-for-sale`, and zero `available` works. No current work is addable. The owner must approve availability and the required full-work media before changing a record to `available`.
- Shipping destinations, carrier/service, insurance, timing, costs, taxes, duties, returns, damage handling, condition, framing, and certificate terms do not have approved source facts in this baseline. The UI labels these as pending owner validation and makes no buyer promise.
- Only the local `demo` checkout adapter is registered. It makes no request, requests no card or wallet data, creates no order/reservation/e-mail, and records only a sanitized no-payment result in `sessionStorage`.
- No Stripe, Mollie, Coinbase, or other provider branding appears in the Phase 4 UI. Activating a real provider requires a separate server-side commerce/security design, inventory reservation and idempotency, owner policy approval, and end-to-end payment review.

## WCAG 2.2 A/AA assessment for the Phase 4 surface

| Criteria | Status | Phase 4 evidence or remaining review |
| --- | --- | --- |
| 1.1.1 Non-text Content | Pass in scope | Cart images reuse inventory alt text; decorative confirmation mark is hidden. Owner media-alt approval remains part of inventory review. |
| 1.2.1–1.2.5 Time-based Media | Not applicable | The cart and checkout contain no audio or video. |
| 1.3.1 Info and Relationships | Pass in code/browser | Semantic headings, lists, `fieldset`/`legend`, labels, named inputs, table-free summaries, and dialog relationships are present. |
| 1.3.2 Meaningful Sequence | Pass in code/browser | Mobile source order starts with progress/title, then compact summary and form; confirmation outcome precedes detail. |
| 1.3.3 Sensory Characteristics | Pass | Instructions do not depend on shape, position, sound, or color alone. |
| 1.3.4 Orientation | Pass in browser | No orientation lock; 320px and desktop flows are exercised. Physical devices remain Phase 6 evidence. |
| 1.3.5 Identify Input Purpose | Pass in code | Shipping/contact fields use appropriate autocomplete tokens. |
| 1.4.1 Use of Color | Pass in code | Error text, borders, messages, labels, and checked controls convey state in addition to color. |
| 1.4.2 Audio Control | Not applicable | No audio. |
| 1.4.3 Contrast (Minimum) | Pass for defined palette | Essential copy uses `#FAFAFA`, `#B8B8B8`, `#8A8A8A`, `#FF7B9C`, or rose on noir/surface. Independent visual audit remains required. |
| 1.4.4 Resize Text | Pass in responsive browser checks | Fluid sizes and no fixed-height content regions. Manual 200% browser zoom remains an expert-gate check. |
| 1.4.5 Images of Text | Pass | No Phase 4 instruction or control label is an image. |
| 1.4.10 Reflow | Pass in browser checks | No horizontal overflow at 320/390/1440px on cart, checkout, and confirmation. |
| 1.4.11 Non-text Contrast | Pass in code | Focus, field, checked-radio, error, and button boundaries use strong/rose contrast. Independent visual measurement remains required. |
| 1.4.12 Text Spacing | No known blocker | Layout does not clip fixed-height text. Manual user stylesheet check remains required. |
| 1.4.13 Content on Hover or Focus | Not applicable | No essential hover/focus popover content. |
| 2.1.1 Keyboard | Pass in browser | Drawer, removal, form, retry, and summary use native controls; browser journey is keyboard-addressable. |
| 2.1.2 No Keyboard Trap | Pass in browser | Drawer traps only while modal, Escape closes, and focus returns to its trigger. |
| 2.1.4 Character Key Shortcuts | Not applicable | No character-only shortcuts. |
| 2.2.1 Timing Adjustable | Pass | No timeout. Simulated latency does not expire or discard form values. |
| 2.2.2 Pause, Stop, Hide | Not applicable | No moving or auto-updating essential content. |
| 2.2.6 Timeouts | Not applicable | No user inactivity timeout. |
| 2.3.1 Three Flashes | Pass | No flashing content. |
| 2.4.1 Bypass Blocks | Pass | Shared skip link targets main content. |
| 2.4.2 Page Titled | Pass | Cart, checkout, and confirmation have distinct titles. |
| 2.4.3 Focus Order | Pass in browser | Drawer opens at close control; error summary receives focus; confirmation outcome is focusable. |
| 2.4.4 Link Purpose | Pass | Cart, modify, work, return, and contact links are named by purpose. |
| 2.4.5 Multiple Ways | Pass at site level | Shared primary navigation plus contextual return links expose routes. |
| 2.4.6 Headings and Labels | Pass | Labels identify required/optional state and demo-only payment choices. |
| 2.4.7 Focus Visible | Pass in code | Global 3px rose focus outline with offset. |
| 2.4.11 Focus Not Obscured (Minimum) | No known blocker | Modal focus remains inside the visible drawer; sticky summary does not cover form focus. Manual zoom/virtual-keyboard review remains required. |
| 2.5.1 Pointer Gestures | Not applicable | No multipoint or path gesture. |
| 2.5.2 Pointer Cancellation | Pass | Actions use click activation on native controls; no down-event action. |
| 2.5.3 Label in Name | Pass | Visible control text is present in accessible names; icon-only controls have explicit labels. |
| 2.5.4 Motion Actuation | Not applicable | No motion input. |
| 2.5.7 Dragging Movements | Not applicable | No dragging interaction. |
| 2.5.8 Target Size (Minimum) | Pass in code | Primary controls use at least 44px (`2.75rem`) targets; inline links have spacing or exception context. Physical touch review remains required. |
| 3.1.1 Language of Page | Pass | Shared document language is French. |
| 3.1.2 Language of Parts | Not applicable | No substantive language change. |
| 3.2.1 On Focus | Pass | Focus alone causes no navigation or submission. |
| 3.2.2 On Input | Pass | Country updates region requirements only; radios and fields do not navigate. |
| 3.2.3 Consistent Navigation | Pass | Shared navigation and cart controls are reused on every route. |
| 3.2.4 Consistent Identification | Pass | Drawer, remove, retry, demo, and cart controls keep consistent names and behavior. |
| 3.2.6 Consistent Help | Not applicable | No repeated help mechanism is introduced in Phase 4. |
| 3.3.1 Error Identification | Pass in browser | Summary and field-level text identify validation errors; storage and adapter failures have explicit messages. |
| 3.3.2 Labels or Instructions | Pass | Required state, input purpose, region rule, demo behavior, and failure simulation are explained before submission. |
| 3.3.3 Error Suggestion | Pass | Each field error states the correction; retry remains available and values persist. |
| 3.3.4 Error Prevention (Legal, Financial, Data) | Pass for demo scope | Explicit acknowledgement, review summary, duplicate/stale revalidation, no live financial action, and an explicit no-payment confirmation. A real checkout would require a new confirmation/reversal design. |
| 3.3.7 Redundant Entry | Pass in scope | No multi-step re-entry is required; values remain after errors. |
| 3.3.8 Accessible Authentication | Not applicable | No authentication. |
| 4.1.2 Name, Role, Value | Pass in code/browser | Dialog naming/state, expanded cart trigger, live count, radios, checkbox, details, and form states use native or explicit semantics. |
| 4.1.3 Status Messages | Pass in code/browser | Cart add/remove/duplicate, loading, checkout progress, and error/success changes use status or alert semantics without forced focus except actionable error summaries. |

## Required expert follow-up

- Screen-reader review with VoiceOver/Safari and at least one second browser/AT pairing.
- Manual 200%/400% zoom, text-spacing stylesheet, high-contrast/forced-colors, reduced-motion, virtual keyboard, and physical touch review.
- Independent contrast measurement and WCAG technique review across shared navigation/footer styles outside the Phase 4 delta.
- Owner sign-off on inventory and all commerce policy facts before any live-commerce work begins.
