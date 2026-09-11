import {
    getSenderIdentities,
    findParticipant,
    getBotIdentities,
    isAdminParticipant
} from '../services/groupUtils.js'

export default {
    name: 'ban',
    aliases: ['banir', 'kick', 'expulsar'],

    async execute(client, message) {
        const Jid = message.key.remoteJid

        if (!Jid.endsWith('@g.us')) {
            return await client.sendMessage(
                Jid,
                { text: '❌ Esse comando só funciona dentro de grupo, mano.' },
                { quoted: message }
            )
        }

        const quotedParticipant =
            message.message?.extendedTextMessage?.contextInfo?.participant

        const mentionedParticipant =
            message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

        const mention = quotedParticipant || mentionedParticipant

        if (!mention) {
            return await client.sendMessage(
                Jid,
                {
                    text: 'Marca a mensagem da pessoa ou usa @ pra eu saber quem banir, mano! 🔨'
                },
                { quoted: message }
            )
        }

        // Só admin do grupo ou o próprio dono do bot pode banir
        const isOwner = message.key.fromMe
        const senderParticipant = isOwner
            ? null
            : await findParticipant(client, Jid, getSenderIdentities(message))
        const senderIsAdmin = isOwner || isAdminParticipant(senderParticipant)

        if (!senderIsAdmin) {
            return await client.sendMessage(
                Jid,
                {
                    text: '❌ Só admin do grupo (ou eu mesmo) pode banir alguém, mano.'
                },
                { quoted: message }
            )
        }

        // Pra remover alguém do grupo, EU (bot) preciso ser admin.
        // Regra do WhatsApp, não tem como contornar.
        const botParticipant = await findParticipant(client, Jid, getBotIdentities(client))

        if (botParticipant && !isAdminParticipant(botParticipant)) {
            return await client.sendMessage(
                Jid,
                {
                    text: '❌ Pra banir alguém eu preciso ser admin do grupo, mano. Me promove e tenta de novo.'
                },
                { quoted: message }
            )
        }

        // Trava de segurança: não deixa banir outro admin sem querer
        const targetParticipant = await findParticipant(client, Jid, [mention])

        if (isAdminParticipant(targetParticipant)) {
            return await client.sendMessage(
                Jid,
                { text: '❌ Não dá pra banir outro admin, mano.' },
                { quoted: message }
            )
        }

        try {
            await client.groupParticipantsUpdate(Jid, [mention], 'remove')

            await client.sendMessage(Jid, {
                text: `🔨 @${mention.split('@')[0]} foi banido do grupo!`,
                mentions: [mention]
            })
        } catch (error) {
            console.error('Erro ao banir:', error.message)

            await client.sendMessage(
                Jid,
                {
                    text: '❌ Não consegui remover essa pessoa do grupo. Confere se eu ainda sou admin.'
                },
                { quoted: message }
            )
        }
    }
}
