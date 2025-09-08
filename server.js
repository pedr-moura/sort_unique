const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const participants = [
    { id: 1, name: 'Pedro', photoUrl: 'https://i.ibb.co/W4vWz3kp/11.png' },
    { id: 2, name: 'Lucas', photoUrl: 'https://i.ibb.co/LDRKbS3h/66.png' },
    { id: 3, name: 'Edinaldo', photoUrl: 'https://i.ibb.co/9kSSnLr6/77.png' },
    { id: 4, name: 'Sergio', photoUrl: 'https://i.ibb.co/xSJVcDfc/55.png' },
    { id: 5, name: 'Ana Clara', photoUrl: 'https://i.ibb.co/kgHxK41P/33.png' },
    { id: 6, name: 'Ana Bea', photoUrl: 'https://i.ibb.co/hFj0YLS5/88.png' },
    { id: 7, name: 'Maria', photoUrl: 'https://i.ibb.co/fz854jQy/22.png' },
    { id: 8, name: 'Phablo', photoUrl: 'https://i.ibb.co/ZpfQ8KF9/44.png' },
    { id: 9, name: 'Isaías', photoUrl: 'https://i.ibb.co/ZpcCjdNn/C-digo-de-Isa-as.jpg' }
];

let drawResults = {};
let revealedDraws = {};

function performDraw() {
    const participantIds = participants.map(p => p.id);
    let receivers = [...participantIds];
    let validDraw = false;

    while (!validDraw) {
        receivers.sort(() => Math.random() - 0.5);
        let selfDrawFound = false;
        for (let i = 0; i < participantIds.length; i++) {
            if (participantIds[i] === receivers[i]) {
                selfDrawFound = true;
                break;
            }
        }
        if (!selfDrawFound) {
            validDraw = true;
            for (let i = 0; i < participantIds.length; i++) {
                drawResults[participantIds[i]] = receivers[i];
            }
        }
    }
    console.log('Sorteio secreto realizado no servidor.');
}

app.get('/api/participants', (req, res) => {
    const participantsWithStatus = participants.map(p => ({
        ...p,
        hasRevealed: !!revealedDraws[p.id]
    }));
    res.json(participantsWithStatus);
});

app.post('/api/reveal', (req, res) => {
    const { drawerId } = req.body;

    if (!drawerId) {
        return res.status(400).json({ error: 'ID do participante não fornecido.' });
    }

    if (revealedDraws[drawerId]) {
         const previouslyDrawnId = drawResults[drawerId];
         const previouslyDrawnParticipant = participants.find(p => p.id === previouslyDrawnId);
         return res.json(previouslyDrawnParticipant);
    }
    
    const drawnId = drawResults[drawerId];
    if (!drawnId) {
        return res.status(404).json({ error: 'Sorteio não encontrado para este participante.' });
    }

    revealedDraws[drawerId] = true;

    const drawnParticipant = participants.find(p => p.id === drawnId);
    if (!drawnParticipant) {
        return res.status(500).json({ error: 'Ocorreu um erro ao encontrar o participante sorteado.' });
    }

    res.json(drawnParticipant);
});

app.post('/api/reset', (req, res) => {
    revealedDraws = {};
    performDraw();
    res.status(200).json({ message: 'Sorteio reiniciado com sucesso!' });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    performDraw();
});
