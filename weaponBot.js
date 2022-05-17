// DiscordJS
const { Client, Intents, MessageEmbed, MessageAttachment, ContextMenuInteraction } = require('discord.js');
const { token } = require("./config.json");
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const Canvas = require('canvas')
Canvas.registerFont('Helvetica.ttf', { family: 'Helvetica' })
Canvas.registerFont('Helvetica-Bold.ttf', { family: 'Helvetica-Bold' })
Canvas.registerFont('Helvetica-Oblique.ttf', { family: 'Helvetica-Oblique' })

// D2 Manifest
const items = Object.values(require("./manifest/DestinyInventoryItemDefinition.json"));
const sockets = Object.values(require("./manifest/DestinyPlugSetDefinition.json"));
const stats = Object.values(require("./manifest/DestinyStatDefinition.json"));
const damageTypes = Object.values(require("./manifest/DestinyDamageTypeDefinition.json"));

const GenerateWeaponImage = require("./generateWeaponImage.js");
const GenerateWeaponEmbed = require("./generateWeaponEmbed.js");

let replied = false;

// Server startup
client.once('ready', () => {
    console.log("Bot started.");
})

// Interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) { return; }

    const { commandName, options } = interaction;
    const inputWeaponName = options.getString('weapon_name');

    if (commandName === 'weapon' || commandName === 'weapontext') {
        let weaponsList = items.filter(item => item.displayProperties.name.toLowerCase().includes(inputWeaponName.toLowerCase()));
        
        if (weaponsList.length == 0) {
            await interaction.reply('No results.');
        } else if (weaponsList.length > 10) {
            await interaction.reply('Too many results. Be more specific.');
        } else {
            if (commandName === 'weapon') {
                await interaction.reply('Generating...');
                for (let i = 0; i < weaponsList.length; i++) {
                    GenerateWeaponImage(weaponsList[i], interaction);
                }
            } else {
                for (let i = 0; i < weaponsList.length; i++) {
                    GenerateWeaponEmbed(weaponsList[i], interaction);
                }
            }
        }
    }
})

client.login(token);