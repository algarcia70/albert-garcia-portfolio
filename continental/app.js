"use strict";

const hands = ["2 tríos", "1 escalera y 1 trío", "2 escaleras", "3 tríos", "2 tríos y 1 escalera", "2 escaleras y 1 trío", "3 escaleras", "4 tríos"];
const storageKey = "continental-scorecard-v1";
const maxPoints = 9999;
const byId = id => document.getElementById(id);
const normalize = value => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
const status = message => { byId("status").textContent = message; };
const counted = (round, player) => round.points[player] * (round.doublette ? 2 : 1);
const validPoints = value => Number.isInteger(value) && value >= 0 && value <= maxPoints;
let match = null;
let editing = null;
try { match = JSON.parse(localStorage.getItem(storageKey)); } catch { status("This browser could not load the saved match."); }

function persist(next) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    match = next;
    return true;
  } catch {
    status("This browser could not save the match. Your entries are still on screen.");
    return false;
  }
}

const smallNumbers = "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte veintiuno veintidos veintitres veinticuatro veinticinco veintiseis veintisiete veintiocho veintinueve".split(" ");
const tens = "treinta cuarenta cincuenta sesenta setenta ochenta noventa".split(" ");
const hundreds = "doscientos trescientos cuatrocientos quinientos seiscientos setecientos ochocientos novecientos".split(" ");

function spanishNumber(value) {
  if (/^\d+$/.test(value)) return Number(value);
  if (value === "mil") return 1000;
  const thousands = value.match(/^(?:(un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve) )?mil(?: (.+))?$/);
  if (thousands) return 1000 * (smallNumbers.indexOf(thousands[1]) > 0 ? smallNumbers.indexOf(thousands[1]) : 1) + (thousands[2] ? underThousand(thousands[2]) : 0);
  return underThousand(value);
}

function underThousand(value) {
  if (value === "cien") return 100;
  const words = value.split(" ");
  const hundred = words[0] === "ciento" ? 100 : (hundreds.indexOf(words[0]) + 2) * 100;
  const hasHundred = words[0] === "ciento" || hundreds.includes(words[0]);
  if (hasHundred) words.shift();
  const rest = words.join(" ");
  const small = smallNumbers.indexOf(rest === "un" ? "uno" : rest);
  if (small >= 0) return (hasHundred ? hundred : 0) + small;
  if (!rest && hasHundred) return hundred;
  const ten = tens.indexOf(words[0]);
  const unit = smallNumbers.indexOf(words[2] === "un" ? "uno" : words[2]);
  if (ten >= 0 && (words.length === 1 || (words.length === 3 && words[1] === "y" && unit > 0 && unit < 10))) {
    return (hasHundred ? hundred : 0) + (ten + 3) * 10 + (words.length === 1 ? 0 : unit);
  }
  return NaN;
}

function parseScores(transcript, names) {
  const roster = names.map(normalize);
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = roster.slice().sort((a, b) => b.length - a.length).map(escape).join("|");
  const spoken = normalize(transcript);
  const hits = [...spoken.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, "gu"))];
  const first = hits[0];
  if (!first || spoken.slice(0, first.index).trim()) throw Error("Start with a player’s name. Say each name followed by their points or “ganó”.");
  const points = Array(names.length).fill(null);
  let winner = null;
  let doublette = false;
  hits.forEach((hit, index) => {
    const player = roster.indexOf(hit[0]);
    if (points[player] !== null) throw Error(`${names[player]} was called twice.`);
    const words = spoken.slice(hit.index + hit[0].length, hits[index + 1]?.index)
      .replace(/^[\s:,.!?;–—]+|[\s:,.!?;–—]+$/g, "").replace(/\s+y$/, "");
    if (/^(gano|ganador|won)(?: (?:con |with )?(doublette|doblete|doble|double))?$/.test(words)) {
      if (winner !== null) throw Error("Call exactly one hand winner.");
      winner = player;
      doublette = /(?:doublette|doblete|doble|double)$/.test(words);
      points[player] = 0;
      return;
    }
    const point = spanishNumber(words.replace(/ (puntos?|points?)$/, ""));
    if (!validPoints(point)) throw Error(`Check the points for ${names[player]}.`);
    points[player] = point;
  });
  const missing = names.filter((_, index) => points[index] === null);
  if (missing.length) throw Error(`Missing scores for ${missing.join(", ")}.`);
  if (winner === null) throw Error("Say who won. For example, “Al ganó”.");
  return { points, winner, doublette };
}

