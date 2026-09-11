import { jidNormalizedUser } from '@whiskeysockets/baileys'

// Contas novas do WhatsApp usam um ID interno (@lid) além do número de
// telefone normal (@s.whatsapp.net), e dependendo de onde a informação vem
// (contextInfo de menção, message.key, metadata do grupo) o campo tem nomes
// diferentes. Aqui a gente junta TODAS as variações possíveis de ID de uma
// vez, pra nunca mais perder a pessoa por causa de formato diferente.
const ID_FIELDS = [
    'id',
    'jid',
    'lid',
    'phoneNumber',
    'participant',
    'participantPn',
    'participantAlt'
]

function extractIdentities(source) {
    if (!source) return []

    return [...new Set(
        ID_FIELDS
            .map((field) => source[field])
            .filter(Boolean)
            .map((jid) => jidNormalizedUser(jid))
    )]
}

// Todas as variações de ID de quem MANDOU essa mensagem
export function getSenderIdentities(message) {
    const identities = extractIdentities(message.key)

    if (identities.length > 0) {
        return identities
    }

    // fallback (ex: mensagem privada, sem "participant")
    return message.key.remoteJid
        ? [jidNormalizedUser(message.key.remoteJid)]
        : []
}

// Acha o participante do grupo que bate com alguma das identidades passadas
export async function findParticipant(client, groupJid, identities) {
    try {
        const metadata = await client.groupMetadata(groupJid)

        return metadata.participants.find((p) =>
            extractIdentities(p).some((id) => identities.includes(id))
        ) || null
    } catch (error) {
        console.error('Erro ao buscar metadata do grupo:', error.message)
        return null
    }
}

export function isAdminParticipant(participant) {
    return (
        participant?.admin === 'admin' ||
        participant?.admin === 'superadmin'
    )
}

// Todas as variações de ID de um participante específico (usa a lista do
// grupo pra pegar todos os "apelidos" dele, não só o que foi marcado)
export async function getParticipantIdentities(client, groupJid, targetJid) {
    const targetId = jidNormalizedUser(targetJid)
    const participant = await findParticipant(client, groupJid, [targetId])

    if (participant) {
        const identities = extractIdentities(participant)
        if (identities.length > 0) return identities
    }

    return [targetId]
}

export function getBotIdentities(client) {
    return extractIdentities({
        id: client.user?.id,
        lid: client.user?.lid
    })
}
