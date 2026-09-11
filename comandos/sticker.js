import { createSticker } from '../services/stickerHandler.js'

export default {
    name: 'sticker',
    aliases: ['s', 'fig', 'figurinha'],

    async execute(client, message) {
        const messageType = Object.keys(message.message || {})[0]

        const isImage =
            messageType === 'imageMessage'

        const isVideo =
            messageType === 'videoMessage'

        if (!isImage && !isVideo) {
            return await client.sendMessage(
                message.key.remoteJid,
                {
                    text: 'Envie uma imagem ou vídeo.'
                },
                { quoted: message }
            )
        }

        await createSticker({
            client,
            message,
            isImage,
            isVideo
        })
    }
}	
