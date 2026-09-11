export default {
    name: 'menu',
    aliases: ['ajuda', 'help'],

    async execute(client, message) {
        const Jid = message.key.remoteJid

        // 🌟 INSIRA O LINK DA IMAGEM DO SEU MENU AQUI:
        // Pode ser um link do Imgur, Pinterest ou qualquer link direto de imagem (.jpg ou .png)
        const urlImagemMenu = 'https://www.guiadasemana.com.br/contentFiles/system/pictures/2015/7/139413/original/oleo-de-coco-3.jpg'

        const textoMenu = `🥥🌴 MENU DO COCONUT BOT 🌴🥥
" BOT BANHADO NO ÓLEO DE COCO REAL "
━━━━━━━━━━━━━━━
 🥥 COMANDOS DISPONÍVEIS 🥥
━━━━━━━━━━━━━━━
🌴 /s
 🥥 transforma imagem ou gif em figurinha
🌴 /ps <link>
 🥥 figurinha a partir de um link do Pinterest
🌴 /mute
 🥥 muta quem vc marcar (só admin/bot)
🌴 /unmute
 🥥 desmuta quem vc marcar (só admin/bot)
🌴 /ban
 🥥 remove quem vc marcar do grupo (só admin/bot)
🌴 /femboy
 🥥 manda uma imagem perturbadora
🌴 /secsu
 🥥 faz amor com quem vc marcar
🌴 /dançar
 🥥 dança com quem vc marcar
🌴 /tortura
 🥥 tortura quem vc marcar
🌴 /menu
 🥥 mostra esse menu

━━━━━━━━━━━━━━━
 🌴🥥 COCONUT-BOT v1.0 🥥🌴`

        try {
            await client.sendMessage(Jid, {
                image: { url: urlImagemMenu },
                caption: textoMenu
            }, { quoted: message })
        } catch (error) {
            console.error('Erro ao enviar o menu:', error)
            await client.sendMessage(Jid, { text: textoMenu }, { quoted: message })
        }
    }
}
