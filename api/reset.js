// api/reset.js
import { put } from '@vercel/blob';
import { participants } from '../_lib/data.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    // Lógica do sorteio (a mesma de antes)
    const participantIds = participants.map(p => p.id);
    let receivers = [...participantIds];
    let validDraw = false;
    let drawResults = {};
    while (!validDraw) {
        receivers.sort(() => Math.random() - 0.5);
        let selfDrawFound = false;
        for (let i = 0; i < participantIds.length; i++) {
            if (participantIds[i] === receivers[i]) { selfDrawFound = true; break; }
        }
        if (!selfDrawFound) {
            validDraw = true;
            for (let i = 0; i < participantIds.length; i++) {
                drawResults[participantIds[i]] = receivers[i];
            }
        }
    }

    try {
        // Converte os objetos para string JSON
        const drawResultsJson = JSON.stringify(drawResults);
        const revealedDrawsJson = JSON.stringify({});

        // Faz o upload dos arquivos para o Vercel Blob, sobrescrevendo os antigos
        await put('data/drawResults.json', drawResultsJson, { access: 'public', contentType: 'application/json' });
        await put('data/revealedDraws.json', revealedDrawsJson, { access: 'public', contentType: 'application/json' });

        response.status(200).json({ message: 'Sorteio reiniciado e salvo no Vercel Blob!' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: 'Falha ao salvar o sorteio no Blob.' });
    }
}