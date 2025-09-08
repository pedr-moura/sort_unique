// api/reset.js
import { kv } from '@vercel/kv';
import { participants } from '../_lib/data.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    const participantIds = participants.map(p => p.id);
    let receivers = [...participantIds];
    let validDraw = false;
    let drawResults = {};

    // Sua lógica de sorteio para garantir que ninguém tire a si mesmo
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

    // Salva os resultados e limpa as revelações no Vercel KV
    await kv.set('drawResults', drawResults);
    await kv.set('revealedDraws', {}); // Limpa as revelações anteriores

    console.log('Sorteio secreto realizado e salvo no Vercel KV.');
    response.status(200).json({ message: 'Sorteio reiniciado com sucesso!' });
}