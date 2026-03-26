(() => {
  "use strict";

  /* ── DOM refs ─────────────────────────────────────── */
  const slider      = document.getElementById("distSlider");
  const distReadout = document.getElementById("distReadout");
  const arrowLabel  = document.getElementById("arrowLabel");
  const statusChip  = document.getElementById("statusChip");
  const pedestrian  = document.getElementById("pedestrian");
  const distArrow   = document.getElementById("distArrow");
  const infoTitle   = document.getElementById("infoTitle");
  const infoBody    = document.getElementById("infoBody");
  const copyBtn     = document.getElementById("copyBtn");

  const compNodes = document.querySelectorAll(".comp-node");

  /* ── Component Data (description + real Arduino code) */
  const COMPONENTS = {
    sensor: {
      name: "Ultrasonic Sensor – HC-SR04",
      desc: `The HC-SR04 ultrasonic sensor sends a 40 kHz pulse and measures the time it takes for the echo to return.  By timing this round-trip, the Arduino calculates the distance to the nearest obstacle (pedestrian).  This module is mounted at the front of the forklift and continuously scans the path ahead.`,
      code:
`<span class="cm">// ── HC-SR04 Ultrasonic Sensor ──────────────────</span>
<span class="pp">#define</span> TRIG_PIN  <span class="nu">9</span>
<span class="pp">#define</span> ECHO_PIN  <span class="nu">10</span>

<span class="tp">void</span> <span class="fn">setupSensor</span>() {
  <span class="fn">pinMode</span>(TRIG_PIN, <span class="kw">OUTPUT</span>);
  <span class="fn">pinMode</span>(ECHO_PIN, <span class="kw">INPUT</span>);
}

<span class="cm">// Returns distance in metres</span>
<span class="tp">float</span> <span class="fn">getDistanceMetres</span>() {
  <span class="fn">digitalWrite</span>(TRIG_PIN, <span class="kw">LOW</span>);
  <span class="fn">delayMicroseconds</span>(<span class="nu">2</span>);
  <span class="fn">digitalWrite</span>(TRIG_PIN, <span class="kw">HIGH</span>);
  <span class="fn">delayMicroseconds</span>(<span class="nu">10</span>);
  <span class="fn">digitalWrite</span>(TRIG_PIN, <span class="kw">LOW</span>);

  <span class="tp">long</span> duration = <span class="fn">pulseIn</span>(ECHO_PIN, <span class="kw">HIGH</span>);
  <span class="tp">float</span> cm = (duration * <span class="nu">0.0343</span>) / <span class="nu">2.0</span>;
  <span class="kw">return</span> cm / <span class="nu">100.0</span>;          <span class="cm">// cm → m</span>
}`
    },

    motor: {
      name: "DC Motor + Relay Module",
      desc: `The forklift's drive motor is controlled through a relay module wired to the Arduino.  When the relay is energised, the motor runs normally.  As soon as a pedestrian is detected within 2 m, the Arduino de-energises the relay, cutting power to the motor and bringing the forklift to a halt.`,
      code:
`<span class="cm">// ── Motor / Relay Control ──────────────────────</span>
<span class="pp">#define</span> MOTOR_RELAY_PIN  <span class="nu">7</span>
<span class="tp">bool</span> motorRunning = <span class="kw">true</span>;

<span class="tp">void</span> <span class="fn">setupMotor</span>() {
  <span class="fn">pinMode</span>(MOTOR_RELAY_PIN, <span class="kw">OUTPUT</span>);
  <span class="fn">digitalWrite</span>(MOTOR_RELAY_PIN, <span class="kw">LOW</span>);  <span class="cm">// relay ON</span>
}

<span class="tp">void</span> <span class="fn">stopMotor</span>() {
  <span class="kw">if</span> (motorRunning) {
    <span class="fn">digitalWrite</span>(MOTOR_RELAY_PIN, <span class="kw">HIGH</span>); <span class="cm">// relay OFF</span>
    motorRunning = <span class="kw">false</span>;
    Serial.<span class="fn">println</span>(<span class="st">"⚠  MOTOR STOPPED"</span>);
  }
}

<span class="tp">void</span> <span class="fn">startMotor</span>() {
  <span class="kw">if</span> (!motorRunning) {
    <span class="fn">digitalWrite</span>(MOTOR_RELAY_PIN, <span class="kw">LOW</span>);
    motorRunning = <span class="kw">true</span>;
    Serial.<span class="fn">println</span>(<span class="st">"✓  Motor resumed"</span>);
  }
}`
    },

    buzzer: {
      name: "Piezo Buzzer – Alarm Output",
      desc: `A piezo buzzer provides an audible warning when a pedestrian is too close.  When the measured distance drops below 2 m the Arduino drives the buzzer at 1 kHz.  The alarm ceases automatically once the path is clear again.`,
      code:
`<span class="cm">// ── Piezo Buzzer ───────────────────────────────</span>
<span class="pp">#define</span> BUZZER_PIN  <span class="nu">8</span>
<span class="tp">bool</span> alarmOn = <span class="kw">false</span>;

<span class="tp">void</span> <span class="fn">setupBuzzer</span>() {
  <span class="fn">pinMode</span>(BUZZER_PIN, <span class="kw">OUTPUT</span>);
  <span class="fn">digitalWrite</span>(BUZZER_PIN, <span class="kw">LOW</span>);
}

<span class="tp">void</span> <span class="fn">triggerAlarm</span>() {
  <span class="kw">if</span> (!alarmOn) {
    <span class="fn">tone</span>(BUZZER_PIN, <span class="nu">1000</span>);  <span class="cm">// 1 kHz</span>
    alarmOn = <span class="kw">true</span>;
  }
}

<span class="tp">void</span> <span class="fn">stopAlarm</span>() {
  <span class="kw">if</span> (alarmOn) {
    <span class="fn">noTone</span>(BUZZER_PIN);
    alarmOn = <span class="kw">false</span>;
  }
}`
    },

    board: {
      name: "Arduino UNO – Main Loop",
      desc: `The Arduino UNO is the brain of the system.  In setup() it initialises Serial, the sensor, motor relay and buzzer.  The loop() function reads the distance ten times a second; if the value falls below 2.0 m the motor is cut and the alarm sounds.`,
      code:
`<span class="cm">// ── Arduino Main Program ───────────────────────</span>
<span class="pp">#include</span> <span class="st">"sensor.h"</span>
<span class="pp">#include</span> <span class="st">"motor.h"</span>
<span class="pp">#include</span> <span class="st">"buzzer.h"</span>

<span class="pp">#define</span> SAFE_DISTANCE  <span class="nu">2.0</span>   <span class="cm">// metres</span>

<span class="tp">void</span> <span class="fn">setup</span>() {
  Serial.<span class="fn">begin</span>(<span class="nu">9600</span>);
  <span class="fn">setupSensor</span>();
  <span class="fn">setupMotor</span>();
  <span class="fn">setupBuzzer</span>();
  Serial.<span class="fn">println</span>(<span class="st">"Safety system ready."</span>);
}

<span class="tp">void</span> <span class="fn">loop</span>() {
  <span class="tp">float</span> dist = <span class="fn">getDistanceMetres</span>();

  <span class="kw">if</span> (dist > <span class="nu">0</span> && dist < SAFE_DISTANCE) {
    <span class="cm">// ⚠ Pedestrian too close!</span>
    <span class="fn">stopMotor</span>();
    <span class="fn">triggerAlarm</span>();
  } <span class="kw">else</span> {
    <span class="fn">startMotor</span>();
    <span class="fn">stopAlarm</span>();
  }

  <span class="fn">delay</span>(<span class="nu">100</span>);  <span class="cm">// 10 Hz scan rate</span>
}`
    }
  };

  /* ── Helpers ──────────────────────────────────────── */
  let selectedKey = null;

  /** Map distance (0.2 → 10) to pedestrian left% (22 → 88) */
  function distToLeft(d) {
    return 22 + ((d - 0.2) / 9.8) * 66;
  }

  /* ── Render Code Panel ────────────────────────────── */
  function showInfo(key) {
    const c = COMPONENTS[key];
    infoTitle.textContent = c.name;
    copyBtn.style.display = "inline-flex";
    infoBody.innerHTML = `
      <div class="info-section">
        <h3>What it does</h3>
        <p>${c.desc}</p>
      </div>
      <div class="info-section">
        <h3>Arduino / C++ Code</h3>
        <div class="code-block" id="codeBlock">${c.code}</div>
      </div>`;
  }

  /* ── Copy button ──────────────────────────────────── */
  copyBtn.addEventListener("click", () => {
    const block = document.getElementById("codeBlock");
    if (!block) return;
    const text = block.innerText;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.querySelector("span").textContent = "Copied!";
      setTimeout(() => (copyBtn.querySelector("span").textContent = "Copy"), 1500);
    });
  });

  /* ── Component Click ──────────────────────────────── */
  compNodes.forEach(node => {
    node.addEventListener("click", () => {
      compNodes.forEach(n => n.classList.remove("active"));
      node.classList.add("active");
      selectedKey = node.dataset.component;
      showInfo(selectedKey);
    });
  });

  /* ── Simulation Update ────────────────────────────── */
  function update(dist) {
    /* readouts */
    distReadout.textContent = dist.toFixed(1) + " m";
    arrowLabel.textContent  = dist.toFixed(1) + " m";

    /* pedestrian position */
    const pLeft = distToLeft(dist);
    pedestrian.style.left = pLeft + "%";

    /* arrow between forklift front and pedestrian */
    const arrowStart = 18; // roughly forklift front %
    distArrow.style.left  = arrowStart + "%";
    distArrow.style.width = Math.max(0, pLeft - arrowStart) + "%";

    /* danger state */
    const danger = dist < 2.0;
    document.body.classList.toggle("danger", danger);

    if (danger) {
      statusChip.textContent = "⚠ DANGER – MOTOR STOPPED";
      statusChip.className = "chip chip--danger";
    } else {
      statusChip.textContent = "SAFE";
      statusChip.className = "chip chip--safe";
    }
  }

  /* ── Slider Events ────────────────────────────────── */
  slider.addEventListener("input", () => update(parseFloat(slider.value)));

  /* ── Init ─────────────────────────────────────────── */
  update(parseFloat(slider.value));
})();
