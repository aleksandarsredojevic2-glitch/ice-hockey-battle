const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Struktura: rooms['imeSobe'] = { players: [], masterId: null }
const rooms = {};

app.use(express.static(__dirname));

wss.on('connection', (ws) => {
    let myRoom = null;
    let myId = Math.random().toString(36).substr(2, 9);

    ws.on('message', (message) => {
        let data;
        try { data = JSON.parse(message); } catch (e) { return; }

        // 1. Join Room
        if (data.type === 'join-room') {
            myRoom = data.room;
            if (!rooms[myRoom]) {
                rooms[myRoom] = { players: [], masterId: null };
            }

            const room = rooms[myRoom];
            room.players.push({ ws, id: myId, nick: data.nick || 'Anonimus' });

            // Prvi igrač u sobi postaje Master
            if (!room.masterId) room.masterId = myId;

            ws.send(JSON.stringify({ type: 'init', id: myId, isMaster: (myId === room.masterId) }));
            console.log(`Igrač ${myId} ušao u sobu ${myRoom}`);
        }

        // 2. Broadcast u okviru sobe
        else if (data.type === 'player-update' || data.type === 'puck-update') {
            if (!myRoom || !rooms[myRoom]) return;
            
            rooms[myRoom].players.forEach(client => {
                if (client.ws !== ws && client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(JSON.stringify({ type: data.type, senderId: myId, ...data }));
                }
            });
        }
        
        // 3. Chat u okviru sobe
        else if (data.type === 'chat-message') {
            if (!myRoom || !rooms[myRoom]) return;
            rooms[myRoom].players.forEach(client => {
                client.ws.send(JSON.stringify({ type: 'chat', nick: data.nick, text: data.text }));
            });
        }
    });

    ws.on('close', () => {
        if (myRoom && rooms[myRoom]) {
            rooms[myRoom].players = rooms[myRoom].players.filter(p => p.id !== myId);
            
            // Ako je Master izašao, dodeli novog
            if (rooms[myRoom].masterId === myId && rooms[myRoom].players.length > 0) {
                rooms[myRoom].masterId = rooms[myRoom].players[0].id;
                rooms[myRoom].players[0].ws.send(JSON.stringify({ type: 'promote-to-master' }));
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server radi na portu ${PORT}`));