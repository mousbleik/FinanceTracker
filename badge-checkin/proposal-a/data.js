// Mock attendee data (replaces the Google Sheet the original page queried via
// google.script.run). Swap this out for a real fetch()/API call when wiring a
// live backend — the rest of the app only depends on this array's shape.
window.ATTENDEES = [
  {
    ref: "AS2020-290177",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    phone: "+966 50 000 0000",
    scfhs: "SCFHS-12345"
  },
  {
    ref: "AS2020-290178",
    firstName: "Sara",
    lastName: "Al-Ahmadi",
    email: "sara.alahmadi@example.com",
    phone: "+966 50 000 0111",
    scfhs: "SCFHS-67890"
  },
  {
    ref: "AS2020-290179",
    firstName: "Mohammed",
    lastName: "Khan",
    email: "m.khan@example.com",
    phone: "+966 50 000 0222",
    scfhs: "SCFHS-24680"
  }
];

// Event details — same wording as the original badge.
window.EVENT = {
  title: "Anesthesia Symposium 2020",
  info: "March 1 - 4, 2019,<br>KFSHRC - Riyadh, Saudi Arabia"
};
