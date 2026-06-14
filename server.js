const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map(); // Mapa: ws -> { id, nick, role }
let players = { p1: null, p2: null }; // Čuva WebSocket objekte za igrače
let masterId = null; 

app.use(express.static(__dirname));

wss.on('connection', (ws) => {
    const id = Math.random().toString(36).substr(2, 9);
    clients.set(ws, { id: id, nick: 'Anonimus', role: 'spectator' });

    // Ako je ovo prvi igrač, postaje Master paka
    if (clients.size === 1) masterId = id;
    ws.send(JSON.stringify({ type: 'init', id: id, isMaster: (id === masterId) }));

    ws.on('message', (message) => {
        let data;
        try { data = JSON.parse(message); } catch (e) { return; }

        // 1. Postavljanje nadimka
        if (data.type === 'set-nick') {
            const info = clients.get(ws);
            info.nick = data.nick;
            clients.set(ws, info);
        }
        
        // 2. Ulazak u igru (Dodeljivanje uloge p1/p2)
        else if (data.type === 'join-room') {
            let assignedRole = 'spectator';
            
            if (!players.p1) {
                players.p1 = ws;
                assignedRole = 'p1';
            } else if (!players.p2) {
                players.p2 = ws;
                assignedRole = 'p2';
            }
            
            const info = clients.get(ws);
            info.role = assignedRole;
            clients.set(ws, info);

            // Odgovori klijentu sa dodeljenom ulogom
            ws.send(JSON.stringify({ type: 'init-role', role: assignedRole }));

            // Ako su oba igrača tu, pokreni igru
            if (players.p1 && players.p2) {
                players.p1.send(JSON.stringify({ type: 'start-game' }));
                players.p2.send(JSON.stringify({ type: 'start-game' }));
            }
        }
        
        // 3. Update pozicija igrača
        else if (data.type === 'player-update') {
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'opponent-update', ...data }));
                }
            });
        }
        
        // 4. Update paka (samo Master)
        else if (data.type === 'puck-update') {
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message.toString());
                }
            });
        }
        
        // 5. Ostale poruke (chat, golovi...)
        else {
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message.toString());
                }
            });
        }
    });

    ws.on('close', () => {
        const info = clients.get(ws);
        if (info && info.role === 'p1') players.p1 = null;
        if (info && info.role === 'p2') players.p2 = null;
        
        clients.delete(ws);
        
        // Obavesti ostale da je neko izašao
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'player-left' }));
            }
        });

        // Reizbor Mastera ako je trenutni izašao
        // Pronađi prvi aktivni WebSocket objekat i izvuci njegov ID iz mape
if (masterId === info?.id && clients.size > 0) {
    const firstClientWs = clients.keys().next().value;
    masterId = clients.get(firstClientWs).id;
}
    });
});

server.listen(3000, () => console.log('Server radi na portu 3000'));