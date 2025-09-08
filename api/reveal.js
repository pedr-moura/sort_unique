// api/reveal.js
import { put, list } from '@vercel/blob';
import { participants } from '../_lib/data.js';

// Função auxiliar para buscar um arquivo JSON do blob pela URL
async function getJsonBlob(pathname) {
    try {
        const { blobs } = await list({ prefix: pathname, limit: 1 });
        if (blobs.length === 0) return null;
        
        const response = await fetch(blobs[0].url);
        return await response.json();
    } catch (e) {
        return null;
    }
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido.' });
    }
    
    const { drawerId } = request.body;
    if (!drawerId) {
        return response.status(400).json({ error: 'ID do participante não fornecido.' });
    }
    
    // 1. LER os dados atuais do Blob
    const drawResults = await getJsonBlob('data/drawResults.json');
    const revealedDraws = await getJsonBlob('data/revealedDraws.json') || {};

    if (!drawResults) {
        return response.status(500).json({ error: 'Sorteio não foi realizado.' });
    }
    
    if (revealedDraws[drawerId]) {
         const drawnId = drawResults[drawerId];
         const participant = participants.find(p => p.id === drawnId);
         return response.status(200).json(participant);
    }
    
    // 2. MODIFICAR os dados na memória
    revealedDraws[drawerId] = true;
    
    // 3. ESCREVER o arquivo inteiro de volta no Blob
    try {
        await put('data/revealedDraws.json', JSON.stringify(revealedDraws), { access: 'public', contentType: 'application/json' });
    } catch (error) {
        return response.status(500).json({ error: 'Falha ao salvar a revelação.' });
    }

    const drawnId = drawResults[drawerId];
    const drawnParticipant = participants.find(p => p.id === drawnId);
    response.status(200).json(drawnParticipant);
}