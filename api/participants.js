// api/participants.js
import { list } from '@vercel/blob';
import { participants } from '../_lib/data.js';

async function getRevealedDraws() {
    try {
        const { blobs } = await list({ prefix: 'data/revealedDraws.json', limit: 1 });
        if (blobs.length === 0) return {};
        
        const response = await fetch(blobs[0].url);
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar revealedDraws.json:", error);
        return {}; // Retorna vazio em caso de erro
    }
}

export default async function handler(request, response) {
    const revealedDraws = await getRevealedDraws();

    const participantsWithStatus = participants.map(p => ({
        ...p,
        hasRevealed: !!revealedDraws[p.id]
    }));

    response.setHeader('Cache-Control', 'no-cache');
    response.status(200).json(participantsWithStatus);
}