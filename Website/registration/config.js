// ── HackDiabetes 26 — Site configuration ──────────────────────────────────
// Set to true to open the interest form, false to show a "not open yet" message.
// Append ?preview=1 to any URL to bypass this flag for testing.
var INTEREST_OPEN = true;

// Set to true once registrations have closed / rooms are full. Overrides
// INTEREST_OPEN, hides the register buttons and shows "fully booked" wording.
// Invite links on the register page keep working so rooms can be juggled manually.
var REGISTRATION_CLOSED = true;
if (REGISTRATION_CLOSED) INTEREST_OPEN = false;
