import { muteUser } from '../services/muteStore.js'
import {
    getSenderIdentities,
    getParticipantIdentities,
    getBotIdentities,
    findParticipant,
    isAdminParticipant
} from '../services/groupUtils.js'

export default {
    name: 'mute',
    aliases: ['mutar', 'silenciar'],

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
                    text: 'Marca a mensagem da pessoa ou usa @ pra eu saber quem mutar, mano! 🤐'
                },
                { quoted: message }
            )
        }

        // Só admin do grupo ou o próprio dono do bot (mandando pelo número dele) pode mutar
        const isOwner = message.key.fromMe
        const senderParticipant = isOwner
            ? null
            : await findParticipant(client, Jid, getSenderIdentities(message))
        const senderIsAdmin = isOwner || isAdminParticipant(senderParticipant)

        if (!senderIsAdmin) {
            return await client.sendMessage(
                Jid,
                {
                    text: '❌ Só admin do grupo (ou eu mesmo) pode mutar alguém, mano.'
                },
                { quoted: message }
            )
        }

        // Pra apagar mensagem de outra pessoa no grupo, EU (bot) preciso ser admin.
        // Isso é uma regra do WhatsApp, não tem como contornar.
        const botParticipant = await findParticipant(client, Jid, getBotIdentities(client))

        if (botParticipant && !isAdminParticipant(botParticipant)) {
            return await client.sendMessage(
                Jid,
                {
                    text: '❌ Pra mutar alguém eu preciso ser admin do grupo, mano. Me promove e tenta de novo.'
                },
                { quoted: message }
            )
        }

        const targetIdentities = await getParticipantIdentities(client, Jid, mention)
        muteUser(Jid, targetIdentities)

        await client.sendMessage(
            Jid,
            {
                text: `🔇 @${mention.split('@')[0]} foi mutado! A partir de agora eu apago na hora qualquer mensagem que ele(a) mandar aqui, até um admin dar /unmute.`,
                mentions: [mention]
            },
            { quoted: message }
        )
    }
}
