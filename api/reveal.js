// api/reveal.js
import { kv } from '@vercel/kv';
import { participants } from '../_lib/data.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido.' });
    }
    
    const { drawerId } = request.body;

    if (!drawerId) {
        return response.status(400).json({ error: 'ID do participante não fornecido.' });
    }
    
    // Busca os dados atuais do KV
    const drawResults = await kv.get('drawResults');
    const revealedDraws = await kv.get('revealedDraws') || {};

    if (!drawResults) {
        return response.status(500).json({ error: 'O sorteio ainda não foi realizado. Um administrador precisa reiniciar o sorteio.' });
    }
    
    // Se já revelou, apenas retorna o resultado anterior para consistência
    if (revealedDraws[drawerId]) {
         const previouslyDrawnId = drawResults[drawerId];
         const previouslyDrawnParticipant = participants.find(p => p.id === previouslyDrawnId);
         return response.status(200).json(previouslyDrawnParticipant);
    }
    
    const drawnId = drawResults[drawerId];
    if (!drawnId) {
        return response.status(404).json({ error: 'Sorteio não encontrado para este participante.' });
    }

    // Marca que esta pessoa revelou
    revealedDraws[drawerId] = true;
    
    // Salva o objeto de revelados atualizado de volta no KV
    await kv.set('revealedDraws', revealedDraws);
    
    const drawnParticipant = participants.find(p => p.id === drawnId);
    if (!drawnParticipant) {
        return response.status(500).json({ error: 'Ocorreu um erro ao encontrar o participante sorteado.' });
    }

    response.status(200).json(drawnParticipant);
}