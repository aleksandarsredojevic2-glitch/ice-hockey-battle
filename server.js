const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = {}; // Objekat koji čuva sve igrače: { id: {x, y, vx, vy, color, name, keys} }
let puck = { x: 1500, y: 750, vx: 0, vy: 0, radius: 7 };
const WORLD_WIDTH = 3000; const WORLD_HEIGHT = 1500;

// Osnovna fizika (preuzeto sa klijenta)
function updatePhysics() {
    // 1. Ažuriraj igrače
    for (let id in players) {
        let p = players[id];
        if (p.keys['w']) p.vy -= 0.8;
        if (p.keys['s']) p.vy += 0.8;
        if (p.keys['a']) p.vx -= 0.8;
        if (p.keys['d']) p.vx += 0.8;
        
        p.vx *= 0.885; p.vy *= 0.885;
        p.x += p.vx; p.y += p.vy;
    }

    // 2. Ažuriraj pak
    puck.vx *= 0.979; puck.vy *= 0.979;
    puck.x += puck.vx; puck.y += puck.vy;

    // 3. Kolizije (jednostavna provera)
    for (let id in players) {
        let p = players[id];
        let dx = puck.x - p.x;
        let dy = puck.y - p.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 25) { // Radius igrača + pak
            let nx = dx / dist; let ny = dy / dist;
            puck.vx = nx * 15; puck.vy = ny * 15; // Šut
        }
    }
}

// Game Loop (60 FPS)
setInterval(() => {
    updatePhysics();
    // Šalji svima pozicije
    let state = JSON.stringify({ type: 'state', players, puck });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(state);
    });
}, 1000 / 60);

wss.on('connection', (ws) => {
    let id = Math.random().toString(36).substr(2, 9);
    players[id] = { x: 500, y: 500, vx: 0, vy: 0, keys: {} };

    ws.on('message', (msg) => {
        let data = JSON.parse(msg);
        if (data.type === 'input') {
            players[id].keys = data.keys; // Igrač šalje samo tastere
        }
    });

    ws.on('close', () => delete players[id]);
});