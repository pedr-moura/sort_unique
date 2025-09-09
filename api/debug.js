// api/debug.js - Script completo para testar o Vercel Blob Storage
import { put, list, del } from '@vercel/blob';
import { participants } from '../_lib/data.js';

export default async function handler(request, response) {
    const results = {
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL_ENV || 'local',
        tests: {},
        summary: { passed: 0, failed: 0, total: 0 }
    };

    // Helper para registrar resultados dos testes
    function logTest(name, success, data = null, error = null) {
        results.tests[name] = {
            success,
            data,
            error: error?.message || error,
            timestamp: new Date().toISOString()
        };
        
        if (success) {
            results.summary.passed++;
            console.log(`✅ ${name}:`, data || 'OK');
        } else {
            results.summary.failed++;
            console.error(`❌ ${name}:`, error?.message || error);
        }
        results.summary.total++;
    }

    try {
        console.log('🧪 Iniciando testes do Blob Storage...');

        // TESTE 1: Verificar variáveis de ambiente
        console.log('\n1️⃣ Verificando configuração...');
        const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
        const tokenPrefix = hasToken ? process.env.BLOB_READ_WRITE_TOKEN.substring(0, 20) + '...' : 'não configurado';
        
        logTest('environment_check', hasToken, {
            hasToken,
            tokenPrefix,
            environment: results.environment,
            participantsCount: participants.length
        });

        if (!hasToken) {
            throw new Error('BLOB_READ_WRITE_TOKEN não está configurado');
        }

        // TESTE 2: Testar escrita básica
        console.log('\n2️⃣ Testando escrita básica...');
        const testData = {
            message: 'Hello from debug test',
            timestamp: new Date().toISOString(),
            participants: participants.length,
            random: Math.random()
        };

        const { url: testUrl } = await put('debug/test-write.json', JSON.stringify(testData, null, 2), {
            access: 'public',
            contentType: 'application/json'
        });

        logTest('basic_write', true, { url: testUrl });

        // TESTE 3: Testar listagem
        console.log('\n3️⃣ Testando listagem de arquivos...');
        const { blobs } = await list({ prefix: 'debug/' });
        
        logTest('list_files', true, {
            filesFound: blobs.length,
            files: blobs.map(blob => ({
                pathname: blob.pathname,
                size: blob.size,
                uploadedAt: blob.uploadedAt
            }))
        });

        // TESTE 4: Testar leitura
        console.log('\n4️⃣ Testando leitura...');
        if (blobs.length > 0) {
            const readResponse = await fetch(blobs[0].url);
            const readData = await readResponse.json();
            
            logTest('read_file', true, {
                url: blobs[0].url,
                data: readData
            });
        } else {
            logTest('read_file', false, null, 'Nenhum arquivo encontrado para leitura');
        }

        // TESTE 5: Simular estrutura do sorteio
        console.log('\n5️⃣ Testando estrutura do sorteio...');
        
        // Simular drawResults
        const mockDrawResults = {};
        for (let i = 0; i < participants.length; i++) {
            const giver = participants[i].id;
            const receiver = participants[(i + 1) % participants.length].id; // Rotação simples para teste
            mockDrawResults[giver] = receiver;
        }

        const mockRevealedDraws = {};

        // Salvar estrutura de teste
        const { url: drawUrl } = await put('debug/mock-drawResults.json', JSON.stringify(mockDrawResults, null, 2), {
            access: 'public',
            contentType: 'application/json'
        });

        const { url: revealedUrl } = await put('debug/mock-revealedDraws.json', JSON.stringify(mockRevealedDraws, null, 2), {
            access: 'public',
            contentType: 'application/json'
        });

        logTest('sorteio_structure', true, {
            drawResults: { url: drawUrl, pairs: Object.keys(mockDrawResults).length },
            revealedDraws: { url: revealedUrl, revealed: Object.keys(mockRevealedDraws).length }
        });

        // TESTE 6: Testar atualização (simulando uma revelação)
        console.log('\n6️⃣ Testando atualização (simulando revelação)...');
        
        // Marcar primeiro participante como revelado
        const firstParticipantId = participants[0].id.toString();
        mockRevealedDraws[firstParticipantId] = true;

        const { url: updatedUrl } = await put('debug/mock-revealedDraws.json', JSON.stringify(mockRevealedDraws, null, 2), {
            access: 'public',
            contentType: 'application/json'
        });

        // Verificar se a atualização funcionou
        const checkResponse = await fetch(updatedUrl);
        const checkData = await checkResponse.json();
        const wasUpdated = !!checkData[firstParticipantId];

        logTest('update_test', wasUpdated, {
            url: updatedUrl,
            participantId: firstParticipantId,
            wasMarked: wasUpdated,
            data: checkData
        });

        // TESTE 7: Verificar arquivos reais do sorteio (se existirem)
        console.log('\n7️⃣ Verificando arquivos reais do sorteio...');
        
        const realFiles = await list({ prefix: 'data/' });
        const hasDrawResults = realFiles.blobs.some(blob => blob.pathname === 'data/drawResults.json');
        const hasRevealedDraws = realFiles.blobs.some(blob => blob.pathname === 'data/revealedDraws.json');

        logTest('real_sorteio_files', true, {
            totalFiles: realFiles.blobs.length,
            hasDrawResults,
            hasRevealedDraws,
            files: realFiles.blobs.map(blob => ({
                pathname: blob.pathname,
                size: blob.size,
                uploadedAt: blob.uploadedAt
            }))
        });

        // TESTE 8: Limpar arquivos de teste
        console.log('\n8️⃣ Limpando arquivos de teste...');
        const debugFiles = await list({ prefix: 'debug/' });
        let deletedCount = 0;
        
        for (const blob of debugFiles.blobs) {
            try {
                await del(blob.url);
                deletedCount++;
            } catch (error) {
                console.warn(`Aviso: Não foi possível deletar ${blob.pathname}`);
            }
        }

        logTest('cleanup', true, { deletedFiles: deletedCount });

        // Resultado final
        console.log('\n📊 Resumo dos testes:');
        console.log(`✅ Passou: ${results.summary.passed}`);
        console.log(`❌ Falhou: ${results.summary.failed}`);
        console.log(`📝 Total: ${results.summary.total}`);

        const allPassed = results.summary.failed === 0;
        
        response.status(200).json({
            success: allPassed,
            message: allPassed 
                ? '🎉 Todos os testes passaram! Blob Storage está funcionando perfeitamente!'
                : '⚠️ Alguns testes falharam. Verifique os detalhes.',
            results,
            recommendations: allPassed ? [
                '✅ Blob Storage configurado corretamente',
                '✅ Pode executar o sorteio com segurança',
                '✅ Sistema pronto para produção'
            ] : [
                '❌ Verifique as variáveis de ambiente',
                '❌ Confirme se o projeto está conectado ao Blob',
                '❌ Verifique os logs para mais detalhes'
            ]
        });

    } catch (error) {
        console.error('💥 Erro crítico nos testes:', error);
        
        logTest('critical_error', false, null, error);
        
        response.status(500).json({
            success: false,
            message: '💥 Erro crítico durante os testes',
            error: error.message,
            results,
            recommendations: [
                'Verifique se BLOB_READ_WRITE_TOKEN está configurado',
                'Confirme se o projeto está conectado ao Blob Store',
                'Verifique as permissões do token',
                'Consulte os logs do Vercel para mais detalhes'
            ]
        });
    }
}
