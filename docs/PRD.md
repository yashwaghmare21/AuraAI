# Product Requirements Document (PRD)

## Product
Browser voice support agent "Aria" for fictional D2C brand Aura Skincare.

## Goals
- Natural concise voice conversation (Indian voice).
- Answer from brand/policy info only.
- Order lookup via tool calling.
- Refuse out-of-policy and out-of-scope requests.
- Graceful handling of unclear audio and invalid order IDs.
- Post-call transcript + JSON summary.

## Non-goals
- Telephony.
- Auth.
- Real payments.
- Real cancellations.

## User Stories
- Order tracking (ORD-101).
- Cancel Out-for-Delivery order (declined, suggest refusing at door).
- Cancel Processing order (ORD-103 allowed).
- Return opened product after 20 days (declined).
- Out-of-scope (flight booking) refused.
- Invalid order ID (ORD-999) handled.
- Missing order ID -> ask for it.

## Functional Requirements
- Start/End Call.
- Live state badge (Listening/Thinking/Speaking).
- Test Orders panel with ORD-101/102/103 details.
- Live transcript.
- Post-call screen with transcript + JSON.
- Tools: `get_order_details`, `check_return_eligibility`, `check_cancellation_eligibility`.
- Barge-in.

## Policies
- Free shipping above 499 INR else 50 INR.
- Delivery 3-5 business days.
- Returns within 7 days of delivery for unopened unused items in original packaging.
- Damaged/defective reported within 48h with photos for replacement.
- Cancellation only while status is Processing (Shipped/Out for Delivery can't be cancelled, customer may refuse at doorstep).
- COD up to 2500 INR, cash or UPI.

## Success Metrics
- First audio under ~1.5s.
- 100% correct on test script.
- Zero crashes on bad input.
