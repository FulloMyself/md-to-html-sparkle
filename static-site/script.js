// Northgate — demo interactions (no dependencies)

const VEHICLES = [
  { plate: "7 XKA 441", detail: "Bay A-04", status: "ALLOWED", tone: "allow", label: "Matched · Resident" },
  { plate: "KLM 209", detail: "Guest · pre-auth", status: "ALLOWED", tone: "allow", label: "Matched · Visitor" },
  { plate: "DQX 883", detail: "Not on list", status: "HELD", tone: "held", label: "No rule · Held" },
  { plate: "7 XKA 441", detail: "Bay A-04", status: "EXIT", tone: "allow", label: "Matched · Exit" },
  { plate: "BRV 512", detail: "Bay C-11", status: "ALLOWED", tone: "allow", label: "Matched · Resident" },
];

const log = document.getElementById("log");
const plateEl = document.getElementById("plate");
const statusEl = document.getElementById("plateStatus");
const boom = document.getElementById("boomArm");

const clock = () =>
  new Date().toLocaleTimeString("en-GB", { hour12: false });

function addEvent(v) {
  const row = document.createElement("div");
  row.className = "log-row";
  row.innerHTML =
    '<span class="log-time">' + clock() + "</span>" +
    '<span class="log-plate">' + v.plate + "</span>" +
    '<span class="log-detail">' + v.detail + "</span>" +
    '<span class="log-status ' + (v.tone === "held" ? "held" : "") + '">' +
      '<i class="dot ' + (v.tone === "held" ? "dot-held" : "dot-allow") + '"></i>' +
      v.status +
    "</span>";
  log.prepend(row);
  while (log.children.length > 6) log.lastElementChild.remove();
}

function showAtGate(v) {
  plateEl.textContent = v.plate;
  statusEl.className = "plate-status" + (v.tone === "held" ? " held" : "");
  statusEl.innerHTML =
    '<i class="dot ' + (v.tone === "held" ? "dot-held" : "dot-allow") + '"></i>' + v.label;
  // held vehicles do not lift the boom
  boom.style.animationPlayState = v.tone === "held" ? "paused" : "running";
}

let i = 0;
function tick() {
  const v = VEHICLES[i % VEHICLES.length];
  i++;
  showAtGate(v);
  addEvent(v);
}

// seed the log, then stream
VEHICLES.slice(0, 4).forEach(addEvent);
showAtGate(VEHICLES[0]);
setInterval(tick, 4500);
