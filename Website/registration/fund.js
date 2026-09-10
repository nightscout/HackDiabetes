/* ══ HackDiabetes 26 — fundraising thermometer ══════════════════════════════
   Shared by index.html and sponsorship.html. Markup contract: a .fund block
   containing #fundPct, #fundFill, #fundTrack, #fundRaised, #fundGoal and
   #fundLeft. Styling lives in fund.css.

   Renders immediately from the FUNDRAISING_* values in config.js, then
   refreshes from FUNDRAISING_URL if it is set. That is a static JSON file
   baked into the site by the deploy workflow, which reads the finance sheet
   once a day via Apps Script — so page views cost no script quota and the
   sheet itself stays private. See Website/apps-script/README.md.

   Exits quietly on pages with no .fund block.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
    var GOAL =
        typeof FUNDRAISING_GOAL !== "undefined" ? FUNDRAISING_GOAL : 75000;
    var raised =
        typeof FUNDRAISING_RAISED !== "undefined" ? FUNDRAISING_RAISED : 0;
    var URL = typeof FUNDRAISING_URL !== "undefined" ? FUNDRAISING_URL : "";

    var elPct = document.getElementById("fundPct");
    var elFill = document.getElementById("fundFill");
    var elTrack = document.getElementById("fundTrack");
    var elRaised = document.getElementById("fundRaised");
    var elGoal = document.getElementById("fundGoal");
    var elLeft = document.getElementById("fundLeft");

    if (!elPct || !elFill || !elTrack || !elRaised || !elGoal || !elLeft)
        return;

    function money(n) {
        return (
            "$" +
            Math.round(n)
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        );
    }

    function render(amount) {
        if (!(amount >= 0) || !(GOAL > 0)) return;
        var pct = Math.max(0, Math.min(100, (amount / GOAL) * 100));
        elPct.textContent = Math.round(pct) + "%";
        elFill.style.width = pct.toFixed(1) + "%";
        elTrack.setAttribute("aria-valuenow", Math.round(amount));
        elTrack.setAttribute("aria-valuemax", Math.round(GOAL));
        elTrack.setAttribute(
            "aria-valuetext",
            money(amount) + " raised of " + money(GOAL) + " goal"
        );
        elRaised.textContent = money(amount);
        elGoal.textContent = money(GOAL);
        elLeft.textContent = money(Math.max(0, GOAL - amount));
    }

    render(raised);

    if (!URL) return;
    fetch(URL, { cache: "no-cache" })
        .then(function (r) {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
        })
        .then(function (d) {
            var live = parseFloat(d && d.raised);
            if (isFinite(live) && live >= 0) {
                if (isFinite(parseFloat(d.goal)) && d.goal > 0)
                    GOAL = parseFloat(d.goal);
                render(live);
            }
        })
        .catch(function () {});
})();
