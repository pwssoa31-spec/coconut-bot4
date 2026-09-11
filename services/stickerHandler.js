import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { convertToSticker } from './stickerService.js'
import config from '../config/botConfig.js'
import fs from 'fs'
import path from 'path'

export async function createSticker({
    client,
    message,
    isImage,
    isVideo
}) {
    if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp', { recursive: true })
    }

    const inputPath = path.join('./temp', `input_${Date.now()}`)
    let stickerPath

    try {
        const buffer = await downloadMediaMessage(
            message,
            'buffer',
            {}
        )

        fs.writeFileSync(inputPath, buffer)

        stickerPath = await convertToSticker(
            inputPath,
            isVideo,
            config.stickerPack,
            config.stickerAuthor,
            config.maxVideoSeconds
        )

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await client.sendMessage(
                    message.key.remoteJid,
                    {
                        sticker: fs.readFileSync(stickerPath)
                    },
                    { quoted: message }
                )

                break
            } catch (error) {
                console.log(`Tentativa ${attempt} falhou`)

                if (attempt === 3) {
                    throw error
                }
            }
        }

        if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath)
        }

        if (fs.existsSync(stickerPath)) {
            fs.unlinkSync(stickerPath)
        }

    } catch (error) {
        if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath)
        }

        if (stickerPath && fs.existsSync(stickerPath)) {
            fs.unlinkSync(stickerPath)
        }

        throw error
    }
}
