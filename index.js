// DiscordJS
const { Client, Intents, MessageEmbed, MessageAttachment, ContextMenuInteraction } = require('discord.js');
const { token } = require("./config.json");
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const Canvas = require('canvas')
Canvas.registerFont('Helvetica.ttf', { family: 'Helvetica' })
Canvas.registerFont('Helvetica-Bold.ttf', { family: 'Helvetica-Bold' })
Canvas.registerFont('Helvetica-Oblique.ttf', { family: 'Helvetica-Oblique' })

// D2 Manifest
const items = Object.values(require("./DestinyInventoryItemDefinition.json"));
const sockets = Object.values(require("./DestinyPlugSetDefinition.json"));
const stats = Object.values(require("./DestinyStatDefinition.json"));
const damageTypes = Object.values(require("./DestinyDamageTypeDefinition.json"));

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
                    try {
                        GenerateWeaponImage(weaponsList[i], interaction);
                    } catch(ex) {
                        if (!replied) {
                            await interaction.reply('Something broke. :(');
                        } else {
                            await interaction.followUp('Something broke. :(');
                        }
                    }
                }
            } else {
                for (let i = 0; i < weaponsList.length; i++) {
                    GenerateWeaponEmbed(weaponsList[i], interaction);
                }
            }
        }
    }
})

