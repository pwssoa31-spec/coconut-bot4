import fs from 'fs'
import path from 'path'
import {
    isPinterestLink,
    resolvePinterestMedia,
    downloadMedia
} from '../services/pinterestService.js'
import { convertToSticker } from '../services/stickerService.js'
import config from '../config/botConfig.js'

export default {
    name: 'ps',
    aliases: ['pinterest', 'pin'],

    async execute(client, message, args) {
        const Jid = message.key.remoteJid
        const link = args?.[0]

        if (!link || !isPinterestLink(link)) {
            return await client.sendMessage(
                Jid,
                {
                    text:
                        'Manda assim: /ps <link do pin>\n' +
                        'Aceita link do app (pin.it/xxxx) ou do site (pinterest.com/pin/xxxx), imagem ou gif 🥥'
                },
                { quoted: message }
            )
        }

        if (!fs.existsSync('./temp')) {
            fs.mkdirSync('./temp', { recursive: true })
        }

        const inputPath = path.join('./temp', `pin_${Date.now()}`)
        let stickerPath

        try {
            const media = await resolvePinterestMedia(link)

            if (!media) {
                return await client.sendMessage(
                    Jid,
                    {
                        text: '❌ O Pinterest não deixou eu ver a mídia real desse pin (às vezes ele bloqueia acesso direto). Tenta abrir o pin no app, copiar o link de novo ou usar o link do site em vez do pin.it.'
                    },
                    { quoted: message }
                )
            }

            const buffer = await downloadMedia(media.url)
            fs.writeFileSync(inputPath, buffer)

            stickerPath = await convertToSticker(
                inputPath,
                media.isVideo,
                config.stickerPack,
                config.stickerAuthor,
                config.maxVideoSeconds
            )

            await client.sendMessage(
                Jid,
                { sticker: fs.readFileSync(stickerPath) },
                { quoted: message }
            )
        } catch (error) {
            console.error('Erro no /ps:', error.message)

            await client.sendMessage(
                Jid,
                {
                    text: '❌ Deu ruim pra pegar essa mídia do Pinterest. Tenta outro link.'
                },
                { quoted: message }
            )
        } finally {
            if (fs.existsSync(inputPath)) {
                fs.unlinkSync(inputPath)
            }

            if (stickerPath && fs.existsSync(stickerPath)) {
                fs.unlinkSync(stickerPath)
            }
        }
    }
}
