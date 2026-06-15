const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map(); 
let players = { p1: null, p2: null }; 
let masterId = null; 

app.use(express.static(__dirname));

wss.on('connection', (ws) => {
    const id = Math.random().toString(36).substr(2, 9);
    clients.set(ws, { id: id, nick: 'Anonimus', role: 'spectator' });

    if (clients.size === 1) masterId = id;
    ws.send(JSON.stringify({ type: 'init', id: id, isMaster: (id === masterId) }));

    ws.on('message', (message) => {
        let data;
        try { data = JSON.parse(message); } catch (e) { return; }

        if (data.type === 'set-nick') {
            const info = clients.get(ws);
            info.nick = data.nick;
            clients.set(ws, info);
        }
        else if (data.type === 'join-room') {
            let assignedRole = 'spectator';
            if (!players.p1) { players.p1 = ws; assignedRole = 'p1'; } 
            else if (!players.p2) { players.p2 = ws; assignedRole = 'p2'; }
            
            const info = clients.get(ws);
            info.role = assignedRole;
            clients.set(ws, info);
            ws.send(JSON.stringify({ type: 'init-role', role: assignedRole }));
        // OVO TI JE FALILO: Provera da li su obojica tu
            if (players.p1 && players.p2) {
                console.log("Oba igrača su povezana, pokrećem igru!"); // Korisno za debug
                players.p1.send(JSON.stringify({ type: 'start-game' }));
                players.p2.send(JSON.stringify({ type: 'start-game' }));
   }
        }
        else if (data.type === 'player-update') {
            const senderInfo = clients.get(ws);
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'opponent-update', role: senderInfo.role, ...data }));
                }
            });
        }
        else if (data.type === 'puck-update') {
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message.toString());
                }
            });
        }
        else if (data.type === 'chat-message') {
            const senderInfo = clients.get(ws);
            const nick = senderInfo ? senderInfo.nick : "Anonimus";
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'chat-message', nick: nick, text: data.text }));
                }
            });
        }
    }); // OVO ZATVARA ws.on('message')

    ws.on('close', () => {
        const info = clients.get(ws);
        if (info && info.role === 'p1') players.p1 = null;
        if (info && info.role === 'p2') players.p2 = null;
        clients.delete(ws);
        
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'player-left' }));
            }
        });

        if (masterId === info?.id && clients.size > 0) {
            const firstClientWs = clients.keys().next().value;
            masterId = clients.get(firstClientWs).id;
        }
    });
});

const port = process.env.PORT || 3000; 
server.listen(port, '0.0.0.0', () => {
    console.log(`Server slusa na portu ${port}`);
});