import { unmuteUser } from '../services/muteStore.js'
import {
    getSenderIdentities,
    getParticipantIdentities,
    findParticipant,
    isAdminParticipant
} from '../services/groupUtils.js'

export default {
    name: 'unmute',
    aliases: ['desmutar'],

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
                    text: 'Marca a mensagem da pessoa ou usa @ pra eu saber quem desmutar, mano!'
                },
                { quoted: message }
            )
        }

        const isOwner = message.key.fromMe
        const senderParticipant = isOwner
            ? null
            : await findParticipant(client, Jid, getSenderIdentities(message))
        const senderIsAdmin = isOwner || isAdminParticipant(senderParticipant)

        if (!senderIsAdmin) {
            return await client.sendMessage(
                Jid,
                {
                    text: '❌ Só admin do grupo (ou eu mesmo) pode desmutar alguém, mano.'
                },
                { quoted: message }
            )
        }

        const targetIdentities = await getParticipantIdentities(client, Jid, mention)
        unmuteUser(Jid, targetIdentities)

        await client.sendMessage(
            Jid,
            {
                text: `🔊 @${mention.split('@')[0]} foi desmutado! Pode falar de novo.`,
                mentions: [mention]
            },
            { quoted: message }
        )
    }
}
