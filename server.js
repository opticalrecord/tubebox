const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const yts = require('yt-search');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let queue = [];

app.use(express.static(path.join(__dirname, 'public')));

app.get('/search', async (req, res) => {
    try {
        const query = (req.query.q || 'music') + " official audio";
        const r = await yts(query);
        const results = r.videos.slice(0, 5).map(v => ({
            id: v.videoId,
            title: v.title.toUpperCase(),
            duration: v.timestamp,
            seconds: v.seconds,
            image: v.thumbnail 
        }));
        res.json(results);
    } catch (err) { res.status(500).json([]); }
});

io.on('connection', (socket) => {
    sendUpdate();

    socket.on('add-to-queue', (song) => {
        if (!song || !song.id) return;
        queue.push(song);
        sendUpdate();
        if (queue.length === 1) io.emit('play-song', queue[0]);
    });

    socket.on('next-track', () => {
        if (queue.length > 0) {
            queue.shift();
            sendUpdate();
            if (queue.length > 0) io.emit('play-song', queue[0]);
            else io.emit('stop-player');
        }
    });

    function sendUpdate() {
        // Calcola i secondi totali (somma di tutta la coda)
        const totalSeconds = queue.reduce((acc, s) => acc + (s.seconds || 0), 0);
        io.emit('update-queue', {
            list: queue,
            totalWait: totalSeconds
        });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`RADIO AMBRA ONLINE SULLA PORTA ${PORT}`));