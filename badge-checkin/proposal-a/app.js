// Proposal A — application logic.
// Looks up an attendee from window.ATTENDEES (data.js), renders the badge and
// drives printing. No Google Apps Script dependency; the data source is a plain
// array that could be swapped for a fetch() call to a real API.

(function () {
  "use strict";

  var form = document.getElementById("searchForm");
  var input = document.getElementById("search");
  var msg = document.getElementById("searchMsg");
  var info = document.getElementById("attendeeInfo");
  var badge = document.getElementById("badge");
  var placeholder = document.getElementById("badgePlaceholder");
  var printBtn = document.getElementById("printBtn");

  function findAttendee(query) {
    var q = query.trim().toLowerCase();
    if (!q) return null;
    return window.ATTENDEES.find(function (a) {
      var fullName = (a.firstName + " " + a.lastName).toLowerCase();
      return a.ref.toLowerCase() === q ||
             fullName.indexOf(q) !== -1 ||
             a.firstName.toLowerCase() === q ||
             a.lastName.toLowerCase() === q;
    }) || null;
  }

  function qrSrc(text) {
    return "https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=" +
           encodeURIComponent(text);
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function render(att) {
    // Attendee info list
    setText("infoName", att.firstName + " " + att.lastName);
    setText("infoEmail", att.email);
    setText("infoPhone", att.phone);
    setText("infoScfhs", att.scfhs);
    setText("infoRef", att.ref);
    info.hidden = false;

    // Badge
    setText("badgeEvent", window.EVENT.title);
    setText("badgeName", att.firstName + " " + att.lastName);
    document.getElementById("badgeInfo").innerHTML = window.EVENT.info;
    setText("badgeRef", att.ref);

    var qr = document.getElementById("badgeQr");
    qr.src = qrSrc(att.ref);
    qr.onerror = function () { qr.style.visibility = "hidden"; };

    badge.hidden = false;
    placeholder.hidden = true;
  }

  function clearResult() {
    info.hidden = true;
    badge.hidden = true;
    placeholder.hidden = false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var att = findAttendee(input.value);
    if (att) {
      msg.textContent = "Attendee found.";
      msg.className = "search__msg is-ok";
      render(att);
    } else {
      msg.textContent = "No attendee found for “" + input.value.trim() + "”.";
      msg.className = "search__msg is-error";
      clearResult();
    }
  });

  printBtn.addEventListener("click", function () {
    window.print();
  });

  // Render the default attendee on load so the page is not empty.
  form.dispatchEvent(new Event("submit"));
})();