function element(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function updatePoints() {
  const winner = Number(byId("winner").value);
  const hasWinner = byId("winner").value !== "";
  match.names.forEach((_, index) => {
    const input = byId(`point-${index}`);
    const output = byId(`count-${index}`);
    input.disabled = hasWinner && winner === index;
    const points = input.valueAsNumber;
    output.textContent = input.disabled ? "0 counted" : validPoints(points) ? `${points * (byId("doublette").checked ? 2 : 1)} counted` : "";
  });
}

function render() {
  cancelVoice();
  byId("setup").hidden = Boolean(match);
  byId("board").hidden = !match;
  byId("entry").hidden = !match || (match.rounds.length === hands.length && editing === null);
  if (!match) return;
  const { names, rounds } = match;
  const totals = names.map((_, player) => rounds.reduce((sum, round) => sum + counted(round, player), 0));
  const table = byId("table");
  table.replaceChildren();
  const header = table.createTHead().insertRow();
  ["Hand", ...names, "Edit"].forEach(name => header.append(element("th", name)));
  const body = table.createTBody();
  hands.forEach((hand, index) => {
    const row = body.insertRow();
    const label = element("th", hand);
    label.scope = "row";
    row.append(label);
    const round = rounds[index];
    names.forEach((_, player) => row.insertCell().textContent = round
      ? round.winner === player ? round.doublette ? "XX" : "—" : counted(round, player)
      : "");
    const cell = row.insertCell();
    if (round) {
      const button = element("button", "Edit");
      button.className = "secondary";
      button.setAttribute("aria-label", `Edit hand ${index + 1}`);
      button.onclick = () => {
        editing = index;
        render();
        byId("hand").focus();
      };
      cell.append(button);
    }
  });
  const footer = table.createTFoot().insertRow();
  footer.append(element("th", "Total"));
  totals.forEach(total => footer.insertCell().textContent = total);
  footer.insertCell();
  const low = Math.min(...totals);
  const leaders = names.filter((_, index) => totals[index] === low);
  byId("result").textContent = rounds.length === hands.length
    ? `${leaders.join(" and ")} ${leaders.length === 1 ? "wins" : "tie"} with ${low} points.`
    : `${rounds.length} of 8 hands saved`;
  if (byId("entry").hidden) return;
  const index = editing ?? rounds.length;
  byId("hand").textContent = `Hand ${index + 1} of 8 · ${hands[index]}`;
  byId("dictation").value = "";
  const select = byId("winner");
  select.replaceChildren(new Option("Choose a player", ""), ...names.map((name, player) => new Option(name, player)));
  const round = rounds[index];
  select.value = round?.winner ?? "";
  byId("doublette").checked = round?.doublette ?? false;
  byId("cancel").hidden = editing === null;
  byId("save").textContent = editing === null ? "Save hand" : "Save changes";
  byId("points").replaceChildren(...names.map((name, player) => {
    const row = element("div");
    row.className = "point";
    const label = element("label", name);
    const input = element("input");
    input.id = label.htmlFor = `point-${player}`;
    input.type = "number";
    input.inputMode = "numeric";
    input.min = 0;
    input.max = maxPoints;
    input.step = 1;
    input.required = true;
    input.value = round?.points[player] ?? "";
    const output = element("output");
    output.id = `count-${player}`;
    output.htmlFor = input.id;
    row.append(label, input, output);
    return row;
  }));
  updatePoints();
}

byId("start").onsubmit = event => {
  event.preventDefault();
  const names = byId("names").value.split(/[,\n]+/).map(name => name.trim()).filter(Boolean);
  if (names.length < 2 || new Set(names.map(normalize)).size !== names.length) {
    status("Enter at least two distinct player names.");
    return;
  }
  if (persist({ names, rounds: [] })) {
    status("");
    render();
    byId("hand").focus();
  }
};
byId("review").onclick = () => {
  try {
    const draft = parseScores(byId("dictation").value, match.names);
    byId("winner").value = draft.winner;
    byId("doublette").checked = draft.doublette;
    draft.points.forEach((points, player) => { byId(`point-${player}`).value = points; });
    updatePoints();
    status("Check the counted points, then save the hand.");
    byId("winner").focus();
  } catch (error) {
    status(`${error.message} You can also enter the scores below.`);
  }
};
byId("scores").oninput = updatePoints;
byId("scores").onsubmit = event => {
  event.preventDefault();
  const winner = Number(byId("winner").value);
  const points = match.names.map((_, player) => player === winner ? 0 : byId(`point-${player}`).valueAsNumber);
  const rounds = match.rounds.slice();
  rounds[editing ?? rounds.length] = { points, winner, doublette: byId("doublette").checked };
  if (persist({ ...match, rounds })) {
    editing = null;
    status("Hand saved.");
    render();
    if (!byId("entry").hidden) byId("hand").focus();
  }
};
byId("cancel").onclick = () => { editing = null; status(""); render(); };
byId("reset").onclick = () => {
  if (!confirm("Start a new match? Download this scorecard first if you want to keep it.")) return;
  if (persist(null)) {
    editing = null;
    status("");
    render();
    byId("names").focus();
  }
};

function spreadsheet({ names, rounds }) {
  const rows = [
    ["Hand", "Winner", "Doublette", ...names, ...names.map(name => `Original points – ${name}`)],
    ...hands.map((hand, index) => {
      const round = rounds[index];
      return [hand, round ? names[round.winner] : "", round ? round.doublette ? "Yes" : "No" : "",
        ...names.map((_, player) => round ? counted(round, player) : ""), ...(round?.points ?? names.map(() => ""))];
    }),
    ["Total", "", "", ...names.map((_, player) => rounds.reduce((sum, round) => sum + counted(round, player), 0))]
  ];
  return rows.map(row => row.map(value => {
    const text = String(value);
    const safe = typeof value === "string" && /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  }).join(",")).join("\r\n");
}

byId("download").onclick = () => {
  const link = element("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff", spreadsheet(match)], { type: "text/csv;charset=utf-8" }));
  link.download = "continental-scorecard.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};