async function GenerateWeaponImage(result, interaction) {
    // Skip over non-weapons
    if (result.defaultDamageType == 0) { return };

    // Weapon perk details
    let column1 = [];
    let column2 = [];
    let column3 = [];
    let column4 = [];

    // For exotic weapons or old, static-roll weapons
    if (result.sockets.socketEntries[1].randomizedPlugSetHash == undefined) {
        function GetStaticSockets(num) {
            // Old static weapons do not have a 4th column. Return [] to avoid exception
            if ((sockets.filter(socket => socket.hash === result.sockets.socketEntries[num].reusablePlugSetHash))[0] === undefined) { return []; }

            let column = (sockets.filter(socket => socket.hash === result.sockets.socketEntries[num].reusablePlugSetHash))[0];
            let columnText = [];

            for (let j = 0; j < column.reusablePlugItems.length; j++) {
                if (column.reusablePlugItems[j].currentlyCanRoll == true) {
                    let columnResult = {
                        name: items.filter(item => item.hash === column.reusablePlugItems[j].plugItemHash)[0].displayProperties.name,
                        pic: items.filter(item => item.hash === column.reusablePlugItems[j].plugItemHash)[0].displayProperties.icon
                    }
                    columnText.push(columnResult);
                }
            }
            return columnText;
        }

        column1 = GetStaticSockets(1);
        column2 = GetStaticSockets(2);
        column3 = GetStaticSockets(3);

        // Exotic ornament can sometimes be in 4th column. 
        column4 = result.sockets.socketEntries[4].singleInitialItemHash === 2931483505 ? GetStaticSockets(5) : GetStaticSockets(4);
    }

    // For random rolled weapons
    else {
        function GetRandomSockets(num) {
            let column = (sockets.filter(socket => socket.hash === result.sockets.socketEntries[num].randomizedPlugSetHash))[0];
            let columnText = [];
            for (let j = 0; j < column.reusablePlugItems.length; j++) {
                if (column.reusablePlugItems[j].currentlyCanRoll == true) {
                    let columnResult = {
                        name: items.filter(item => item.hash === column.reusablePlugItems[j].plugItemHash)[0].displayProperties.name,
                        pic: items.filter(item => item.hash === column.reusablePlugItems[j].plugItemHash)[0].displayProperties.icon
                    }
                    columnText.push(columnResult);
                }
            }
            return columnText;
        }

        column1 = GetRandomSockets(1);
        column2 = GetRandomSockets(2);
        column3 = GetRandomSockets(3);
        column4 = GetRandomSockets(4);
    }

    let topColumnSize = column1.length >= column2.length ? column1.length : column2.length;
    let bottomColumnSize = column3.length >= column4.length ? column3.length : column4.length;

    // Generate canvas
    const canvas = Canvas.createCanvas(880, 880 + (topColumnSize * 50) + (bottomColumnSize * 50));
    const context = canvas.getContext('2d');
    const bg = await Canvas.loadImage("./bg.png");
    context.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // Generates a stat bar
    function StatBar(statValue, pixelStart) {
        context.fillStyle = '#ffffff';
        context.fillRect(210, pixelStart - 20, statValue * 2, 20);
        context.fillStyle = '#2b2b2b';
        context.fillRect(210 + (statValue * 2), pixelStart - 20, 200 - (statValue * 2), 20);
        context.fillStyle = '#ffffff';
    }

    // Text wrapping for flavour-text
    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        var words = text.split(' '),
            line = '',
            lineCount = 0,
            i,
            test,
            metrics;

        for (i = 0; i < words.length; i++) {
            test = words[i];
            metrics = context.measureText(test);
            while (metrics.width > maxWidth) {
                // Determine how much of the word will fit
                test = test.substring(0, test.length - 1);
                metrics = context.measureText(test);
            }
            if (words[i] != test) {
                words.splice(i + 1, 0, words[i].substr(test.length))
                words[i] = test;
            }

            test = line + words[i] + ' ';
            metrics = context.measureText(test);

            if (metrics.width > maxWidth && i > 0) {
                context.fillText(line, x, y);
                line = words[i] + ' ';
                y += lineHeight;
                lineCount++;
            } else {
                line = test;
            }
        }

        context.fillText(line, x, y);
        return lineCount;
    }

    // Foundry Icon
    context.globalAlpha = 0.3;
    if (result.secondaryIcon != undefined) {
        const secondaryIcon = await Canvas.loadImage("http://www.bungie.net" + result.secondaryIcon);
        context.drawImage(secondaryIcon, 0, 0, 500, 500);
    }
    context.globalAlpha = 1;


    // Damage Type Picture
    const damageTypePicLocation = (damageTypes.filter(type => type.hash === result.defaultDamageTypeHash))[0].displayProperties.icon;
    const damageTypePic = await Canvas.loadImage("http://www.bungie.net" + damageTypePicLocation);
    context.drawImage(damageTypePic, 135, 35, 50, 50);


    // Weapon Name
    context.font = '26px Helvetica-Bold';
    context.fillStyle = '#ffffff';
    let weaponName = result.displayProperties.name;
    context.fillText(weaponName, 220, 54, 370);


    // Weapon Image
    const pic = await Canvas.loadImage("http://www.bungie.net" + result.displayProperties.icon);
    context.drawImage(pic, 640, 30, 100, 100);
    if (result.iconWatermark != undefined) {
        const picSeason = await Canvas.loadImage("http://www.bungie.net" + result.iconWatermark);
        context.drawImage(picSeason, 640, 30, 100, 100);
    }
    context.lineWidth = 2;
    context.strokeStyle = '#ffffff';
    context.strokeRect(640, 30, 100, 100);
    context.lineWidth = 1;


    // Flavour Text
    context.font = '20px Helvetica-Oblique';
    context.fillStyle = '#ffffff';
    let flavorText = result.flavorText;
    let linePad = wrapText(context, flavorText, 130, 130, 500, 22) * 22;


    // Weapon Type
    context.font = '20px Helvetica';
    context.fillStyle = '#ffffff';
    context.fillText(result.itemTypeDisplayName, 220, 80, 367);

    context.font = '15px Helvetica';
    context.fillText("WEAPON STATS", 135, 190 + linePad);
    context.fillRect(130, 200 + linePad, 620, 1);

    // Weapon Statistics
    if (result.itemTypeDisplayName === "Grenade Launcher") {
        context.textAlign = "right";
        context.font = '20px Helvetica';
        context.fillText("Blast Radius", 200, 260 + linePad);
        let impact = result.stats.stats["3614673599"].value;
        let impactBar = StatBar(impact, 260 + linePad);
        context.fillText(impact, 440, 260 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Velocity", 200, 290 + linePad);
        let range = result.stats.stats["2523465841"].value;
        let rangeBar = StatBar(range, 290 + linePad);
        context.fillText(range, 440, 290 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Stability", 200, 320 + linePad);
        let stability = result.stats.stats["155624089"].value;
        let stabilityBar = StatBar(stability, 320 + linePad);
        context.fillText(stability, 440, 320 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Handling", 200, 350 + linePad);
        let handling = result.stats.stats["943549884"].value;
        let handlingBar = StatBar(handling, 350 + linePad);
        context.fillText(handling, 440, 350 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Reload", 200, 380 + linePad);
        let reload = result.stats.stats["4188031367"].value;
        let reloadBar = StatBar(reload, 380 + linePad);
        context.fillText(reload, 440, 380 + linePad);
    }
    else if (result.itemTypeDisplayName === "Sword") {
        context.textAlign = "right";
        context.font = '20px Helvetica';
        context.fillText("Impact", 200, 260 + linePad);
        let impact = result.stats.stats["4043523819"].value;
        let impactBar = StatBar(impact, 260 + linePad);
        context.fillText(impact, 440, 260 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Swing Speed", 200, 290 + linePad);
        let range = result.stats.stats["2837207746"].value;
        let rangeBar = StatBar(range, 290 + linePad);
        context.fillText(range, 440, 290 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Charge Rate", 200, 320 + linePad);
        let stability = result.stats.stats["2961396640"].value;
        let stabilityBar = StatBar(stability, 320 + linePad);
        context.fillText(stability, 440, 320 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Guard Efficiency", 200, 350 + linePad);
        let handling = result.stats.stats["2762071195"].value;
        let handlingBar = StatBar(handling, 350 + linePad);
        context.fillText(handling, 440, 350 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Guard Resistance", 200, 380 + linePad);
        let reload = result.stats.stats["2961396640"].value;
        let reloadBar = StatBar(reload, 380 + linePad);
        context.fillText(reload, 440, 380 + linePad);
    } else {
        context.textAlign = "right";
        context.font = '20px Helvetica';
        context.fillText("Impact", 200, 260 + linePad);
        let impact = result.stats.stats["4043523819"].value;
        let impactBar = StatBar(impact, 260 + linePad);
        context.fillText(impact, 440, 260 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Range", 200, 290 + linePad);
        let range = result.stats.stats["1240592695"].value;
        let rangeBar = StatBar(range, 290 + linePad);
        context.fillText(range, 440, 290 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Stability", 200, 320 + linePad);
        let stability = result.stats.stats["155624089"].value;
        let stabilityBar = StatBar(stability, 320 + linePad);
        context.fillText(stability, 440, 320 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Handling", 200, 350 + linePad);
        let handling = result.stats.stats["943549884"].value;
        let handlingBar = StatBar(handling, 350 + linePad);
        context.fillText(handling, 440, 350 + linePad);

        context.font = '20px Helvetica';
        context.fillText("Reload", 200, 380 + linePad);
        let reload = result.stats.stats["4188031367"].value;
        let reloadBar = StatBar(reload, 380 + linePad);
        context.fillText(reload, 440, 380 + linePad);
    }


    // Weapon Stats II
    if (!result.itemTypeDisplayName === "Sword") {
        let aimAss = result.stats.stats["1345609583"].value;
        let magazine = result.stats.stats["3871231066"].value;
        let zoom = result.stats.stats["3555269338"].value;
        let recoil = result.stats.stats["2715839340"].value;
        
        context.font = '20px Helvetica';
        context.fillText("Mazazine", 680, 260 + linePad);
        context.fillText("Zoom", 680, 320 + linePad);
        context.fillText("Recoil Direction", 680, 350 + linePad);
        context.fillText("Aim Assistance", 680, 380 + linePad);

        context.font = '20px Helvetica-Bold';
        context.textAlign = "left";
        context.fillText(magazine, 700, 260 + linePad);
        context.fillText(zoom, 700, 320 + linePad);
        context.fillText(recoil, 700, 350 + linePad);
        context.fillText(aimAss, 700, 380 + linePad);
    }

    if (result.itemTypeDisplayName === "Fusion Rifle") {
        context.font = '20px Helvetica';
        context.textAlign = "right";
        context.fillText("Charge Time", 680, 290 + linePad);

        context.font = '20px Helvetica-Bold';
        context.textAlign = "left";
        context.fillText(result.stats.stats["2961396640"].value, 700, 290 + linePad);
    } else if (!result.itemTypeDisplayName === "Sword") {
        let rpm = result.stats.stats["4284893193"].value;

        context.font = '20px Helvetica';
        context.textAlign = "right";
        context.fillText("RPM", 680, 290 + linePad);

        context.font = '20px Helvetica-Bold';
        context.textAlign = "left";
        context.fillText(rpm, 700, 290 + linePad);
    }

    context.textAlign = "left";
    context.font = '15px Helvetica';
    context.fillText("WEAPON PERKS", 135, 450 + linePad);
    context.fillRect(130, 460 + linePad, 620, 1);

    // Instrinsic
    context.font = '15px Helvetica-Bold';
    context.fillText("INTRINSIC", 160, 505 + linePad);
    context.fillRect(160, 515 + linePad, 250, 1);

    context.font = '20px Helvetica';
    let instrinsic = (items.filter(item => item.hash === result.sockets.socketEntries[0].singleInitialItemHash))[0].displayProperties;
    let instrinsicIcon = await Canvas.loadImage("http://www.bungie.net" + instrinsic.icon);
    context.drawImage(instrinsicIcon, 160, 525 + linePad, 75, 75);
    context.fillText(instrinsic.name, 250, 547 + linePad);
    context.font = '18px Helvetica-Oblique';
    wrapText(context, instrinsic.description, 250, 573 + linePad, 480, 20);

    // Columns
    context.font = '15px Helvetica-Bold';
    context.fillText("BARRELS / SIGHTS", 160, 640 + linePad);
    context.fillRect(160, 650 + linePad, 250, 1);
    for (let j = 0; j < column1.length; j++) {
        const col1pic = await Canvas.loadImage("http://www.bungie.net" + column1[j].pic);
        context.drawImage(col1pic, 160, 680 + (j * 50) + linePad, 40, 40);
        context.font = '20px Helvetica';
        context.fillText(column1[j].name, 210, 707 + (j * 50) + linePad);
    }

    context.font = '15px Helvetica-Bold';
    context.fillText("MAGAZINES", 480, 640 + linePad);
    context.fillRect(480, 650 + linePad, 250, 1);
    for (let j = 0; j < column2.length; j++) {
        const col2pic = await Canvas.loadImage("http://www.bungie.net" + column2[j].pic);
        context.drawImage(col2pic, 480, 680 + (j * 50) + linePad, 40, 40);
        context.font = '20px Helvetica';
        context.fillText(column2[j].name, 530, 707 + (j * 50) + linePad);
    }

    context.font = '15px Helvetica-Bold';
    context.fillText("COLUMN 3", 160, 730 + (topColumnSize * 50) + linePad);
    context.fillRect(160, 740 + (topColumnSize * 50) + linePad, 250, 1);
    for (let j = 0; j < column3.length; j++) {
        const col3pic = await Canvas.loadImage("http://www.bungie.net" + column3[j].pic);
        context.drawImage(col3pic, 160, 770 + (topColumnSize * 50) + (j * 50) + linePad, 40, 40);
        context.font = '20px Helvetica';
        context.fillText(column3[j].name, 210, 797 + (topColumnSize * 50) + (j * 50) + linePad);
    }

    if (column4.length > 0) {
        context.font = '15px Helvetica-Bold';
        context.fillText("COLUMN 4", 480, 730 + (topColumnSize * 50) + linePad);
        context.fillRect(480, 740 + (topColumnSize * 50) + linePad, 250, 1);
        for (let j = 0; j < column4.length; j++) {
            const col4pic = await Canvas.loadImage("http://www.bungie.net" + column4[j].pic);
            context.drawImage(col4pic, 480, 770 + (topColumnSize * 50) + (j * 50) + linePad, 40, 40);
            context.font = '20px Helvetica';
            context.fillText(column4[j].name, 530, 797 + (topColumnSize * 50) + (j * 50) + linePad);
        }
    }

    context.textAlign = "right";
    context.font = '15px Helvetica';
    context.fillText("NoodlesCD", 740, 830 + (topColumnSize * 50) + (bottomColumnSize * 50) + linePad);
    context.fillRect(130, 810 + (topColumnSize * 50) + (bottomColumnSize * 50) + linePad, 620, 1);

    const attachment = new MessageAttachment(canvas.toBuffer(), result.hash + ".png");

    if (!replied) {
        interaction.editReply({ files: [attachment] });
        replied = true;
    } else {
        interaction.followUp({ files: [attachment] });
    }
}



async function GenerateWeaponEmbed(result, interaction) {
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

client.login(token);