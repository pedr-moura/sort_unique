// api/reset.js - Versão melhorada com logs detalhados
import { put, list } from '@vercel/blob';
import { participants } from '../_lib/data.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    console.log('🎯 === INICIANDO RESET DO SORTEIO ===');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🌍 Environment:', process.env.VERCEL_ENV || 'local');
    
    // Verificar configuração
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    console.log('🔑 Token configurado:', hasToken ? '✅ Sim' : '❌ Não');
    
    if (!hasToken) {
        console.error('❌ BLOB_READ_WRITE_TOKEN não encontrado');
        return response.status(500).json({ 
            error: 'Token do Blob não configurado',
            solution: 'Adicione BLOB_READ_WRITE_TOKEN nas variáveis de ambiente do Vercel'
        });
    }

    console.log('📊 Participantes carregados:', participants.length);
    participants.forEach((p, index) => {
        console.log(`   ${index + 1}. ${p.name} (ID: ${p.id})`);
    });

    // Verificar arquivos existentes
    try {
        console.log('🔍 Verificando arquivos existentes...');
        const existingFiles = await list({ prefix: 'data/' });
        console.log('📁 Arquivos encontrados:', existingFiles.blobs.length);
        existingFiles.blobs.forEach(blob => {
            console.log(`   - ${blob.pathname} (${blob.size} bytes, ${blob.uploadedAt})`);
        });
    } catch (error) {
        console.warn('⚠️ Não foi possível listar arquivos existentes:', error.message);
    }

    // Gerar sorteio
    console.log('\n🎲 === GERANDO SORTEIO ===');
    const participantIds = participants.map(p => p.id);
    let receivers = [...participantIds];
    let validDraw = false;
    let drawResults = {};
    let attempts = 0;
    const maxAttempts = 1000;
    
    console.log('🎯 IDs dos participantes:', participantIds);
    
    while (!validDraw && attempts < maxAttempts) {
        attempts++;
        
        // Embaralhar
        receivers.sort(() => Math.random() - 0.5);
        
        // Verificar se alguém tirou a si mesmo
        let selfDrawFound = false;
        for (let i = 0; i < participantIds.length; i++) {
            if (participantIds[i] === receivers[i]) { 
                selfDrawFound = true;
                console.log(`   Tentativa ${attempts}: ${participantIds[i]} tirou a si mesmo`);
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

    if (!validDraw) {
        console.error('❌ Falha ao gerar sorteio válido após', attempts, 'tentativas');
        return response.status(500).json({ 
            error: `Não foi possível gerar um sorteio válido após ${attempts} tentativas.`,
            participants: participants.length
        });
    }

    console.log('✅ Sorteio válido gerado em', attempts, 'tentativas');
    console.log('🎁 Pares do sorteio:');
    Object.entries(drawResults).forEach(([giverId, receiverId]) => {
        const giver = participants.find(p => p.id == giverId);
        const receiver = participants.find(p => p.id == receiverId);
        console.log(`   ${giver.name} → ${receiver.name}`);
    });

    // Preparar dados para salvar
    const drawResultsJson = JSON.stringify(drawResults, null, 2);
    const revealedDrawsJson = JSON.stringify({}, null, 2);

    console.log('\n💾 === SALVANDO NO BLOB ===');
    console.log('📝 Tamanho drawResults:', drawResultsJson.length, 'chars');
    console.log('📝 Tamanho revealedDraws:', revealedDrawsJson.length, 'chars');

    try {
        // Salvar resultados do sorteio
        console.log('💾 Salvando drawResults.json...');
        const drawResultsUpload = await put('data/drawResults.json', drawResultsJson, { 
            access: 'public', 
            contentType: 'application/json'
        });
        console.log('✅ drawResults.json salvo:', drawResultsUpload.url);

        // Salvar estado das revelações (vazio inicialmente)
        console.log('💾 Salvando revealedDraws.json...');
        const revealedDrawsUpload = await put('data/revealedDraws.json', revealedDrawsJson, { 
            access: 'public', 
            contentType: 'application/json'
        });
        console.log('✅ revealedDraws.json salvo:', revealedDrawsUpload.url);

        // Verificar se os arquivos foram salvos corretamente
        console.log('\n🔍 Verificando arquivos salvos...');
        try {
            const verifyResponse1 = await fetch(drawResultsUpload.url);
            const verifyData1 = await verifyResponse1.json();
            console.log('✅ drawResults.json verificado:', Object.keys(verifyData1).length, 'pares');

            const verifyResponse2 = await fetch(revealedDrawsUpload.url);
            const verifyData2 = await verifyResponse2.json();
            console.log('✅ revealedDraws.json verificado:', Object.keys(verifyData2).length, 'revelações');
        } catch (verifyError) {
            console.warn('⚠️ Não foi possível verificar os arquivos:', verifyError.message);
        }

        console.log('\n🎉 === SORTEIO CONCLUÍDO COM SUCESSO ===');
        
        response.status(200).json({ 
            success: true,
            message: 'Sorteio reiniciado e salvo no Vercel Blob com sucesso!',
            details: {
                participants: participants.length,
                attempts: attempts,
                timestamp: new Date().toISOString(),
                files: {
                    drawResults: {
                        url: drawResultsUpload.url,
                        size: drawResultsJson.length
                    },
                    revealedDraws: {
                        url: revealedDrawsUpload.url, 
                        size: revealedDrawsJson.length
                    }
                }
            },
            // Para debugging (remover em produção se quiser)
            preview: {
                samplePairs: Object.entries(drawResults).slice(0, 3).map(([giverId, receiverId]) => {
                    const giver = participants.find(p => p.id == giverId);
                    const receiver = participants.find(p => p.id == receiverId);
                    return `${giver.name} → ${receiver.name}`;
                }),
                totalPairs: Object.keys(drawResults).length
            }
        });

    } catch (error) {
        console.error('❌ === ERRO AO SALVAR NO BLOB ===');
        console.error('Error:', error);
        console.error('Stack:', error.stack);
        
        response.status(500).json({ 
            success: false,
            error: 'Falha ao salvar o sorteio no Blob Storage',
            details: {
                message: error.message,
                attempts: attempts,
                participantsCount: participants.length
            },
            troubleshooting: [
                'Verifique se BLOB_READ_WRITE_TOKEN está configurado',
                'Confirme se o projeto está conectado ao Blob Store',
                'Verifique os logs do Vercel para mais detalhes',
                'Tente novamente em alguns minutos'
            ]
        });
    }
}