const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const mic = byId("mic");
const micLabel = byId("mic-label");
const micStatus = byId("mic-status");
const micLevel = byId("mic-level");
const dictation = byId("dictation");
const keyboardFallback = "You can use the microphone on your keyboard or type the scores.";
let voiceSession = null;

function finishVoice(session, message) {
  if (voiceSession !== session) return;
  voiceSession = null;
  clearTimeout(session.timeout);
  micLevel.value = 0;
  mic.removeAttribute("data-listening");
  micLabel.textContent = "Tap to speak";
  micStatus.textContent = message;
  dictation.readOnly = false;
  byId("review").disabled = byId("save").disabled = false;
}

function cancelVoice() {
  const session = voiceSession;
  if (!session) return;
  finishVoice(session, "Spanish dictation");
  session.recognition.abort();
}

mic.onclick = () => {
  if (!SpeechRecognition) {
    micStatus.textContent = "Direct dictation is unavailable. " + keyboardFallback;
    dictation.focus();
    return;
  }
  if (voiceSession) {
    if (voiceSession.stopping) return;
    const session = voiceSession;
    session.stopping = true;
    micStatus.textContent = "Finishing dictation…";
    try { session.recognition.stop(); } catch { cancelVoice(); }
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "es-US";
  recognition.interimResults = true;
  recognition.continuous = true;
  const original = dictation.value.trim();
  const session = { recognition, heard: false, retried: false };
  voiceSession = session;
  dictation.readOnly = true;
  byId("review").disabled = byId("save").disabled = true;
  mic.setAttribute("data-listening", "");
  micLabel.textContent = "Stop listening";
  micStatus.textContent = "Starting microphone…";
  function showActivity(value) {
    if (voiceSession === session && !session.stopping) micLevel.value = value;
  }
  recognition.onaudiostart = () => showActivity(18);
  recognition.onsoundstart = () => showActivity(48);
  recognition.onspeechstart = () => showActivity(100);
  recognition.onspeechend = () => showActivity(48);
  recognition.onsoundend = () => showActivity(18);
  recognition.onaudioend = () => showActivity(0);
  recognition.onstart = () => {
    if (voiceSession === session) micStatus.textContent = "Listening… Say each name and score.";
  };
  recognition.onresult = event => {
    if (voiceSession !== session) return;
    const spoken = Array.from(event.results, result => result[0].transcript.trim()).filter(Boolean).join(" ");
    session.heard = Boolean(spoken);
    dictation.value = [original, spoken].filter(Boolean).join(" ");
  };
  recognition.onerror = event => {
    if (event.error === "no-speech") return;
    const message = event.error === "not-allowed" || event.error === "service-not-allowed"
      ? "Microphone access is unavailable."
      : "Dictation was interrupted.";
    finishVoice(session, message + " " + keyboardFallback);
  };
  recognition.onend = () => {
    if (voiceSession !== session) return;
    if (!session.heard && !session.stopping && !session.retried) {
      session.retried = true;
      micStatus.textContent = "Reconnecting microphone…";
      try {
        recognition.start();
        return;
      } catch {
        // Some browsers require another tap to restart recognition.
      }
    }
    finishVoice(session, session.heard
      ? "Transcript ready. Review the spoken scores."
      : "No speech detected. Tap to try again. " + keyboardFallback);
  };
  try {
    recognition.start();
    session.timeout = setTimeout(() => {
      finishVoice(session, session.heard ? "Transcript ready. Review the spoken scores." : "Dictation timed out. " + keyboardFallback);
      recognition.abort();
    }, 45000);
  } catch {
    finishVoice(session, "Could not start dictation. " + keyboardFallback);
  }
};
if (!SpeechRecognition) micStatus.textContent = "Use keyboard dictation on this browser.";
window.addEventListener("pagehide", cancelVoice);

render();
