import ffmpeg from 'fluent-ffmpeg'
import webp from 'node-webpmux'
import path from 'path'
import fs from 'fs'

function convertToWebp(inputPath, outputPath, isVideo, maxSeconds) {
    return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath)

        // Redimensiona SEM distorcer e depois preenche o resto com fundo
        // transparente até fechar exatamente 512x512 — sem isso, gif/vídeo
        // que não é quadrado (a maioria) saía esticado/deformado, porque o
        // WhatsApp força a figurinha a caber num quadrado 512x512.
        const scaleAndPad =
            'scale=512:512:force_original_aspect_ratio=decrease,' +
            'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'

        if (isVideo) {
            command = command.outputOptions([
                '-vcodec libwebp',
                `-vf ${scaleAndPad},fps=15,format=rgba`,
                '-loop 0',
                '-ss 00:00:00',
                `-t ${maxSeconds}`,
                '-an',
                '-vsync 0',
                '-preset default',
                '-compression_level 6',
                '-quality 60'
            ])
        } else {
            command = command.outputOptions([
                '-vcodec libwebp',
                `-vf ${scaleAndPad},format=rgba`,
                '-compression_level 6',
                '-quality 80'
            ])
        }

        command
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject)
    })
}

// Injeta o EXIF do WhatsApp (nome do pack + autor) no .webp.
// Isso estava sendo recebido pela função mas nunca era usado —
// por isso as figurinhas saíam sem a marca "Coconut Bot".
async function writeExif(webpPath, packName, author) {
    const img = new webp.Image()

    const json = {
        'sticker-pack-id': `cocokinho-${Date.now()}`,
        'sticker-pack-name': packName,
        'sticker-pack-publisher': author,
        emojis: ['🥥']
    }

    const exifHeader = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ])

    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
    const exif = Buffer.concat([exifHeader, jsonBuffer])
    exif.writeUIntLE(jsonBuffer.length, 14, 4)

    await img.load(webpPath)
    img.exif = exif
    await img.save(webpPath)
}

export async function convertToSticker(inputPath, isVideo, stickerPack, stickerAuthor, maxSeconds = 10) {
    if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp', { recursive: true })
    }

    const outputPath = path.join('./temp', `sticker_${Date.now()}.webp`)

    await convertToWebp(inputPath, outputPath, isVideo, maxSeconds)
    await writeExif(outputPath, stickerPack, stickerAuthor)

    return outputPath
}
