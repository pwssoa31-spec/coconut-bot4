export default {
    name: 'brincadeiras',
    aliases: ['dançar', 'secsu', 'femboy', 'tortura'],

    async execute(client, message, args, commandName) {

        const listaDeGifs = {
            dançar: [
                'https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyNzEzaDY2NzBjMnNuaHNjNXI1dWxxaWJmb3lva2Rsb2lkYTRxdDN1MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/6k6iDdi5NN8ZO/giphy.mp4'
            ],

            secsu: [
                'https://i.gifer.com/BnnZ.mp4'
            ],

            femboy: [
                'https://files.catbox.moe/5q6tz4.mp4'
            ],

            tortura: [
                'https://media2.giphy.com/media/v1.Y2lkPTZjMDliOTUyc3p0Nnp3aDd6cTczbGw2d3FkbmRhZ3FwOTFwcWJ6eTdscDRpbWRueiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uvv1xlWDAaruQJ3etW/giphy.mp4'
            ]
        };

        const Jid = message.key.remoteJid;

        // Pessoa marcada por reply
        const quotedParticipant =
            message.message?.extendedTextMessage?.contextInfo?.participant;

        // Pessoa marcada com @
        const mentionedParticipant =
            message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        // Prioriza reply, depois menção
        const mention = quotedParticipant || mentionedParticipant;

        if (!mention) {
            return await client.sendMessage(
                Jid,
                {
                    text: `Mano, você precisa marcar a mensagem de alguém ou usar o @ para usar o comando /${commandName}! 🤙`
                },
                { quoted: message }
            );
        }

        const gifsDoComando = listaDeGifs[commandName];

        if (!gifsDoComando || gifsDoComando.length === 0) {
            return await client.sendMessage(
                Jid,
                {
                    text: '❌ Nenhum GIF configurado para este comando ainda, mano!'
                },
                { quoted: message }
            );
        }

        const gifAleatorio =
            gifsDoComando[Math.floor(Math.random() * gifsDoComando.length)];

        const autorMensagem =
            message.key.participant ||
            message.participant ||
            message.key.remoteJid;

        const quemMandou = `@${autorMensagem.split('@')[0]}`;
        const quemRecebeu = `@${mention.split('@')[0]}`;

        let textoAcao = '';

        if (commandName === 'dançar') {
            textoAcao = `🕺 ${quemMandou} dançou com ${quemRecebeu}!`;
        } else if (commandName === 'secsu') {
            textoAcao = `😳 ${quemMandou} fez secsu com ${quemRecebeu}!`;
        } else if (commandName === 'femboy') {
            textoAcao = `🏳️‍⚧️ ${quemMandou} ativou a carta mágica em ${quemRecebeu}!`;
        } else if (commandName === 'tortura') {
            textoAcao = `🔪 ${quemMandou} torturou ${quemRecebeu} até a morte!`;
        }

        try {
            await client.sendMessage(
                Jid,
                {
                    video: { url: gifAleatorio },
                    caption: textoAcao,
                    gifPlayback: true,
                    mentions: [autorMensagem, mention]
                },
                { quoted: message }
            );
        } catch (error) {
            console.error('Erro ao enviar comando de brincadeira:', error);

            await client.sendMessage(
                Jid,
                {
                    text: '❌ Ops! Não consegui carregar a mídia da ação.'
                },
                { quoted: message }
            );
        }
    }
};
