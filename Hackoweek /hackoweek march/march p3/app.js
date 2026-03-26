// === Vending Machine IoT Simulation ===
(function () {
  // Inventory state (simulating EEPROM)
  const MAX_ITEMS = 5;
  let inventory = { A: MAX_ITEMS, B: MAX_ITEMS, C: MAX_ITEMS };
  let selectedSlot = 'A';
  let isDispensing = false;

  // DOM refs
  const $ = id => document.getElementById(id);
  const vmStatus = $('vmStatus'), vmMsg = $('vmMsg');
  const serialOut = $('serialOutput');
  const sensorRing = $('sensorRing'), sensorCore = $('sensorCore');
  const ledSensor = $('ledSensor'), ledRelay = $('ledRelay');
  const ledMotor = $('ledMotor'), ledEeprom = $('ledEeprom');
  const dispensedItem = $('dispensedItem'), dispenseTray = $('dispenseTray');
  const handBtn = $('handBtn');

  // Init item visuals
  function renderSlot(slot) {
    const container = $('items' + slot);
    const countEl = $('count' + slot);
    container.innerHTML = '';
    for (let i = 0; i < inventory[slot]; i++) {
      const el = document.createElement('div');
      el.className = 'item ' + slot.toLowerCase();
      container.appendChild(el);
    }
    countEl.textContent = inventory[slot] + '/' + MAX_ITEMS;
  }

  function renderAllSlots() {
    ['A', 'B', 'C'].forEach(renderSlot);
    updateSlotHighlight();
  }

  function updateSlotHighlight() {
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('active-slot'));
    $('slot-' + selectedSlot).classList.add('active-slot');
  }

  // Serial log
  function serialLog(msg, cls = 'log') {
    const ts = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = cls;
    line.textContent = '[' + ts + '] ' + msg;
    serialOut.appendChild(line);
    serialOut.scrollTop = serialOut.scrollHeight;
  }

  // LED helpers
  function setLed(el, cls) { el.className = 'led' + (cls ? ' ' + cls : ''); }

  // Dispense sequence
  async function dispense() {
    if (isDispensing) return;
    if (inventory[selectedSlot] <= 0) {
      vmStatus.textContent = 'EMPTY'; vmStatus.className = 'vm-status empty';
      vmMsg.textContent = 'Slot ' + selectedSlot + ' is empty! Select another slot.';
      serialLog('ERROR: Slot ' + selectedSlot + ' empty!', 'err');
      return;
    }
    isDispensing = true;
    handBtn.disabled = true;

    // 1. Sensor detected
    sensorRing.classList.add('detecting');
    setLed(ledSensor, 'on-green');
    vmStatus.textContent = 'DETECTED'; vmStatus.className = 'vm-status';
    vmMsg.textContent = 'Hand detected near sensor...';
    serialLog('Capacitive sensor: Hand detected (pin D2 HIGH)');
    await wait(800);

    // 2. Relay activation
    setLed(ledRelay, 'on-red');
    vmStatus.textContent = 'DISPENSING'; vmStatus.className = 'vm-status dispensing';
    vmMsg.textContent = 'Activating relay for slot ' + selectedSlot + '...';
    serialLog('Relay ON → Motor active for slot ' + selectedSlot, 'warn');
    setLed(ledMotor, 'on-orange');
    $('slot-' + selectedSlot).classList.add('dispensing-slot');
    await wait(600);

    // 3. Remove item from slot visually
    const items = $('items' + selectedSlot).children;
    if (items.length > 0) {
      const last = items[items.length - 1];
      last.classList.add('removing');
      await wait(400);
    }

    // 4. Update inventory (EEPROM write)
    inventory[selectedSlot]--;
    setLed(ledEeprom, 'on-blue');
    serialLog('EEPROM write → Slot ' + selectedSlot + ' count = ' + inventory[selectedSlot], 'info');
    renderSlot(selectedSlot);
    await wait(300);

    // 5. Show dispensed item
    const icons = { A: '🥤', B: '🍫', C: '🍪' };
    dispensedItem.textContent = icons[selectedSlot];
    dispensedItem.className = 'show';
    serialLog('Item dispensed from slot ' + selectedSlot + ' ✓');
    await wait(400);

    // 6. Turn off relay & motor
    setLed(ledRelay, ''); setLed(ledMotor, '');
    $('slot-' + selectedSlot).classList.remove('dispensing-slot');
    vmStatus.textContent = 'COMPLETE'; vmStatus.className = 'vm-status';
    vmMsg.textContent = 'Item dispensed! Remaining: ' + inventory[selectedSlot];
    serialLog('Relay OFF → Motor stopped');
    await wait(500);

    // 7. Reset to ready
    sensorRing.classList.remove('detecting');
    setLed(ledSensor, ''); setLed(ledEeprom, '');
    dispensedItem.className = '';
    setTimeout(() => { dispensedItem.textContent = ''; }, 300);
    vmStatus.textContent = 'READY'; vmStatus.className = 'vm-status';
    vmMsg.textContent = 'Place hand near sensor to dispense';
    serialLog('System ready. Inventory → A:' + inventory.A + ' B:' + inventory.B + ' C:' + inventory.C);

    isDispensing = false;
    handBtn.disabled = false;
    updateSlotHighlight();
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  // === Code Syntax Highlighting ===
  function highlightCode(code) {
    // Process line by line to handle comments properly
    return code.split('\n').map(function(line) {
      // Check if line is a comment
      var commentIdx = line.indexOf('//');
      var before = commentIdx >= 0 ? line.substring(0, commentIdx) : line;
      var comment = commentIdx >= 0 ? line.substring(commentIdx) : '';

      // Escape HTML in both parts
      before = esc(before);
      comment = esc(comment);

      // Highlight the non-comment part
      before = before
        .replace(/(#include|#define)/g, '<span class="pp">$1</span>')
        .replace(/\b(void|int|byte|bool|if|else|for|while|return|unsigned|long|const)\b/g, '<span class="kw">$1</span>')
        .replace(/\b(Serial|EEPROM|digitalWrite|digitalRead|analogRead|pinMode|delay|lcd)\b/g, '<span class="fn">$1</span>')
        .replace(/\b(HIGH|LOW|OUTPUT|INPUT|INPUT_PULLUP|true|false)\b/g, '<span class="num">$1</span>')
        .replace(/&quot;([^&]*)&quot;/g, '<span class="str">"$1"</span>')
        .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');

      if (comment) {
        return before + '<span class="cm">' + comment + '</span>';
      }
      return before;
    }).join('\n');
  }
  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // === Arduino Code ===
  const ARDUINO_CODE = `// ==========================================
// Vending Machine Dispenser - Arduino Code
// Capacitive Sensor + Relay + EEPROM
// ==========================================

#include <EEPROM.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Pin Definitions
#define SENSOR_PIN  2    // TTP223 capacitive sensor
#define RELAY_PIN   7    // Relay module control
#define SLOTS       3    // Number of vending slots

// EEPROM Addresses for inventory
#define EEPROM_ADDR_A  0
#define EEPROM_ADDR_B  1
#define EEPROM_ADDR_C  2
#define MAX_ITEMS       5

// LCD Setup (I2C address 0x27)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Variables
int inventory[SLOTS];
int selectedSlot = 0; // 0=A, 1=B, 2=C
bool sensorState = false;
bool lastSensorState = false;
unsigned long lastDebounce = 0;
const int debounceDelay = 50;

void setup() {
  Serial.begin(9600);
  Serial.println("=== Vending Machine Init ===");

  // Pin modes
  pinMode(SENSOR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  // LCD init
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("SMART VEND v1.0");

  // Load inventory from EEPROM
  loadInventory();
  displayReady();

  Serial.println("System ready.");
}

void loop() {
  // Read capacitive sensor with debounce
  int reading = digitalRead(SENSOR_PIN);
  
  if (reading != lastSensorState) {
    lastDebounce = millis();
  }

  if ((millis() - lastDebounce) > debounceDelay) {
    if (reading != sensorState) {
      sensorState = reading;
      
      if (sensorState == HIGH) {
        Serial.println("Hand detected!");
        dispenseItem();
      }
    }
  }
  lastSensorState = reading;

  delay(10);
}

void dispenseItem() {
  // Check inventory
  if (inventory[selectedSlot] <= 0) {
    Serial.print("Slot ");
    Serial.print((char)('A' + selectedSlot));
    Serial.println(" is EMPTY!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SLOT EMPTY!");
    lcd.setCursor(0, 1);
    lcd.print("Select another");
    delay(2000);
    displayReady();
    return;
  }

  // Activate relay (turn on motor)
  Serial.println("Relay ON - Motor running");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("DISPENSING...");
  lcd.setCursor(0, 1);
  lcd.print("Slot: ");
  lcd.print((char)('A' + selectedSlot));

  digitalWrite(RELAY_PIN, HIGH);
  delay(1500); // Motor runs for 1.5s
  digitalWrite(RELAY_PIN, LOW);
  Serial.println("Relay OFF - Motor stopped");

  // Update inventory
  inventory[selectedSlot]--;
  saveInventory();

  Serial.print("Slot ");
  Serial.print((char)('A' + selectedSlot));
  Serial.print(" remaining: ");
  Serial.println(inventory[selectedSlot]);

  // Display success
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("ITEM DISPENSED!");
  lcd.setCursor(0, 1);
  lcd.print("Left: ");
  lcd.print(inventory[selectedSlot]);
  delay(2000);

  displayReady();
}

void loadInventory() {
  for (int i = 0; i < SLOTS; i++) {
    inventory[i] = EEPROM.read(i);
    // Initialize if first run (0xFF = blank)
    if (inventory[i] > MAX_ITEMS || inventory[i] < 0) {
      inventory[i] = MAX_ITEMS;
      EEPROM.write(i, MAX_ITEMS);
    }
    Serial.print("Slot ");
    Serial.print((char)('A' + i));
    Serial.print(": ");
    Serial.println(inventory[i]);
  }
}

void saveInventory() {
  for (int i = 0; i < SLOTS; i++) {
    EEPROM.write(i, inventory[i]);
  }
  Serial.println("EEPROM updated.");
}

void displayReady() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("READY - Slot ");
  lcd.print((char)('A' + selectedSlot));
  lcd.setCursor(0, 1);
  lcd.print("A:");
  lcd.print(inventory[0]);
  lcd.print(" B:");
  lcd.print(inventory[1]);
  lcd.print(" C:");
  lcd.print(inventory[2]);
}`;

  // === Circuit Diagram Drawing ===
  function drawCircuit() {
    const c = $('circuitCanvas');
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    function rrect(x, y, w, h, r, fill, stroke) {
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    function label(text, x, y, color, size, align) {
      ctx.fillStyle = color || '#94a3b8';
      ctx.font = (size || 10) + 'px Inter, sans-serif';
      ctx.textAlign = align || 'center';
      ctx.fillText(text, x, y);
    }
    function wire(points, color) {
      ctx.beginPath(); ctx.strokeStyle = color || '#4b5563'; ctx.lineWidth = 2;
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.stroke();
    }
    function dot(x, y, color) {
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color || '#fff'; ctx.fill();
    }

    // Arduino Uno
    rrect(170, 30, 180, 110, 8, '#1e3a5f', '#3b82f6');
    label('ARDUINO UNO', 260, 75, '#3b82f6', 13, 'center');
    label('ATmega328P', 260, 92, '#60a5fa', 9, 'center');
    label('D2', 170, 125, '#94a3b8', 8); label('D7', 215, 125, '#94a3b8', 8);
    label('5V', 290, 125, '#f59e0b', 8); label('GND', 340, 125, '#ef4444', 8);
    dot(170, 135, '#22c55e'); dot(215, 135, '#ef4444'); dot(290, 135, '#f59e0b'); dot(340, 135, '#ef4444');
    rrect(210, 95, 100, 18, 4, '#1a2744', '#6366f1');
    label('EEPROM (internal)', 260, 108, '#a5b4fc', 8);

    // Capacitive Sensor
    rrect(40, 210, 140, 70, 8, '#0f3324', '#22c55e');
    label('TTP223', 110, 240, '#22c55e', 12); label('Capacitive Sensor', 110, 257, '#6ee7b7', 9);
    label('VCC', 60, 290, '#f59e0b', 8); label('GND', 110, 290, '#ef4444', 8); label('OUT', 155, 290, '#22c55e', 8);
    dot(60, 280, '#f59e0b'); dot(110, 280, '#ef4444'); dot(155, 280, '#22c55e');
    wire([[155, 280], [155, 330], [40, 330], [40, 160], [170, 160], [170, 135]], '#22c55e');
    wire([[60, 280], [60, 350], [20, 350], [20, 150], [290, 150], [290, 135]], '#f59e0b');
    wire([[110, 280], [110, 370], [10, 370], [10, 145], [340, 145], [340, 135]], '#ef4444');

    // Relay Module
    rrect(340, 210, 140, 70, 8, '#3b1010', '#ef4444');
    label('RELAY MODULE', 410, 240, '#ef4444', 12); label('5V - 1 Channel', 410, 257, '#fca5a5', 9);
    label('IN', 360, 290, '#3b82f6', 8); label('VCC', 400, 290, '#f59e0b', 8); label('GND', 440, 290, '#ef4444', 8);
    label('COM', 370, 205, '#94a3b8', 8); label('NO', 450, 205, '#94a3b8', 8);
    dot(360, 280, '#3b82f6'); dot(400, 280, '#f59e0b'); dot(440, 280, '#ef4444');
    dot(370, 210, '#94a3b8'); dot(450, 210, '#94a3b8');
    wire([[215, 135], [215, 165], [360, 165], [360, 280]], '#3b82f6');
    wire([[400, 280], [400, 310], [490, 310], [490, 150], [290, 150]], '#f59e0b');
    wire([[440, 280], [440, 330], [500, 330], [500, 145], [340, 145]], '#ef4444');

    // DC Motor
    rrect(330, 400, 160, 70, 8, '#3b2300', '#f59e0b');
    ctx.beginPath(); ctx.arc(410, 430, 20, 0, Math.PI * 2);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke();
    label('M', 410, 435, '#f59e0b', 14); label('DC Motor', 410, 458, '#fbbf24', 9);
    label('+', 350, 480, '#f59e0b', 10); label('-', 470, 480, '#ef4444', 10);
    dot(350, 475, '#f59e0b'); dot(470, 475, '#ef4444');
    wire([[450, 210], [510, 210], [510, 390], [350, 390], [350, 475]], '#f59e0b');
    wire([[370, 210], [370, 190], [290, 190], [290, 150]], '#f59e0b');
    wire([[470, 475], [470, 520], [10, 520], [10, 370]], '#ef4444');

    // LCD (I2C)
    rrect(100, 420, 170, 60, 8, '#1a1040', '#8b5cf6');
    rrect(120, 435, 130, 25, 4, '#0f0a2a', '#6d28d9');
    label('LCD 16x2 (I2C)', 185, 475, '#a78bfa', 9);
    label('SDA→A4  SCL→A5', 185, 450, '#c4b5fd', 7);
    wire([[185, 420], [185, 385], [30, 385], [30, 155], [200, 155], [200, 140]], '#8b5cf6');
    label('CIRCUIT DIAGRAM', 260, 560, '#4b5563', 10);
  }

  // Event listeners
  handBtn.addEventListener('click', dispense);

  document.querySelectorAll('.slot-sel').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isDispensing) return;
      document.querySelectorAll('.slot-sel').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSlot = btn.dataset.slot;
      updateSlotHighlight();
      serialLog('Slot selected: ' + selectedSlot);
    });
  });

  $('resetBtn').addEventListener('click', () => {
    if (isDispensing) return;
    inventory = { A: MAX_ITEMS, B: MAX_ITEMS, C: MAX_ITEMS };
    renderAllSlots();
    serialLog('EEPROM RESET → All slots restocked to ' + MAX_ITEMS, 'warn');
    vmStatus.textContent = 'READY'; vmStatus.className = 'vm-status';
    vmMsg.textContent = 'Inventory reset. Place hand near sensor to dispense';
  });

  $('clearSerial').addEventListener('click', () => { serialOut.innerHTML = ''; });

  // Tabs
  $('tabCircuit').addEventListener('click', () => {
    $('tabCircuit').classList.add('active'); $('tabCode').classList.remove('active');
    $('circuitTab').classList.remove('hidden'); $('codeTab').classList.add('hidden');
  });
  $('tabCode').addEventListener('click', () => {
    $('tabCode').classList.add('active'); $('tabCircuit').classList.remove('active');
    $('codeTab').classList.remove('hidden'); $('circuitTab').classList.add('hidden');
  });

  // Copy code
  $('copyCode').addEventListener('click', () => {
    navigator.clipboard.writeText($('arduinoCode').textContent).then(() => {
      $('copyCode').textContent = '✅ Copied!';
      setTimeout(() => { $('copyCode').textContent = '📋 Copy Code'; }, 2000);
    });
  });

  // Initialize everything
  $('arduinoCode').innerHTML = highlightCode(ARDUINO_CODE);
  drawCircuit();
  renderAllSlots();
  serialLog('=== Vending Machine Dispenser ===', 'info');
  serialLog('System initialized. EEPROM loaded.');
  serialLog('Inventory → A:5 B:5 C:5');
  serialLog('Waiting for hand detection...');
})();
