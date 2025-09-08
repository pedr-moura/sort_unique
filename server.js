const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const participants = [
    { id: 1, name: 'Ana Silva', photoUrl: 'https://placehold.co/200x200/1a1a2a/00ffff?text=Ana' },
    { id: 2, name: 'Bruno Costa', photoUrl: 'https://placehold.co/200x200/1a1a2a/00ffff?text=Bruno' },
    { id: 3, name: 'Carla Dias', photoUrl: 'https://placehold.co/200x200/1a1a2a/00ffff?text=Carla' },
    { id: 4, name: 'Daniel Faria', photoUrl: 'https://placehold.co/200x200/1a1a2a/00ffff?text=Daniel' },
    { id: 5, name: 'Elisa Gomes', photoUrl: 'https://placehold.co/200x200/1a1a2a/00ffff?text=Elisa' },
    { id: 6, name: 'Fábio Lima', photoUrl: 'https://placehold.co/200x200/1a1a2a/00ffff?text=F%C3%A1bio' },
    { id: 7, name: 'Sofia Oliveira', photoUrl: 'https://placehold.co/200x200/1a1a2a/00ffff?text=Sofia' },
    { id: 8, name: 'Ricardo Pereira', photoUrl: 'https://placehold.co/200x200/1a1a2a/00ffff?text=Ricardo' }
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
