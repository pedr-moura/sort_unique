// api/participants.js
import { kv } from '@vercel/kv';
import { participants } from '../_lib/data.js';

export default async function handler(request, response) {
    // Busca o objeto de quem já revelou do KV
    const revealedDraws = await kv.get('revealedDraws') || {};

    const participantsWithStatus = participants.map(p => ({
        ...p,
        hasRevealed: !!revealedDraws[p.id]
    }));

    response.setHeader('Cache-Control', 'no-cache'); // Para garantir dados sempre atualizados
    response.status(200).json(participantsWithStatus);
}