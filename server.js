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
    socket.emit('update-queue', { list: queue });

    socket.on('audio-level', (level) => {
        socket.broadcast.emit('vibe-check', level);
    });

    socket.on('time-left', (seconds) => {
        socket.broadcast.emit('sync-countdown', seconds);
    });

    socket.on('add-to-queue', (song) => {
        if (!song || !song.id) return;
        queue.push(song);
        io.emit('update-queue', { list: queue });
        if (queue.length === 1) io.emit('play-song', queue[0]);
    });

    socket.on('next-track', () => {
        if (queue.length > 0) {
            queue.shift();
            io.emit('update-queue', { list: queue });
            if (queue.length > 0) io.emit('play-song', queue[0]);
            else io.emit('stop-player');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`YOUTUBOX ONLINE`));
