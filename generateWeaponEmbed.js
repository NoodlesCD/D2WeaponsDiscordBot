// DiscordJS
const { Client, Intents, MessageEmbed } = require('discord.js');

// D2 Manifest
const items = Object.values(require("./manifest/DestinyInventoryItemDefinition.json"));
const sockets = Object.values(require("./manifest/DestinyPlugSetDefinition.json"));
const stats = Object.values(require("./manifest/DestinyStatDefinition.json"));
const damageTypes = Object.values(require("./manifest/DestinyDamageTypeDefinition.json"));

let replied = false;

module.exports = async function GenerateWeaponEmbed(result, interaction) {
    // Skip over non-weapons
    if (result.defaultDamageType == 0) { return; }

    // Basic weapon information
    let weaponName = result.displayProperties.name;
    let flavorText = "*" + result.flavorText + "*";
    let damageType = "";
    let thumbnail = "http://www.bungie.net" + result.displayProperties.icon
    let frame = (items.filter(item => item.hash === result.sockets.socketEntries[0].singleInitialItemHash))[0].displayProperties.name;

    // Rare-#5076a3     Legendary-#522f65    Exotic-#ceae33
    let color = "#522f65";
    if (result.itemTypeAndTierDisplayName.includes("Rare")) {
        color = "#5076a3";
    } else if (result.itemTypeAndTierDisplayName.includes("Legendary")) {
        color = "#522f65"
    } else if (result.itemTypeAndTierDisplayName.includes("Exotic")) {
        color = "#ceae33"
    }

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
                if (column.reusablePlugItems[j].currentlyCanRoll == true) {
                    columnText = columnText + ((items.filter(item => item.hash === column.reusablePlugItems[j].plugItemHash))[0].displayProperties.name) + "\n";
                }
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
                if (column.reusablePlugItems[j].currentlyCanRoll == true) {
                    columnText = columnText + ((items.filter(item => item.hash === column.reusablePlugItems[j].plugItemHash))[0].displayProperties.name) + "\n";
                }
            }
            return columnText;
        }

        column1 = GetRandomSockets(1);
        column2 = GetRandomSockets(2);
        column3 = GetRandomSockets(3);
        column4 = GetRandomSockets(4);
    }

    function StatBar(statValue) {
        let statBar = "";
        for (let j = 0; j < statValue / 5; j++) {
            statBar = statBar + "▇";
        }
        return statBar;
    }
    let impact = result.stats.stats["4043523819"].value;
    let impactBar = StatBar(impact);

    let range = result.stats.stats["1240592695"].value;
    let rangeBar = StatBar(range);

    let stability = result.stats.stats["155624089"].value;
    let stabilityBar = StatBar(stability);

    let handling = result.stats.stats["943549884"].value;
    let handlingBar = StatBar(handling);

    let reload = result.stats.stats["4188031367"].value;
    let reloadBar = StatBar(reload);

    let aimAss = result.stats.stats["1345609583"].value;
    let magazine = result.stats.stats["3871231066"].value;
    let rpm = result.stats.stats["4284893193"].value;
    let zoom = result.stats.stats["3555269338"].value;
    let recoil = result.stats.stats["2715839340"].value;

    let stats = "**Impact: **\n\u200B" + impactBar + " " + impact + "\n\u200B" +
        "**Range: **\n\u200B" + rangeBar + " " + range + "\n\u200B" +
        "**Stability: **\n\u200B" + stabilityBar + " " + stability + "\n\u200B" +
        "**Handling: **\n\u200B" + handlingBar + " " + handling + "\n\u200B" +
        "**Reload: **\n\u200B" + reloadBar + " " + reload + "\u200B";
    let stats2 = "**Magazine: **" + magazine + "\n\u200B" +
        "**RPM: **" + rpm + "\n\u200B" +
        "**Zoom: **" + zoom + "\n\u200B" +
        "**Recoil Direction: **" + recoil + "\n\u200B" +
        "**Aim Assistance: **" + aimAss + "\u200B";


    const weaponEmbed = new MessageEmbed()
        .setTitle(weaponName)
        .setDescription(flavorText)
        .setThumbnail(thumbnail)
        .setColor(color)
        .addFields(
            { name: 'Damage Type', value: damageType + "\n\u200B", inline: true },
            { name: 'Intrinsic', value: frame + "\n\u200B", inline: true },
            { name: '** **', value: '** **', inline: true },
            { name: 'Stats', value: stats + "\n\u200B", inline: true },
            { name: '** **', value: stats2 + "\n\u200B", inline: true },
            { name: 'Barrels & Magazines', value: "** **" },
            { name: 'Column 1', value: column1 + "\u200B", inline: true },
            { name: 'Column 2', value: column2 + "\u200B", inline: true },
            { name: 'Weapon Perks', value: "** **" },
            { name: 'Column 3', value: column3, inline: true },
            { name: 'Column 4', value: column4, inline: true },
        )

    if (!replied) {
        interaction.reply({ embeds: [weaponEmbed] });
        replied = true;
    } else {
        interaction.followUp({ embeds: [weaponEmbed] });
    }
}