// DiscordJS
const { Client, Intents, MessageEmbed } = require('discord.js');
const { token } = require("./config.json");
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// D2 Manifest
const itemImport = require("./DestinyInventoryItemDefinition.json");
const socketImport = require("./DestinyPlugSetDefinition.json");
const items = Object.values(itemImport);
const sockets = Object.values(socketImport);

// Server startup
client.once('ready', () => {
    console.log("Bot started.");
})

// Interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) { return; }
    const { commandName, options } = interaction;
    const inputWeaponName = options.getString('weapon_name');

    if (commandName === 'weapon') {
        let weaponsList = items.filter(item => item.displayProperties.name.includes(inputWeaponName));
        let replied = false;
        if (weaponsList.length == 0) {
            await interaction.reply('No results.');
        } else if (weaponsList.length > 10) {
            await interaction.reply('Too many results. Be more specific.');
        } else {
            for (let i = 0; i < weaponsList.length; i++) {
                let result = weaponsList[i];
                // Skip over non-weapons
                if (result.defaultDamageType == 0) continue;

                // Basic weapon information
                let weaponName = result.displayProperties.name;
                let flavorText = "*" + result.flavorText + "*";
                let damageType = "";
                let thumbnail = "http://www.bungie.net" + result.displayProperties.icon
                let frame = (items.filter(item => item.hash === result.sockets.socketEntries[0].singleInitialItemHash))[0].displayProperties.name;
    
                // 1- Kinetic   2- Arc     3- Solar   4- Void
                if (result.defaultDamageType == 1) {
                    damageType = "Kinetic";
                } else if (result.defaultDamageType == 2) {
                    damageType = "Arc";
                } else if (result.defaultDamageType == 3) {
                    damageType = "Solar";
                } else if (result.defaultDamageType == 4) {
                    damageType = "Void";
                }
                damageType = damageType + " " + result.itemTypeDisplayName;

                // Weapon perk details
                let column1 = "";
                let column2 = "";
                let column3 = "";
                let column4 = "";

                // For old, static-roll weapons
                if (result.sockets.socketEntries[1].randomizedPlugSetHash == undefined) {
                    function GetStaticSockets(num) {
                        let column = (sockets.filter(socket => socket.hash === result.sockets.socketEntries[num].reusablePlugSetHash))[0];
                        let columnText = "";
                        for (let j = 0; j < column.reusablePlugItems.length; j++) {
                            columnText = columnText + ((items.filter(item => item.hash === column.reusablePlugItems[j].plugItemHash))[0].displayProperties.name) + "\n";
                        }
                        return columnText;
                    }

                    column1 = GetStaticSockets(1);
                    column2 = GetStaticSockets(2);
                    column3 = GetStaticSockets(3);
                    column4 = "N/A";
                }
                
                // For random rolled weapons
                else {
                    function GetRandomSockets(num) {
                        let column = (sockets.filter(socket => socket.hash === result.sockets.socketEntries[num].randomizedPlugSetHash))[0];
                        let columnText = "";
                        for (let j = 0; j < column.reusablePlugItems.length; j++) {
                            columnText = columnText + ((items.filter(item => item.hash === column.reusablePlugItems[j].plugItemHash))[0].displayProperties.name) + "\n";
                        }
                        return columnText;
                    }

                    column1 = GetRandomSockets(1);
                    column2 = GetRandomSockets(2);
                    column3 = GetRandomSockets(3);
                    column4 = GetRandomSockets(4);
                }
                
                const weaponEmbed = new MessageEmbed()
                    .setTitle(weaponName)
                    .setDescription(flavorText + "\n\u200B\n")
                    .setThumbnail(thumbnail)
                    .addFields(
                        { name: 'Damage Type', value: damageType },
                        { name: 'Intrinsic', value: frame },
                        { name: 'Barrels & Magazines', value: "** **" },
                        { name: 'Column 1', value: column1 + "\u200B", inline: true },
                        { name: 'Column 2', value: column2 + "\u200B", inline: true },
                        { name: 'Weapon Perks', value: "** **" },
                        { name: 'Column 3', value: column3, inline: true },
                        { name: 'Column 4', value: column4, inline: true },
                    )
                
                if (!replied) {
                    await interaction.reply({ embeds: [weaponEmbed] });
                    replied = true;
                } else {
                    await interaction.followUp({ embeds: [weaponEmbed] });
                }
            }
        }
    }
})

client.login(token);