// const { run } = require("node:test");

const isSecure = window.location.protocol === "https:";
const userProvidedSocketUrl = `${isSecure ? "wss" : "ws"}://${
  window.location.host
}${getStageHash()}/ws`;

connectSocket();

let reconnectTimeout;
const reconnectInterval = 1000;
let reconnectAttempts = 0;

function connectSocket(socketUrl = userProvidedSocketUrl) {
  const websocket = new WebSocket(socketUrl);

  websocket.onopen = () => {
    clearTimeout(reconnectTimeout);
    reconnectAttempts = 0;
    console.warn("WebSocket connected");
  };

  websocket.onclose = () => {
    console.warn("WebSocket disconnected");
    reconnectTimeout = setTimeout(() => {
      console.warn(`WebSocket: attempting reconnect ${reconnectAttempts}`);
      if (websocket && websocket.readyState === WebSocket.CLOSED) {
        reconnectAttempts += 1;
        connectSocket();
      }
    }, reconnectInterval);
  };
  websocket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  websocket.onmessage = (event) => {
    const { tag, payload } = JSON.parse(event.data);

    if (tag === "runtime-data") {
      handleOntimePayload(payload);
    }
  };
}

let localData = {};
let nextZeit = null;
let offsetAbsolut = null;
let offsetRelativ = null;
let offsetMode = null;
let gruppeBis = null;
let gruppeSeit = null;
let rundown = null;
let aktPosition = null;
let dreiWeitere = null;
let playmode = null;

function handleOntimePayload(payload) {
  localData = { ...localData, ...payload };

  if ("clock" in payload)
    updateDOM("uhrInhaltZahl", formatTimer(payload.clock, true));
  htttpGETladen();

  if ("timer" in payload) {
    updateDOM("timer", formatTimer(payload.timer["current"]));
    nextZeit = payload.timer["current"];
    updateProgress(payload.timer["elapsed"], payload.timer["duration"]);
    updateDOM(
      "erwartetesEnde",
      payload.clock > payload.timer["expectedFinish"] &&
        payload.timer["expectedFinish"] != null
        ? "überfällig"
        : formatTimer(payload.timer["expectedFinish"], true)
    );
    updateDOM("begonnenUm", formatTimer(payload.timer["startedAt"], true));
    payload.timer["playback"] == "stop" ? playbackStop() : null;
    playmode = payload.timer["playback"];
  }

  if ("rundown" in payload) {
    gruppeSeit = payload.rundown["actualGroupStart"];
  }

  if ("eventNow" in payload) {
    updateDOM("titelAktuellInhalt", String(payload.eventNow["title"]));
    blinken("inhalt");
    aktPosition = payload.eventNow["id"];
  }

  if ("eventNext" in payload) {
    updateDOM("nextInhalt", String(payload.eventNext["title"]));
  }
  if (payload.eventNext == null) {
    // nextZeit = null;
  }

  if ("offset" in payload) {
    offsetAbsolut = payload.offset["absolute"];
    offsetRelativ = payload.offset["relative"];
    offsetMode = payload.offset["mode"];
    // gruppeBis = payload.offset["expectedGroupEnd"];
  }
  if ("groupNow" in payload) {
    updateDOM("gruppeInhalt", String(payload.groupNow["title"]));
    gruppeBis = payload.groupNow["timeEnd"];
  }

  if (playmode != "stop") {
    if (rundown) dreiWeitere = naechsteDreiEvents(rundown || {}, aktPosition);
    zeitrechnungen(payload.clock, offsetMode, dreiWeitere || []);
  }
}

function updateDOM(field, payload) {
  const domElement = document.getElementById(field);
  if (domElement) {
    domElement.innerText = payload;
  }
}

function updateProgress(current, duration) {
  let prozent = (current / duration) * 100;
  document.getElementById("progressbar").style.width = String(prozent) + "%";
}

