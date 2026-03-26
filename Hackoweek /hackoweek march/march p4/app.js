/* ===== Assembly Line Object Counter — Simulation Engine ===== */
(function () {
  'use strict';

  // ── State ──
  let partCount = 0;
  let running = false;
  let speed = 3;
  let spawnTimer = null;
  let partIdCounter = 0;
  const parts = [];
  const DETECTION_X_MIN = 0.44;
  const DETECTION_X_MAX = 0.56;

  // ── DOM refs ──
  const $ = id => document.getElementById(id);
  const startBtn     = $('startBtn');
  const stopBtn      = $('stopBtn');
  const resetBtn     = $('resetBtn');
  const speedSlider  = $('speedSlider');
  const speedLabel   = $('speedLabel');
  const lcdRow1      = $('lcdRow1');
  const lcdRow2      = $('lcdRow2');
  const serialOutput = $('serialOutput');
  const clearSerial  = $('clearSerial');
  const partsTrack   = $('partsTrack');
  const beltPattern  = $('beltPattern');
  const sensorFace   = $('sensorFace');
  const detectionZone= $('detectionZone');
  const ledPower     = $('ledPower');
  const ledSensor    = $('ledSensor');
  const ledMotor     = $('ledMotor');
  const ledLCD       = $('ledLCD');
  const copyCode     = $('copyCode');

  // ── Initialize ──
  function init() {
    drawCircuit();
    renderArduinoCode();
    renderHardwareCards();
    setupTabs();
    setupControls();
    updateLCD();
    setLed(ledPower, 'on-green');
    setLed(ledLCD, 'on-cyan');
    serialLog('[SYSTEM] Assembly Line Counter initialized', 'info');
    serialLog('[SYSTEM] Inductive sensor: LJ12A3-4-Z/BX (NPN NO)', 'info');
    serialLog('[SYSTEM] LCD: 16x2 I2C @ 0x27', 'info');
    serialLog('[SYSTEM] Ready. Press START to begin.', 'info');
  }

  // ── Controls ──
  function setupControls() {
    startBtn.addEventListener('click', startConveyor);
    stopBtn.addEventListener('click', stopConveyor);
    resetBtn.addEventListener('click', resetCounter);
    speedSlider.addEventListener('input', e => {
      speed = parseInt(e.target.value);
      speedLabel.textContent = speed;
      beltPattern.style.animationDuration = (1.5 / speed) + 's';
    });
    clearSerial.addEventListener('click', () => { serialOutput.innerHTML = ''; });
    copyCode.addEventListener('click', () => {
      const code = document.getElementById('arduinoCode').textContent;
      navigator.clipboard.writeText(code).then(() => {
        copyCode.textContent = '✅ Copied!';
        setTimeout(() => copyCode.textContent = '📋 Copy Code', 1500);
      });
    });
  }

  function startConveyor() {
    if (running) return;
    running = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    beltPattern.classList.add('moving');
    beltPattern.style.animationDuration = (1.5 / speed) + 's';
    setLed(ledMotor, 'on-orange');
    serialLog('[MOTOR] Conveyor started — speed: ' + speed);
    lcdRow2.textContent = padLCD('Status: RUNNING');
    scheduleSpawn();
    requestAnimationFrame(tick);
  }

  function stopConveyor() {
    running = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    beltPattern.classList.remove('moving');
    setLed(ledMotor, '');
    serialLog('[MOTOR] Conveyor stopped', 'warn');
    lcdRow2.textContent = padLCD('Status: STOPPED');
    if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
  }

  function resetCounter() {
    partCount = 0;
    updateLCD();
    serialLog('[RESET] Counter reset to 0', 'warn');
    // Remove all parts
    parts.forEach(p => { if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el); });
    parts.length = 0;
  }

  // ── Part spawning ──
  function scheduleSpawn() {
    if (!running) return;
    const interval = 2500 / speed + Math.random() * 1000;
    spawnTimer = setTimeout(() => {
      spawnPart();
      scheduleSpawn();
    }, interval);
  }

  function spawnPart() {
    const el = document.createElement('div');
    el.className = 'metal-part';
    el.style.left = '-32px';
    partsTrack.appendChild(el);
    const part = { id: partIdCounter++, el, x: -32, counted: false };
    parts.push(part);
  }

  // ── Animation loop ──
  function tick() {
    if (!running) return;
    const trackWidth = partsTrack.offsetWidth;
    const pxPerFrame = (speed * 1.2);
    let sensorActive = false;

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += pxPerFrame;
      p.el.style.left = p.x + 'px';

      // Detection zone check
      const ratio = (p.x + 16) / trackWidth;
      if (ratio >= DETECTION_X_MIN && ratio <= DETECTION_X_MAX) {
        sensorActive = true;
        p.el.classList.add('detected');
        if (!p.counted) {
          p.counted = true;
          partCount++;
          updateLCD();
          serialLog('[SENSOR] Metal part detected! Count: ' + partCount);
        }
      } else {
        p.el.classList.remove('detected');
      }

      // Remove off-screen parts
      if (p.x > trackWidth + 40) {
        if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
        parts.splice(i, 1);
      }
    }

    // Sensor indicator
    if (sensorActive) {
      sensorFace.classList.add('active');
      detectionZone.classList.add('active');
      setLed(ledSensor, 'on-cyan');
    } else {
      sensorFace.classList.remove('active');
      detectionZone.classList.remove('active');
      setLed(ledSensor, '');
    }

    requestAnimationFrame(tick);
  }

  // ── LCD ──
  function updateLCD() {
    lcdRow1.textContent = padLCD('Parts Count: ' + partCount);
  }

  function padLCD(str) {
    return str.padEnd(16, ' ').substring(0, 16);
  }

  // ── LEDs ──
  function setLed(el, cls) {
    el.className = 'led';
    if (cls) el.classList.add(cls);
  }

  // ── Serial Monitor ──
  function serialLog(msg, type) {
    const line = document.createElement('div');
    line.className = 'serial-line' + (type ? ' ' + type : '');
    const ts = new Date().toLocaleTimeString();
    line.textContent = '[' + ts + '] ' + msg;
    serialOutput.appendChild(line);
    serialOutput.scrollTop = serialOutput.scrollHeight;
  }

  // ── Tabs ──
  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = {
      circuit: $('circuitTab'),
      code: $('codeTab'),
      hardware: $('hardwareTab')
    };
    tabs.forEach(t => {
      t.addEventListener('click', () => {
        tabs.forEach(b => b.classList.remove('active'));
        t.classList.add('active');
        Object.values(contents).forEach(c => c.classList.add('hidden'));
        contents[t.dataset.tab].classList.remove('hidden');
      });
    });
  }

  // ── Hardware Cards ──
  function renderHardwareCards() {
    const hw = [
      {
        icon: '🔲', title: 'Arduino Uno', model: 'ATmega328P',
        desc: 'Main microcontroller running the counter logic. Reads digital signal from inductive sensor, sends data to LCD via I2C, and controls conveyor motor.',
        specs: ['5V Logic', '14 Digital I/O', '6 Analog Inputs', '32KB Flash', '16MHz Clock']
      },
      {
        icon: '📡', title: 'Inductive Proximity Sensor', model: 'LJ12A3-4-Z/BX (NPN NO)',
        desc: 'Detects metal objects without physical contact using electromagnetic induction. Normally-open type outputs HIGH when a metal part enters the detection range (4mm). Ideal for counting metal parts on conveyor belts.',
        specs: ['6-36V DC', '4mm Range', 'NPN NO Output', '200mA Max', 'IP67 Rated', 'M12 Thread']
      },
      {
        icon: '📺', title: '16×2 LCD Display', model: 'HD44780 + PCF8574 I2C Adapter',
        desc: 'Displays real-time part count and system status. Connected via I2C bus using only SDA (A4) and SCL (A5) pins, freeing up digital pins.',
        specs: ['I2C Address: 0x27', '5V Operation', '2 Lines × 16 Chars', 'Blue Backlight', 'PCF8574 Expander']
      },
      {
        icon: '⚡', title: 'Motor Driver Module', model: 'L298N Dual H-Bridge',
        desc: 'Controls the DC conveyor motor. Receives PWM signal from Arduino to control belt speed. Handles the higher voltage/current needed by the motor.',
        specs: ['5-35V Motor Supply', '2A Per Channel', 'PWM Speed Control', 'Dual H-Bridge', 'Logic 5V']
      },
      {
        icon: '🔌', title: 'DC Motor (Conveyor)', model: '12V DC Geared Motor',
        desc: 'Drives the conveyor belt at variable speeds via PWM. Geared for high torque at low speeds suitable for assembly line operation.',
        specs: ['12V DC', '~300 RPM', 'Geared Output', '0.5A Typical']
      },
      {
        icon: '🔋', title: 'Power Supply', model: '12V 2A DC Adapter',
        desc: 'Powers the motor driver, inductive sensor, and Arduino board. Provides stable 12V output for sensor and motor operation.',
        specs: ['12V Output', '2A Max', 'DC Jack', 'Regulated']
      }
    ];
    const container = $('hwCards');
    hw.forEach(h => {
      const card = document.createElement('div');
      card.className = 'hw-card';
      card.innerHTML = `
        <div class="hw-card-header">
          <span class="hw-card-icon">${h.icon}</span>
          <div>
            <div class="hw-card-title">${h.title}</div>
            <div class="hw-card-model">${h.model}</div>
          </div>
        </div>
        <div class="hw-card-desc">${h.desc}</div>
        <div class="hw-card-specs">${h.specs.map(s => '<span class="hw-spec">' + s + '</span>').join('')}</div>
      `;
      container.appendChild(card);
    });
  }

  // ── Arduino Code ──
  function renderArduinoCode() {
    const raw = `// ===========================================
// Assembly Line Object Counter
// Inductive Sensor + LCD (I2C) + Serial
// ===========================================

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ---- Pin Definitions ----
#define SENSOR_PIN    2    // Inductive sensor output
#define MOTOR_EN      9    // L298N Enable (PWM)
#define MOTOR_IN1     7    // Motor direction 1
#define MOTOR_IN2     8    // Motor direction 2
#define LED_PIN       13   // Built-in LED

// ---- LCD Setup (I2C address 0x27) ----
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ---- Variables ----
volatile unsigned int partCount = 0;
bool lastSensorState = LOW;
unsigned long lastDebounce = 0;
const unsigned long debounceDelay = 200;
int motorSpeed = 180;  // PWM 0-255

void setup() {
  Serial.begin(9600);
  Serial.println("Assembly Line Counter v1.0");
  Serial.println("==========================");

  // Pin modes
  pinMode(SENSOR_PIN, INPUT);
  pinMode(MOTOR_EN, OUTPUT);
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Parts Count:   0");
  lcd.setCursor(0, 1);
  lcd.print("Status: READY   ");

  // Start motor (forward direction)
  digitalWrite(MOTOR_IN1, HIGH);
  digitalWrite(MOTOR_IN2, LOW);
  analogWrite(MOTOR_EN, motorSpeed);

  Serial.println("[READY] System initialized");
  Serial.print("[MOTOR] Speed: ");
  Serial.println(motorSpeed);
}

void loop() {
  bool sensorState = digitalRead(SENSOR_PIN);

  // Detect rising edge with debounce
  if (sensorState == HIGH && lastSensorState == LOW) {
    if (millis() - lastDebounce > debounceDelay) {
      lastDebounce = millis();
      partCount++;

      // Flash LED
      digitalWrite(LED_PIN, HIGH);

      // Update LCD
      lcd.setCursor(0, 0);
      lcd.print("Parts Count:");
      lcd.setCursor(12, 0);
      lcd.print("    ");
      lcd.setCursor(12, 0);
      lcd.print(partCount);

      lcd.setCursor(0, 1);
      lcd.print("Status: COUNTING");

      // Serial output
      Serial.print("[SENSOR] Part detected! ");
      Serial.print("Count: ");
      Serial.println(partCount);

      delay(50);
      digitalWrite(LED_PIN, LOW);
    }
  }

  lastSensorState = sensorState;

  // Update status when idle
  if (sensorState == LOW) {
    lcd.setCursor(0, 1);
    lcd.print("Status: RUNNING ");
  }

  delay(10);  // Small delay for stability
}`;

    const el = document.getElementById('arduinoCode');
    el.innerHTML = highlightArduino(raw);
  }

  function highlightArduino(code) {
    const kws = new Set(['void','int','bool','unsigned','long','const','volatile','if','return','true','false','HIGH','LOW','INPUT','OUTPUT','delay']);
    const types = new Set(['LiquidCrystal_I2C','Serial','Wire']);
    const fns = new Set(['setup','loop','pinMode','digitalWrite','digitalRead','analogWrite','millis','begin','println','print','init','backlight','setCursor']);

    function esc(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function highlightLine(line) {
      // Find inline comment position (outside strings)
      let cmtIdx = -1;
      let inStr = false;
      for (let i = 0; i < line.length - 1; i++) {
        if (line[i] === '"' && (i === 0 || line[i-1] !== '\\')) inStr = !inStr;
        if (!inStr && line[i] === '/' && line[i+1] === '/') { cmtIdx = i; break; }
      }

      let codePart = cmtIdx >= 0 ? line.substring(0, cmtIdx) : line;
      let cmtPart = cmtIdx >= 0 ? line.substring(cmtIdx) : '';

      // Tokenize the code part using a regex that captures different token types
      // Order: strings, preprocessor, identifiers, numbers, everything else
      const tokenRe = /("(?:[^"\\]|\\.)*")|(#\w+)|([A-Za-z_]\w*)|(\d+)|(\S)/g;
      let result = '';
      let lastIndex = 0;
      let match;

      while ((match = tokenRe.exec(codePart)) !== null) {
        // Add any whitespace/gap before the match
        if (match.index > lastIndex) {
          result += esc(codePart.substring(lastIndex, match.index));
        }
        lastIndex = tokenRe.lastIndex;

        if (match[1]) {
          // String literal
          result += '<span class="str">' + esc(match[1]) + '</span>';
        } else if (match[2]) {
          // Preprocessor directive
          result += '<span class="prep">' + esc(match[2]) + '</span>';
        } else if (match[3]) {
          // Identifier — check if keyword/type/function
          const w = match[3];
          if (kws.has(w)) result += '<span class="kw">' + w + '</span>';
          else if (types.has(w)) result += '<span class="type">' + w + '</span>';
          else if (fns.has(w)) result += '<span class="fn">' + w + '</span>';
          else result += w;
        } else if (match[4]) {
          // Number
          result += '<span class="num">' + match[4] + '</span>';
        } else if (match[5]) {
          // Other single character (operators, punctuation)
          result += esc(match[5]);
        }
      }
      // Trailing whitespace
      if (lastIndex < codePart.length) {
        result += esc(codePart.substring(lastIndex));
      }

      // Append comment
      if (cmtPart) {
        result += '<span class="cmt">' + esc(cmtPart) + '</span>';
      }

      return result;
    }

    return code.split('\n').map(highlightLine).join('\n');
  }

  // ── Circuit Diagram (Canvas) ──
  function drawCircuit() {
    const canvas = $('circuitCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = 'rgba(6,182,212,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Helper functions
    function drawChip(x, y, w, h, label, sublabel, color) {
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      roundRect(ctx, x + 3, y + 3, w, h, 8);
      ctx.fill();
      // Body
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, shadeColor(color, -30));
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, w, h, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, w, h, 8);
      ctx.stroke();
      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y + h / 2 - 2);
      if (sublabel) {
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(sublabel, x + w / 2, y + h / 2 + 12);
      }
    }

    function drawWire(x1, y1, x2, y2, color, label) {
      ctx.beginPath();
      ctx.strokeStyle = color || '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      // Route wire with right angles
      if (Math.abs(x1 - x2) > 5 && Math.abs(y1 - y2) > 5) {
        const midY = (y1 + y2) / 2;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1, midY);
        ctx.lineTo(x2, midY);
        ctx.lineTo(x2, y2);
      } else {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      // Glow
      ctx.strokeStyle = color ? color.replace(')', ',0.2)').replace('rgb', 'rgba') : 'rgba(6,182,212,0.2)';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.lineWidth = 2;
      // Label
      if (label) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, mx + 12, my - 4);
      }
    }

    function drawPin(x, y, label) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (label) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 6, y + 3);
      }
    }

    // ── Draw Components ──

    // Arduino Uno (center)
    drawChip(190, 240, 160, 100, 'Arduino Uno', 'ATmega328P', '#1e40af');
    // Pin labels on Arduino
    drawPin(190, 260, ''); // D2
    drawPin(190, 280, ''); // D7
    drawPin(190, 300, ''); // D8
    drawPin(350, 260, ''); // D9
    drawPin(350, 280, ''); // A4
    drawPin(350, 300, ''); // A5
    ctx.fillStyle = '#64748b';
    ctx.font = '7px JetBrains Mono';
    ctx.textAlign = 'right';
    ctx.fillText('D2', 186, 263);
    ctx.fillText('D7', 186, 283);
    ctx.fillText('D8', 186, 303);
    ctx.textAlign = 'left';
    ctx.fillText('D9', 354, 263);
    ctx.fillText('A4/SDA', 354, 283);
    ctx.fillText('A5/SCL', 354, 303);

    // GND & 5V labels
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '7px JetBrains Mono';
    ctx.fillText('5V', 354, 248);
    ctx.fillText('GND', 186, 335);
    drawPin(350, 245, '');
    drawPin(190, 332, '');

    // Inductive Sensor (top-left)
    drawChip(30, 60, 130, 70, 'Inductive Sensor', 'LJ12A3-4-Z/BX', '#0e7490');
    // Sensor face
    ctx.beginPath();
    ctx.arc(95, 55, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6,182,212,0.2)';
    ctx.fill();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#06b6d4';
    ctx.font = '8px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('≋', 95, 58);

    // Wire: Sensor OUT → Arduino D2
    drawPin(95, 130, '');
    ctx.fillStyle = '#64748b'; ctx.font = '7px JetBrains Mono'; ctx.textAlign = 'center';
    ctx.fillText('OUT', 95, 144);
    drawWire(95, 130, 190, 260, 'rgb(6,182,212)', 'D2');

    // Sensor VCC & GND
    drawPin(55, 130, '');
    drawPin(135, 130, '');
    ctx.fillStyle = '#64748b'; ctx.font = '7px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('VCC', 55, 144);
    ctx.fillText('GND', 135, 144);

    // Resistor (pull-down)
    const rx = 125, ry = 178;
    ctx.fillStyle = '#374151';
    ctx.fillRect(rx, ry, 40, 12);
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx, ry, 40, 12);
    // Resistor bands
    const bands = ['#ef4444', '#451a03', '#f59e0b', '#d4a017'];
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(rx + 6 + i * 8, ry, 4, 12);
    });
    ctx.fillStyle = '#94a3b8';
    ctx.font = '7px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('10kΩ', rx + 20, ry + 24);
    // Wire: sensor out to resistor
    drawWire(135, 130, 145, 178, 'rgb(107,114,128)');

    // 16x2 LCD Display (top-right)
    drawChip(370, 60, 140, 70, '16×2 LCD', 'I2C PCF8574', '#065f46');
    // LCD screen representation
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(385, 45, 110, 20);
    ctx.strokeStyle = '#2a4a2a';
    ctx.lineWidth = 1;
    ctx.strokeRect(385, 45, 110, 20);
    ctx.fillStyle = '#33ff33';
    ctx.font = '7px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText('Parts: 0', 390, 56);

    // Wire: Arduino A4/SDA → LCD SDA
    drawPin(440, 130, '');
    ctx.fillStyle = '#64748b'; ctx.font = '7px JetBrains Mono'; ctx.textAlign = 'center';
    ctx.fillText('SDA', 420, 144);
    ctx.fillText('SCL', 460, 144);
    drawPin(460, 130, '');
    drawWire(350, 280, 440, 130, 'rgb(16,185,129)', 'SDA');
    drawWire(350, 300, 460, 130, 'rgb(52,211,153)', 'SCL');

    // L298N Motor Driver (bottom-left)
    drawChip(30, 420, 130, 70, 'L298N Driver', 'Motor Driver', '#92400e');
    // Wires from Arduino to L298N
    drawPin(95, 420, '');
    drawPin(65, 420, '');
    drawPin(125, 420, '');
    ctx.fillStyle = '#64748b'; ctx.font = '7px JetBrains Mono'; ctx.textAlign = 'center';
    ctx.fillText('EN', 95, 414);
    ctx.fillText('IN1', 65, 414);
    ctx.fillText('IN2', 125, 414);

    drawWire(190, 280, 65, 420, 'rgb(245,158,11)', 'D7');
    drawWire(190, 300, 125, 420, 'rgb(245,158,11)', 'D8');
    drawWire(350, 260, 95, 420, 'rgb(251,191,36)', 'D9/PWM');

    // DC Motor (bottom-right)
    drawChip(370, 420, 140, 70, 'DC Motor', '12V Conveyor', '#7c2d12');
    // Motor symbol
    ctx.beginPath();
    ctx.arc(440, 510, 15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(124,45,18,0.3)';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('M', 440, 514);

    // Wire: Motor Driver → Motor
    drawWire(160, 460, 370, 460, 'rgb(239,68,68)', 'OUT');

    // Power Supply (bottom-center)
    drawChip(200, 530, 140, 50, '12V PSU', '2A Power', '#7c3aed');
    // Power wires
    drawWire(270, 530, 95, 490, 'rgb(239,68,68)', '+12V');
    drawWire(270, 530, 440, 490, 'rgb(239,68,68)', '+12V');

    // GND bus (bottom)
    ctx.beginPath();
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 3]);
    ctx.moveTo(30, 570);
    ctx.lineTo(510, 570);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('—— GND BUS ——', 270, 590);

    // GND connections
    drawWire(190, 332, 190, 570, 'rgb(107,114,128)', 'GND');
    drawWire(135, 130, 135, 570, 'rgb(107,114,128)');

    // Title
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Assembly Line Object Counter — Circuit', W / 2, 25);
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

  function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  // ── Boot ──
  init();
})();
