// ===== SMART PARKING SYSTEM IoT SIMULATION =====

(function () {
  'use strict';

  // ===== STATE =====
  const state = {
    spots: [false, false, false, false], // false = available, true = occupied
    totalSpots: 4,
    autoRunning: false,
    autoTimer: null,
    entryOpen: false,
    exitOpen: false,
  };

  // ===== DOM REFS =====
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const dom = {
    lcdRow1: $('#lcdRow1'),
    lcdRow2: $('#lcdRow2'),
    serialOutput: $('#serialOutput'),
    entryArm: $('#entryArm'),
    exitArm: $('#exitArm'),
    pirEntryLens: $('#pirEntryLens'),
    pirExitLens: $('#pirExitLens'),
    ledPower: $('#ledPower'),
    ledEntry: $('#ledEntry'),
    ledExit: $('#ledExit'),
    ledServo: $('#ledServo'),
    autoBtn: $('#autoBtn'),
    stopBtn: $('#stopBtn'),
    resetBtn: $('#resetBtn'),
    clearSerial: $('#clearSerial'),
    copyCode: $('#copyCode'),
    animatedCar: $('#animatedCar'),
    circuitCanvas: $('#circuitCanvas'),
    arduinoCode: $('#arduinoCode'),
    hwCards: $('#hwCards'),
  };

  // ===== SERIAL MONITOR =====
  function serialPrint(msg, type = '') {
    const ts = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.innerHTML = `<span class="timestamp">[${ts}]</span> <span class="${type}">${msg}</span>`;
    dom.serialOutput.appendChild(line);
    dom.serialOutput.scrollTop = dom.serialOutput.scrollHeight;
  }

  // ===== LCD UPDATE =====
  function updateLCD() {
    const free = state.totalSpots - state.spots.filter(Boolean).length;
    dom.lcdRow1.textContent = `Spots Free:  ${free}/${state.totalSpots}`;
    if (free === 0) {
      dom.lcdRow2.textContent = 'Status: FULL    ';
    } else if (state.autoRunning) {
      dom.lcdRow2.textContent = 'Status: ACTIVE  ';
    } else {
      dom.lcdRow2.textContent = 'Status: READY   ';
    }
  }

  // ===== SPOT MANAGEMENT =====
  function updateSpotUI(index) {
    const spotEl = $(`#spot${index + 1}`);
    const occupied = state.spots[index];
    spotEl.classList.toggle('occupied', occupied);
    spotEl.classList.toggle('available', !occupied);
  }

  function toggleSpot(index) {
    const wasOccupied = state.spots[index];
    state.spots[index] = !wasOccupied;
    updateSpotUI(index);
    updateLCD();

    if (wasOccupied) {
      serialPrint(`PIR Sensor ${index + 1}: Motion cleared — Spot P${index + 1} now <b>AVAILABLE</b>`);
      serialPrint(`LED ${index + 1}: Switched to GREEN`, '');
    } else {
      serialPrint(`PIR Sensor ${index + 1}: Motion detected — Spot P${index + 1} now <b>OCCUPIED</b>`, 'warning');
      serialPrint(`LED ${index + 1}: Switched to RED`, 'warning');
    }
  }

  // ===== GATE OPERATIONS =====
  function openGate(gate) {
    const arm = gate === 'entry' ? dom.entryArm : dom.exitArm;
    const lens = gate === 'entry' ? dom.pirEntryLens : dom.pirExitLens;
    const ledEl = gate === 'entry' ? dom.ledEntry : dom.ledExit;
    
    arm.classList.add('open');
    lens.classList.add('active');
    ledEl.classList.add('led-active');
    dom.ledServo.classList.add('led-servo');
    
    if (gate === 'entry') state.entryOpen = true;
    else state.exitOpen = true;

    serialPrint(`${gate.toUpperCase()} PIR: Motion detected — Opening ${gate} gate`, 'warning');
    serialPrint(`Servo (${gate}): Rotating to 90° — Barrier OPEN`, '');
  }

  function closeGate(gate) {
    const arm = gate === 'entry' ? dom.entryArm : dom.exitArm;
    const lens = gate === 'entry' ? dom.pirEntryLens : dom.pirExitLens;
    const ledEl = gate === 'entry' ? dom.ledEntry : dom.ledExit;
    
    arm.classList.remove('open');
    lens.classList.remove('active');
    ledEl.classList.remove('led-active');
    
    if (gate === 'entry') state.entryOpen = false;
    else state.exitOpen = false;

    if (!state.entryOpen && !state.exitOpen) {
      dom.ledServo.classList.remove('led-servo');
    }

    serialPrint(`${gate.toUpperCase()} PIR: Motion cleared — Closing ${gate} gate`, '');
    serialPrint(`Servo (${gate}): Rotating to 0° — Barrier CLOSED`, '');
  }

  // ===== ANIMATED CAR ENTRY SEQUENCE =====
  function animateCarEntry(spotIndex) {
    return new Promise((resolve) => {
      const car = dom.animatedCar;
      const lot = $('#parkingLot');
      const lotRect = lot.getBoundingClientRect();

      car.classList.add('visible');
      car.style.left = '-80px';
      car.style.bottom = '60px';

      // Step 1: Car approaches entry
      setTimeout(() => {
        car.style.transition = 'left 1s ease-in-out';
        car.style.left = '60px';
      }, 100);

      // Step 2: Entry gate opens
      setTimeout(() => {
        openGate('entry');
      }, 600);

      // Step 3: Car passes through
      setTimeout(() => {
        car.style.left = (lotRect.width / 2 - 30) + 'px';
      }, 1500);

      // Step 4: Close entry gate, toggle spot
      setTimeout(() => {
        closeGate('entry');
        toggleSpot(spotIndex);
      }, 2500);

      // Step 5: Car disappears (parked)
      setTimeout(() => {
        car.classList.remove('visible');
        car.style.transition = 'none';
        car.style.left = '-80px';
        resolve();
      }, 3200);
    });
  }

  // ===== ANIMATED CAR EXIT SEQUENCE =====
  function animateCarExit(spotIndex) {
    return new Promise((resolve) => {
      const car = dom.animatedCar;
      const lot = $('#parkingLot');
      const lotRect = lot.getBoundingClientRect();

      toggleSpot(spotIndex);

      car.style.transition = 'none';
      car.style.left = (lotRect.width / 2 - 30) + 'px';
      car.style.bottom = '20px';
      car.classList.add('visible');

      // Step 1: Open exit gate
      setTimeout(() => {
        openGate('exit');
      }, 300);

      // Step 2: Car moves to exit
      setTimeout(() => {
        car.style.transition = 'left 1.2s ease-in-out';
        car.style.left = (lotRect.width + 80) + 'px';
      }, 800);

      // Step 3: Close exit gate
      setTimeout(() => {
        closeGate('exit');
      }, 2200);

      // Step 4: Clean up
      setTimeout(() => {
        car.classList.remove('visible');
        car.style.transition = 'none';
        car.style.left = '-80px';
        resolve();
      }, 2800);
    });
  }

  // ===== AUTO SIMULATION =====
  let autoQueue = [];
  let autoProcessing = false;

  function autoSimStep() {
    if (!state.autoRunning) return;

    const free = state.spots.map((occ, i) => (!occ ? i : -1)).filter(i => i !== -1);
    const occupied = state.spots.map((occ, i) => (occ ? i : -1)).filter(i => i !== -1);

    // 70% chance to park if spots available, 30% chance to leave if occupied
    const shouldPark = free.length > 0 && (occupied.length === 0 || Math.random() < 0.7);
    
    if (shouldPark && free.length > 0) {
      const spot = free[Math.floor(Math.random() * free.length)];
      autoProcessing = true;
      animateCarEntry(spot).then(() => {
        autoProcessing = false;
        if (state.autoRunning) {
          state.autoTimer = setTimeout(autoSimStep, 2000 + Math.random() * 3000);
        }
      });
    } else if (occupied.length > 0) {
      const spot = occupied[Math.floor(Math.random() * occupied.length)];
      autoProcessing = true;
      animateCarExit(spot).then(() => {
        autoProcessing = false;
        if (state.autoRunning) {
          state.autoTimer = setTimeout(autoSimStep, 2000 + Math.random() * 3000);
        }
      });
    } else {
      state.autoTimer = setTimeout(autoSimStep, 2000);
    }
  }

  function startAutoSim() {
    state.autoRunning = true;
    dom.autoBtn.disabled = true;
    dom.stopBtn.disabled = false;
    updateLCD();
    serialPrint('=== AUTO SIMULATION STARTED ===', 'warning');
    serialPrint('System initialized — Monitoring all PIR sensors...', '');
    autoSimStep();
  }

  function stopAutoSim() {
    state.autoRunning = false;
    clearTimeout(state.autoTimer);
    dom.autoBtn.disabled = false;
    dom.stopBtn.disabled = true;
    updateLCD();
    serialPrint('=== AUTO SIMULATION STOPPED ===', 'error');
  }

  function resetAll() {
    stopAutoSim();
    state.spots = [false, false, false, false];
    state.entryOpen = false;
    state.exitOpen = false;
    for (let i = 0; i < 4; i++) updateSpotUI(i);
    dom.entryArm.classList.remove('open');
    dom.exitArm.classList.remove('open');
    dom.pirEntryLens.classList.remove('active');
    dom.pirExitLens.classList.remove('active');
    dom.ledEntry.classList.remove('led-active');
    dom.ledExit.classList.remove('led-active');
    dom.ledServo.classList.remove('led-servo');
    dom.animatedCar.classList.remove('visible');
    updateLCD();
    dom.serialOutput.innerHTML = '';
    serialPrint('=== SYSTEM RESET ===', '');
    serialPrint('Smart Parking System v1.0 — Ready', '');
  }

  // ===== EVENT LISTENERS =====
  dom.autoBtn.addEventListener('click', startAutoSim);
  dom.stopBtn.addEventListener('click', stopAutoSim);
  dom.resetBtn.addEventListener('click', resetAll);
  dom.clearSerial.addEventListener('click', () => {
    dom.serialOutput.innerHTML = '';
  });

  // Click spots to toggle
  $$('.parking-spot').forEach((spot) => {
    spot.addEventListener('click', () => {
      if (autoProcessing) return;
      const idx = parseInt(spot.dataset.spot) - 1;
      toggleSpot(idx);
    });
  });

  // ===== TABS =====
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.tab-content').forEach(tc => tc.classList.add('hidden'));
      const target = tab.dataset.tab;
      if (target === 'circuit') $('#circuitTab').classList.remove('hidden');
      else if (target === 'code') $('#codeTab').classList.remove('hidden');
      else if (target === 'hardware') $('#hardwareTab').classList.remove('hidden');
    });
  });

  // ===== COPY CODE =====
  dom.copyCode.addEventListener('click', () => {
    const code = dom.arduinoCode.textContent;
    navigator.clipboard.writeText(code).then(() => {
      dom.copyCode.textContent = '✅ Copied!';
      setTimeout(() => dom.copyCode.textContent = '📋 Copy Code', 2000);
    });
  });

  // ===== CIRCUIT DIAGRAM (Canvas) =====
  function drawCircuit() {
    const canvas = dom.circuitCanvas;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0a0f1c';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#1a2040';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Title
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Smart Parking System — Circuit Diagram', W / 2, 25);

    // ===== Arduino Uno =====
    const ax = 190, ay = 80, aw = 180, ah = 100;
    ctx.fillStyle = '#1e3a5f';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    roundRect(ctx, ax, ay, aw, ah, 8);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('ARDUINO UNO R3', ax + aw / 2, ay + 20);

    // Pin labels
    ctx.font = '9px JetBrains Mono';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    const leftPins = ['5V', 'GND', 'A4(SDA)', 'A5(SCL)'];
    leftPins.forEach((p, i) => {
      ctx.fillText(p, ax + 8, ay + 38 + i * 15);
      // pin dot
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(ax, ay + 35 + i * 15, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#94a3b8';
    });

    ctx.textAlign = 'right';
    const rightPins = ['D2', 'D3', 'D4', 'D5'];
    rightPins.forEach((p, i) => {
      ctx.fillText(p, ax + aw - 8, ay + 38 + i * 15);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath(); ctx.arc(ax + aw, ay + 35 + i * 15, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#94a3b8';
    });

    // More pins on bottom
    ctx.textAlign = 'center';
    const bottomPins = ['D6', 'D7', 'D8', 'D9'];
    bottomPins.forEach((p, i) => {
      const px = ax + 30 + i * 40;
      ctx.fillText(p, px, ay + ah + 15);
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath(); ctx.arc(px, ay + ah, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#94a3b8';
    });

    // ===== PIR Sensors (Spots) =====
    const pirData = [
      { x: 50, y: 260, label: 'PIR 1 (Spot P1)', pin: 'D2', color: '#ef4444' },
      { x: 200, y: 260, label: 'PIR 2 (Spot P2)', pin: 'D3', color: '#ef4444' },
      { x: 350, y: 260, label: 'PIR 3 (Spot P3)', pin: 'D4', color: '#ef4444' },
      { x: 500, y: 260, label: 'PIR 4 (Spot P4)', pin: 'D5', color: '#ef4444' },
    ];

    pirData.forEach((pir) => {
      // PIR body
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = pir.color;
      ctx.lineWidth = 2;
      roundRect(ctx, pir.x - 35, pir.y, 70, 50, 6);
      ctx.fill(); ctx.stroke();

      // Dome
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pir.x, pir.y + 18, 14, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(pir.label, pir.x, pir.y + 42);
      ctx.fillText(pir.pin, pir.x, pir.y + 55);

      // Wire to Arduino
      ctx.strokeStyle = pir.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(pir.x, pir.y);
      ctx.lineTo(pir.x, ay + ah + 30);
      ctx.lineTo(ax + aw / 2, ay + ah + 30);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ===== PIR Sensors (Entry/Exit) =====
    const gatePirs = [
      { x: 80, y: 400, label: 'PIR Entry', pin: 'D6', color: '#f59e0b' },
      { x: 480, y: 400, label: 'PIR Exit', pin: 'D7', color: '#f59e0b' },
    ];

    gatePirs.forEach((pir) => {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = pir.color;
      ctx.lineWidth = 2;
      roundRect(ctx, pir.x - 35, pir.y, 70, 50, 6);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pir.x, pir.y + 18, 14, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(pir.label, pir.x, pir.y + 42);
      ctx.fillText(pir.pin, pir.x, pir.y + 55);

      // Wire
      ctx.strokeStyle = pir.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(pir.x, pir.y);
      ctx.lineTo(pir.x, ay + ah + 50);
      ctx.lineTo(ax + aw / 2, ay + ah + 50);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ===== Servo Motors =====
    const servos = [
      { x: 80, y: 510, label: 'Servo Entry', pin: 'D8', color: '#a78bfa' },
      { x: 480, y: 510, label: 'Servo Exit', pin: 'D9', color: '#a78bfa' },
    ];

    servos.forEach((sv) => {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = sv.color;
      ctx.lineWidth = 2;
      roundRect(ctx, sv.x - 35, sv.y, 70, 45, 6);
      ctx.fill(); ctx.stroke();

      // Servo horn
      ctx.fillStyle = sv.color;
      ctx.beginPath();
      ctx.arc(sv.x, sv.y + 15, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0f1c';
      ctx.beginPath();
      ctx.arc(sv.x, sv.y + 15, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(sv.label, sv.x, sv.y + 35);
      ctx.fillText(sv.pin, sv.x, sv.y + 48);

      // Wire
      ctx.strokeStyle = sv.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(sv.x, sv.y);
      ctx.lineTo(sv.x, ay + ah + 40);
      ctx.lineTo(ax + aw / 2 + 20, ay + ah + 40);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // ===== LCD Display =====
    const lx = 200, ly = 590;
    ctx.fillStyle = '#0c2d0c';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    roundRect(ctx, lx, ly, 160, 55, 6);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#39ff14';
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('16x2 LCD (I2C)', lx + 80, ly + 20);
    ctx.font = '8px JetBrains Mono';
    ctx.fillText('SDA → A4  |  SCL → A5', lx + 80, ly + 35);
    ctx.fillText('VCC → 5V  |  GND → GND', lx + 80, ly + 47);

    // Wire to Arduino
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(lx + 80, ly);
    ctx.lineTo(lx + 80, ay + ah + 60);
    ctx.lineTo(ax + aw / 2 - 20, ay + ah + 60);
    ctx.stroke();
    ctx.setLineDash([]);

    // ===== LEDs =====
    const ledPositions = [
      { x: 130, y: 330, label: 'LED 1', color: '#22c55e' },
      { x: 240, y: 330, label: 'LED 2', color: '#22c55e' },
      { x: 350, y: 330, label: 'LED 3', color: '#22c55e' },
      { x: 460, y: 330, label: 'LED 4', color: '#22c55e' },
    ];

    ledPositions.forEach((led) => {
      // LED body
      ctx.fillStyle = led.color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(led.x, led.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = led.color;
      ctx.beginPath();
      ctx.arc(led.x, led.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Resistor
      ctx.fillStyle = '#94a3b8';
      ctx.font = '7px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(led.label, led.x, led.y + 20);
      ctx.fillText('220Ω', led.x, led.y + 28);
    });

    // ===== Power Rails =====
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, ay + 35);
    ctx.lineTo(ax, ay + 35);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = '9px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText('5V', 10, ay + 38);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, ay + 50);
    ctx.lineTo(ax, ay + 50);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.fillText('GND', 10, ay + 53);

    // ===== Legend =====
    ctx.fillStyle = '#4a5580';
    ctx.font = '8px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Dashed lines = signal wires', 10, H - 25);
    ctx.fillText('Dots = pin connections', 10, H - 12);

    // Note
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 9px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Tinkercad-compatible circuit — Use HC-SR501 PIR sensors', W / 2, H - 8);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ===== ARDUINO CODE =====
  function loadArduinoCode() {
    const code = `<span class="cmt">// ======================================</span>
<span class="cmt">// Smart Parking System using PIR Sensors</span>
<span class="cmt">// Simulated on Tinkercad</span>
<span class="cmt">// ======================================</span>

<span class="pp">#include</span> <span class="str">&lt;Servo.h&gt;</span>
<span class="pp">#include</span> <span class="str">&lt;LiquidCrystal_I2C.h&gt;</span>
<span class="pp">#include</span> <span class="str">&lt;Wire.h&gt;</span>

<span class="cmt">// ===== PIN DEFINITIONS =====</span>
<span class="cmt">// PIR Sensors for parking spots</span>
<span class="kw">const</span> <span class="type">int</span> pirSpot1 = <span class="num">2</span>;
<span class="kw">const</span> <span class="type">int</span> pirSpot2 = <span class="num">3</span>;
<span class="kw">const</span> <span class="type">int</span> pirSpot3 = <span class="num">4</span>;
<span class="kw">const</span> <span class="type">int</span> pirSpot4 = <span class="num">5</span>;

<span class="cmt">// PIR Sensors for entry/exit gates</span>
<span class="kw">const</span> <span class="type">int</span> pirEntry = <span class="num">6</span>;
<span class="kw">const</span> <span class="type">int</span> pirExit  = <span class="num">7</span>;

<span class="cmt">// Servo motors for barrier gates</span>
<span class="kw">const</span> <span class="type">int</span> servoEntryPin = <span class="num">8</span>;
<span class="kw">const</span> <span class="type">int</span> servoExitPin  = <span class="num">9</span>;

<span class="cmt">// LED indicators for each spot</span>
<span class="kw">const</span> <span class="type">int</span> ledSpot1 = <span class="num">10</span>;
<span class="kw">const</span> <span class="type">int</span> ledSpot2 = <span class="num">11</span>;
<span class="kw">const</span> <span class="type">int</span> ledSpot3 = <span class="num">12</span>;
<span class="kw">const</span> <span class="type">int</span> ledSpot4 = <span class="num">13</span>;

<span class="cmt">// ===== OBJECTS =====</span>
<span class="type">Servo</span> entryServo;
<span class="type">Servo</span> exitServo;
<span class="type">LiquidCrystal_I2C</span> <span class="fn">lcd</span>(<span class="num">0x27</span>, <span class="num">16</span>, <span class="num">2</span>);

<span class="cmt">// ===== VARIABLES =====</span>
<span class="kw">const</span> <span class="type">int</span> TOTAL_SPOTS = <span class="num">4</span>;
<span class="type">bool</span> spotOccupied[TOTAL_SPOTS] = {<span class="kw">false</span>};
<span class="type">int</span> pirSpotPins[] = {pirSpot1, pirSpot2, pirSpot3, pirSpot4};
<span class="type">int</span> ledPins[]     = {ledSpot1, ledSpot2, ledSpot3, ledSpot4};
<span class="type">int</span> freeSpots = TOTAL_SPOTS;

<span class="kw">unsigned long</span> lastEntryTime = <span class="num">0</span>;
<span class="kw">unsigned long</span> lastExitTime  = <span class="num">0</span>;
<span class="kw">const</span> <span class="kw">unsigned long</span> GATE_DELAY = <span class="num">3000</span>; <span class="cmt">// 3s gate open duration</span>

<span class="kw">void</span> <span class="fn">setup</span>() {
  <span class="fn">Serial.begin</span>(<span class="num">9600</span>);
  <span class="fn">Serial.println</span>(<span class="str">"Smart Parking System v1.0"</span>);
  <span class="fn">Serial.println</span>(<span class="str">"========================"</span>);

  <span class="cmt">// Initialize PIR sensor pins</span>
  <span class="kw">for</span> (<span class="type">int</span> i = <span class="num">0</span>; i &lt; TOTAL_SPOTS; i++) {
    <span class="fn">pinMode</span>(pirSpotPins[i], <span class="num">INPUT</span>);
    <span class="fn">pinMode</span>(ledPins[i], <span class="num">OUTPUT</span>);
    <span class="fn">digitalWrite</span>(ledPins[i], <span class="num">HIGH</span>); <span class="cmt">// GREEN = available</span>
  }

  <span class="fn">pinMode</span>(pirEntry, <span class="num">INPUT</span>);
  <span class="fn">pinMode</span>(pirExit, <span class="num">INPUT</span>);

  <span class="cmt">// Initialize servos (barrier gates)</span>
  entryServo.<span class="fn">attach</span>(servoEntryPin);
  exitServo.<span class="fn">attach</span>(servoExitPin);
  entryServo.<span class="fn">write</span>(<span class="num">0</span>);  <span class="cmt">// Gate closed</span>
  exitServo.<span class="fn">write</span>(<span class="num">0</span>);   <span class="cmt">// Gate closed</span>

  <span class="cmt">// Initialize LCD</span>
  lcd.<span class="fn">init</span>();
  lcd.<span class="fn">backlight</span>();
  lcd.<span class="fn">setCursor</span>(<span class="num">0</span>, <span class="num">0</span>);
  lcd.<span class="fn">print</span>(<span class="str">"Spots Free:  4/4"</span>);
  lcd.<span class="fn">setCursor</span>(<span class="num">0</span>, <span class="num">1</span>);
  lcd.<span class="fn">print</span>(<span class="str">"Status: READY   "</span>);

  <span class="fn">Serial.println</span>(<span class="str">"System initialized."</span>);
  <span class="fn">Serial.println</span>(<span class="str">"Waiting for PIR sensors to calibrate..."</span>);
  <span class="fn">delay</span>(<span class="num">2000</span>); <span class="cmt">// PIR warm-up time</span>
  <span class="fn">Serial.println</span>(<span class="str">"System READY."</span>);
}

<span class="kw">void</span> <span class="fn">loop</span>() {
  <span class="cmt">// ===== CHECK PARKING SPOT SENSORS =====</span>
  freeSpots = <span class="num">0</span>;
  <span class="kw">for</span> (<span class="type">int</span> i = <span class="num">0</span>; i &lt; TOTAL_SPOTS; i++) {
    <span class="type">int</span> pirState = <span class="fn">digitalRead</span>(pirSpotPins[i]);

    <span class="kw">if</span> (pirState == <span class="num">HIGH</span> &amp;&amp; !spotOccupied[i]) {
      spotOccupied[i] = <span class="kw">true</span>;
      <span class="fn">digitalWrite</span>(ledPins[i], <span class="num">LOW</span>); <span class="cmt">// RED = occupied</span>
      <span class="fn">Serial.print</span>(<span class="str">"Spot P"</span>);
      <span class="fn">Serial.print</span>(i + <span class="num">1</span>);
      <span class="fn">Serial.println</span>(<span class="str">": OCCUPIED"</span>);
    }
    <span class="kw">else if</span> (pirState == <span class="num">LOW</span> &amp;&amp; spotOccupied[i]) {
      spotOccupied[i] = <span class="kw">false</span>;
      <span class="fn">digitalWrite</span>(ledPins[i], <span class="num">HIGH</span>); <span class="cmt">// GREEN = available</span>
      <span class="fn">Serial.print</span>(<span class="str">"Spot P"</span>);
      <span class="fn">Serial.print</span>(i + <span class="num">1</span>);
      <span class="fn">Serial.println</span>(<span class="str">": AVAILABLE"</span>);
    }

    <span class="kw">if</span> (!spotOccupied[i]) freeSpots++;
  }

  <span class="cmt">// ===== UPDATE LCD =====</span>
  lcd.<span class="fn">setCursor</span>(<span class="num">0</span>, <span class="num">0</span>);
  lcd.<span class="fn">print</span>(<span class="str">"Spots Free:  "</span>);
  lcd.<span class="fn">print</span>(freeSpots);
  lcd.<span class="fn">print</span>(<span class="str">"/"</span>);
  lcd.<span class="fn">print</span>(TOTAL_SPOTS);

  lcd.<span class="fn">setCursor</span>(<span class="num">0</span>, <span class="num">1</span>);
  <span class="kw">if</span> (freeSpots == <span class="num">0</span>) {
    lcd.<span class="fn">print</span>(<span class="str">"Status: FULL    "</span>);
  } <span class="kw">else</span> {
    lcd.<span class="fn">print</span>(<span class="str">"Status: ACTIVE  "</span>);
  }

  <span class="cmt">// ===== ENTRY GATE =====</span>
  <span class="kw">if</span> (<span class="fn">digitalRead</span>(pirEntry) == <span class="num">HIGH</span> &amp;&amp; freeSpots &gt; <span class="num">0</span>) {
    entryServo.<span class="fn">write</span>(<span class="num">90</span>);  <span class="cmt">// Open gate</span>
    lastEntryTime = <span class="fn">millis</span>();
    <span class="fn">Serial.println</span>(<span class="str">"Entry gate: OPENED"</span>);
  }
  <span class="kw">if</span> (<span class="fn">millis</span>() - lastEntryTime &gt; GATE_DELAY) {
    entryServo.<span class="fn">write</span>(<span class="num">0</span>);   <span class="cmt">// Close gate</span>
  }

  <span class="cmt">// ===== EXIT GATE =====</span>
  <span class="kw">if</span> (<span class="fn">digitalRead</span>(pirExit) == <span class="num">HIGH</span>) {
    exitServo.<span class="fn">write</span>(<span class="num">90</span>);   <span class="cmt">// Open gate</span>
    lastExitTime = <span class="fn">millis</span>();
    <span class="fn">Serial.println</span>(<span class="str">"Exit gate: OPENED"</span>);
  }
  <span class="kw">if</span> (<span class="fn">millis</span>() - lastExitTime &gt; GATE_DELAY) {
    exitServo.<span class="fn">write</span>(<span class="num">0</span>);    <span class="cmt">// Close gate</span>
  }

  <span class="fn">delay</span>(<span class="num">200</span>); <span class="cmt">// Small delay for stability</span>
}`;

    dom.arduinoCode.innerHTML = code;
  }

  // ===== HARDWARE CARDS =====
  function loadHardwareCards() {
    const cards = [
      {
        title: '🔧 Arduino Uno R3',
        desc: 'The main microcontroller board. Reads PIR sensor data, controls servos for barrier gates, drives LED indicators, and updates the LCD display.',
        specs: ['ATmega328P', '14 Digital I/O', '6 Analog Inputs', '16 MHz', '5V Logic'],
      },
      {
        title: '📡 HC-SR501 PIR Motion Sensor (×6)',
        desc: '4 sensors monitor individual parking spots for vehicle presence. 2 sensors detect vehicles at the entry and exit gates to trigger barrier operation.',
        specs: ['Detection Range: 3-7m', 'Voltage: 5-20V DC', 'Output: Digital HIGH/LOW', 'Adjustable Sensitivity', 'Adjustable Delay Time'],
      },
      {
        title: '⚙️ SG90 Micro Servo Motor (×2)',
        desc: 'Controls the entry and exit barrier gates. Rotates from 0° (closed) to 90° (open) when a vehicle is detected at the gate by the PIR sensor.',
        specs: ['Rotation: 0°-180°', 'Voltage: 4.8-6V', 'Torque: 1.8 kg·cm', 'Speed: 0.1s/60°', 'PWM Control'],
      },
      {
        title: '📺 16×2 LCD Display (I2C)',
        desc: 'Displays the number of available parking spots and the system status (READY, ACTIVE, or FULL) in real-time. Connected via I2C (SDA/SCL).',
        specs: ['16 chars × 2 lines', 'I2C Address: 0x27', 'PCF8574 Backpack', 'Blue/Green Backlight', '5V Operation'],
      },
      {
        title: '💡 LEDs with 220Ω Resistors (×4)',
        desc: 'Each parking spot has an LED indicator. GREEN = spot available (HIGH), RED = spot occupied (LOW). Provides visual feedback at each parking spot.',
        specs: ['Green/Red Bi-color', 'Forward Voltage: 2V', 'Current: ~15mA', '220Ω Current Limiting', 'Connected to D10-D13'],
      },
      {
        title: '🔌 Breadboard & Wiring',
        desc: 'Full-size breadboard for prototyping. All components are connected with jumper wires. Power rails provide 5V and GND distribution.',
        specs: ['830 Tie Points', '5V/GND Rails', 'Male-Male Jumpers', 'Male-Female Jumpers', 'Tinkercad Compatible'],
      },
    ];

    dom.hwCards.innerHTML = cards
      .map(
        (c) => `
      <div class="hw-card">
        <h4>${c.title}</h4>
        <p>${c.desc}</p>
        <div class="specs">${c.specs.map((s) => `<span>${s}</span>`).join('')}</div>
      </div>`
      )
      .join('');
  }

  // ===== INIT =====
  function init() {
    // Set all spots as available initially
    for (let i = 0; i < 4; i++) {
      const spotEl = $(`#spot${i + 1}`);
      spotEl.classList.add('available');
    }

    updateLCD();
    drawCircuit();
    loadArduinoCode();
    loadHardwareCards();

    serialPrint('Smart Parking System v1.0', '');
    serialPrint('System initialized — 4 spots available', '');
    serialPrint('Click parking spots or press Auto Simulation', '');
  }

  init();
})();