function zeitrechnungen(clock, offsetMode, naechstenDrei) {
  let offset = offsetMode == "absolute" ? offsetAbsolut : offsetRelativ;
  updateDOM("nextZeit", nextZeit <= 0 ? "überfällig" : formatTimer(nextZeit));

  updateDOM("einsInhalt", naechstenDrei[0] ? naechstenDrei[0].title : "--");
  updateDOM(
    "einsZeit",
    naechstenDrei[0]
      ? nextZeit <= 0
        ? formatTimer(naechstenDrei[0].duration)
        : formatTimer(naechstenDrei[0].duration + nextZeit)
      : "--:--"
  );
  updateDOM("zweiInhalt", naechstenDrei[1] ? naechstenDrei[1].title : "--");
  updateDOM(
    "zweiZeit",
    naechstenDrei[1]
      ? nextZeit <= 0
        ? formatTimer(naechstenDrei[0].duration + naechstenDrei[1].duration)
        : formatTimer(
            naechstenDrei[0].duration + naechstenDrei[1].duration + nextZeit
          )
      : "--:--"
  );
  updateDOM("dreiInhalt", naechstenDrei[2] ? naechstenDrei[2].title : "--");
  updateDOM(
    "dreiZeit",
    naechstenDrei[2]
      ? nextZeit <= 0
        ? formatTimer(naechstenDrei[0].duration + naechstenDrei[1].duration + naechstenDrei[2].duration)
        : formatTimer(
            naechstenDrei[0].duration +
              naechstenDrei[1].duration +
              naechstenDrei[2].duration +
              nextZeit
          )
      : "--:--"
  );

  if (isFinite(gruppeBis + offset - clock))
    updateDOM(
      "gruppeEnde",
      gruppeBis == null
        ? "--:--"
        : gruppeBis + offset - clock <= 0
        ? "überfällig"
        : formatTimer(gruppeBis + offset - clock)
    );
  if (isFinite(clock - gruppeSeit))
    updateDOM(
      "gruppeZeit",
      gruppeSeit == null ? "--:--" : formatTimer(clock - gruppeSeit)
    );
  if (gruppeSeit == null) updateDOM("gruppeInhalt", "--");
}

function playbackStop() {
  updateDOM("titelAktuellInhalt", "Warten auf Veranstaltungsbeginn");
  updateDOM("nextInhalt", "--");
  updateDOM("einsInhalt", "--");
  updateDOM("zweiInhalt", "--");
  updateDOM("dreiInhalt", "--");
  updateDOM("gruppeInhalt", "--");
  updateDOM("nextZeit", "--:--");
  updateDOM("einsZeit", "--:--");
  updateDOM("zweiZeit", "--:--");
  updateDOM("dreiZeit", "--:--");
  updateDOM("gruppeZeit", "--:--");
  updateDOM("gruppeEnde", "--:--");
  document.getElementById("progressbar").style.width = "0%";
  aktPosition = null;
  rundown = null;
}

async function htttpGETladen() {
  rundown = await getData("/data/rundowns/current");
  let projekttitel = await getData("/data/project");
  updateDOM("projektTitel", projekttitel.title);
}

async function getData(url) {
  const response = await fetch(`${window.location.origin}${url}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.json();
}

function naechsteDreiEvents(rundown, aktPosition, anzahl = 3) {
  return rundown.flatOrder
    .map((id) => rundown.entries[id])
    .slice(rundown.flatOrder.indexOf(aktPosition))
    .filter((event) => event?.type === "event" && !event?.skip)
    .slice(2, 2 + anzahl);
}

async function blinken(id) {
  document.getElementById(id).classList.add('blink');
        setTimeout(() => {
            document.getElementById(id).classList.remove('blink');
        }, 3000);
}

const millisToSeconds = 1000;
const millisToMinutes = 1000 * 60;
const millisToHours = 1000 * 60 * 60;

function formatTimer(number, clock = false) {
  if (number == null) {
    return "--:--:--";
  }
  const millis = Math.abs(number);
  const isNegative = number < 0;
  const isNull = leftPad(millis / millisToHours) != "00";
  return `${isNegative ? "-" : ""}${
    isNull || clock ? leftPad(millis / millisToHours) + ":" : ""
  }${leftPad((millis % millisToHours) / millisToMinutes)}:${leftPad(
    (millis % millisToMinutes) / millisToSeconds
  )}`;

  function leftPad(val) {
    return Math.floor(val).toString().padStart(2, "0");
  }
}

function formatObject(data) {
  return JSON.stringify(data, null, 2);
}

function getStageHash() {
  const href = window.location.href;
  if (!href.includes("getontime.no")) {
    return "";
  }

  const hash = href.split("/");
  const stageHash = hash.at(3);
  return stageHash ? `/${stageHash}` : "";
}
