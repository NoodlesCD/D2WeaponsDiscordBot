// DiscordJS
const { MessageAttachment, } = require('discord.js');
const Canvas = require('canvas')
Canvas.registerFont('./fonts/NHG-Regular.ttf', { family: 'NHG-Regular' })
Canvas.registerFont('./fonts/NHG-Bold.ttf', { family: 'NHG-Bold' })
Canvas.registerFont('./fonts/NHG-Oblique.ttf', { family: 'NHG-Oblique' })

// D2 Manifest
const items = Object.values(require("./manifest/DestinyInventoryItemDefinition.json"));
const sockets = Object.values(require("./manifest/DestinyPlugSetDefinition.json"));
const stats = Object.values(require("./manifest/DestinyStatDefinition.json"));
const damageTypes = Object.values(require("./manifest/DestinyDamageTypeDefinition.json"));

let replied = false;

module.exports = async function GenerateWeaponImage(result, interaction) {
    // Skip over non-weapons
    if (result.defaultDamageType == 0) { return };

    function GetSockets(num)  {
        let foundColumn = [];
        let columnDetails = [];

        if (result.sockets.socketEntries[num].randomizedPlugSetHash != undefined) {
            foundColumn = sockets.find(socket => socket.hash === result.sockets.socketEntries[num].randomizedPlugSetHash);
        } else if (result.sockets.socketEntries[num].reusablePlugSetHash != undefined) {
            foundColumn = sockets.find(socket => socket.hash === result.sockets.socketEntries[num].reusablePlugSetHash);
        } else {
            return [];
        }

        for (let i = 0; i < foundColumn.reusablePlugItems.length; i++) {
            if (foundColumn.reusablePlugItems[i].currentlyCanRoll == true) {
                columnDetails.push({
                    name: items.find(item => item.hash === foundColumn.reusablePlugItems[i].plugItemHash).displayProperties.name,
                    pic: items.find(item => item.hash === foundColumn.reusablePlugItems[i].plugItemHash).displayProperties.icon
                });
            }
        }

        return columnDetails;
    }

    // Weapon perk details
    let column1 = GetSockets(1);
    let column2 = GetSockets(2);
    let column3 = GetSockets(3);
    let column4 = result.sockets.socketEntries[4].singleInitialItemHash === 2931483505 ? GetSockets(5) : GetSockets(4);

    let topColumnSize = column1.length >= column2.length ? column1.length : column2.length;
    let bottomColumnSize = column3.length >= column4.length ? column3.length : column4.length;
    let flavorTextSize = result.flavorText.length / 50;
    

    // Generate canvas
    const canvas = Canvas.createCanvas(880, 950 + (topColumnSize * 50) + (bottomColumnSize * 50) + (flavorTextSize * 30));
    const context = canvas.getContext('2d');
    const bg = await Canvas.loadImage("./bg.png");
    context.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // Generates a stat bar
    function StatBar(statValue, xPadding, yStart) {
        context.fillStyle = '#ffffff';
        context.fillRect(210 + xPadding, yStart - 20, statValue * 2, 20);
        context.fillStyle = '#2b2b2b';
        context.fillRect(210 + xPadding + (statValue * 2), yStart - 20, 200 - (statValue * 2), 20);
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
    context.font = '26px NHG-Bold';
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
    context.font = '20px NHG-Oblique';
    context.fillStyle = '#ffffff';
    let flavorText = result.flavorText;
    let linePad = wrapText(context, flavorText, 130, 130, 500, 22) * 22;


    // Weapon Type
    context.font = '20px NHG-Regular';
    context.fillStyle = '#ffffff';
    context.fillText(result.itemTypeDisplayName, 220, 80, 367);

    context.font = '15px NHG-Regular';
    context.fillText("WEAPON STATS", 135, 190 + linePad);
    context.fillRect(130, 200 + linePad, 620, 1);

    // Weapon Statistics
    if (result.itemTypeDisplayName === "Grenade Launcher") {
        context.textAlign = "right";
        context.font = '20px NHG-Regular';
        context.fillText("Blast Radius", 220, 260 + linePad);
        let impact = result.stats.stats["3614673599"].value;
        StatBar(impact, 20, 260 + linePad);
        context.fillText(impact, 460, 260 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Velocity", 220, 290 + linePad);
        let range = result.stats.stats["2523465841"].value;
        StatBar(range, 20, 290 + linePad);
        context.fillText(range, 460, 290 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Stability", 220, 320 + linePad);
        let stability = result.stats.stats["155624089"].value;
        StatBar(stability, 20, 320 + linePad);
        context.fillText(stability, 460, 320 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Handling", 220, 350 + linePad);
        let handling = result.stats.stats["943549884"].value;
        StatBar(handling, 20, 350 + linePad);
        context.fillText(handling, 460, 350 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Reload", 220, 380 + linePad);
        let reload = result.stats.stats["4188031367"].value;
        StatBar(reload, 20, 380 + linePad);
        context.fillText(reload, 460, 380 + linePad);
    }
    else if (result.itemTypeDisplayName === "Sword") {
        context.textAlign = "right";
        context.font = '20px NHG-Regular';
        context.fillText("Impact", 300, 260 + linePad);
        let impact = result.stats.stats["4043523819"].value;
        StatBar(impact, 100, 260 + linePad);
        context.fillText(impact, 540, 260 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Swing Speed", 300, 290 + linePad);
        let range = result.stats.stats["2837207746"].value;
        StatBar(range, 100, 290 + linePad);
        context.fillText(range, 540, 290 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Charge Rate", 300, 320 + linePad);
        let stability = result.stats.stats["2961396640"].value;
        StatBar(stability, 100, 320 + linePad);
        context.fillText(stability, 540, 320 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Guard Efficiency", 300, 350 + linePad);
        let handling = result.stats.stats["2762071195"].value;
        StatBar(handling, 100, 350 + linePad);
        context.fillText(handling, 540, 350 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Guard Resistance", 300, 380 + linePad);
        let reload = result.stats.stats["2961396640"].value;
        StatBar(reload, 100, 380 + linePad);
        context.fillText(reload, 540, 380 + linePad);
    } else {
        context.textAlign = "right";
        context.font = '20px NHG-Regular';
        context.fillText("Impact", 200, 260 + linePad);
        let impact = result.stats.stats["4043523819"].value;
        StatBar(impact, 0, 260 + linePad);
        context.fillText(impact, 440, 260 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Range", 200, 290 + linePad);
        let range = result.stats.stats["1240592695"].value;
        StatBar(range, 0, 290 + linePad);
        context.fillText(range, 440, 290 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Stability", 200, 320 + linePad);
        let stability = result.stats.stats["155624089"].value;
        StatBar(stability, 0, 320 + linePad);
        context.fillText(stability, 440, 320 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Handling", 200, 350 + linePad);
        let handling = result.stats.stats["943549884"].value;
        StatBar(handling, 0, 350 + linePad);
        context.fillText(handling, 440, 350 + linePad);

        context.font = '20px NHG-Regular';
        context.fillText("Reload", 200, 380 + linePad);
        let reload = result.stats.stats["4188031367"].value;
        StatBar(reload, 0, 380 + linePad);
        context.fillText(reload, 440, 380 + linePad);
    }


    // Weapon Stats II
    if (result.itemTypeDisplayName != "Sword") {
        let aimAss = result.stats.stats["1345609583"].value;
        let magazine = result.stats.stats["3871231066"].value;
        let zoom = result.stats.stats["3555269338"].value;
        let recoil = result.stats.stats["2715839340"].value;
        
        context.font = '20px NHG-Regular';
        context.fillText("Mazazine", 680, 260 + linePad);
        context.fillText("Zoom", 680, 320 + linePad);
        context.fillText("Recoil Direction", 680, 350 + linePad);
        context.fillText("Aim Assistance", 680, 380 + linePad);

        context.font = '20px NHG-Bold';
        context.textAlign = "left";
        context.fillText(magazine, 700, 260 + linePad);
        context.fillText(zoom, 700, 320 + linePad);
        context.fillText(recoil, 700, 350 + linePad);
        context.fillText(aimAss, 700, 380 + linePad);
    }

    if (result.itemTypeDisplayName === "Fusion Rifle") {
        context.font = '20px NHG-Regular';
        context.textAlign = "right";
        context.fillText("Charge Time", 680, 290 + linePad);

        context.font = '20px NHG-Bold';
        context.textAlign = "left";
        context.fillText(result.stats.stats["2961396640"].value, 700, 290 + linePad);
    } else if (result.itemTypeDisplayName != "Sword") {
        let rpm = result.stats.stats["4284893193"].value;

        context.font = '20px NHG-Regular';
        context.textAlign = "right";
        context.fillText("RPM", 680, 290 + linePad);

        context.font = '20px NHG-Bold';
        context.textAlign = "left";
        context.fillText(rpm, 700, 290 + linePad);
    }

    context.textAlign = "left";
    context.font = '15px NHG-Regular';
    context.fillText("WEAPON PERKS", 135, 450 + linePad);
    context.fillRect(130, 460 + linePad, 620, 1);

    // Instrinsic
    context.font = '15px NHG-Bold';
    context.fillText("INTRINSIC", 160, 505 + linePad);
    context.fillRect(160, 515 + linePad, 250, 1);

    context.font = '20px NHG-Regular';
    let instrinsic = (items.filter(item => item.hash === result.sockets.socketEntries[0].singleInitialItemHash))[0].displayProperties;
    let instrinsicIcon = await Canvas.loadImage("http://www.bungie.net" + instrinsic.icon);
    context.drawImage(instrinsicIcon, 160, 525 + linePad, 75, 75);
    context.fillText(instrinsic.name, 250, 547 + linePad);
    context.font = '18px NHG-Oblique';
    wrapText(context, instrinsic.description, 250, 573 + linePad, 480, 20);

    // Columns
    context.font = '15px NHG-Bold';
    context.fillText("BARRELS / SIGHTS", 160, 640 + linePad);
    context.fillRect(160, 650 + linePad, 250, 1);
    for (let j = 0; j < column1.length; j++) {
        const col1pic = await Canvas.loadImage("http://www.bungie.net" + column1[j].pic);
        context.drawImage(col1pic, 160, 680 + (j * 50) + linePad, 40, 40);
        context.font = '20px NHG-Regular';
        context.fillText(column1[j].name, 210, 707 + (j * 50) + linePad);
    }

    context.font = '15px NHG-Bold';
    context.fillText("MAGAZINES", 480, 640 + linePad);
    context.fillRect(480, 650 + linePad, 250, 1);
    for (let j = 0; j < column2.length; j++) {
        const col2pic = await Canvas.loadImage("http://www.bungie.net" + column2[j].pic);
        context.drawImage(col2pic, 480, 680 + (j * 50) + linePad, 40, 40);
        context.font = '20px NHG-Regular';
        context.fillText(column2[j].name, 530, 707 + (j * 50) + linePad);
    }

    context.font = '15px NHG-Bold';
    context.fillText("COLUMN 3", 160, 730 + (topColumnSize * 50) + linePad);
    context.fillRect(160, 740 + (topColumnSize * 50) + linePad, 250, 1);
    for (let j = 0; j < column3.length; j++) {
        const col3pic = await Canvas.loadImage("http://www.bungie.net" + column3[j].pic);
        context.drawImage(col3pic, 160, 770 + (topColumnSize * 50) + (j * 50) + linePad, 40, 40);
        context.font = '20px NHG-Regular';
        context.fillText(column3[j].name, 210, 797 + (topColumnSize * 50) + (j * 50) + linePad);
    }

    if (column4.length > 0) {
        context.font = '15px NHG-Bold';
        context.fillText("COLUMN 4", 480, 730 + (topColumnSize * 50) + linePad);
        context.fillRect(480, 740 + (topColumnSize * 50) + linePad, 250, 1);
        for (let j = 0; j < column4.length; j++) {
            const col4pic = await Canvas.loadImage("http://www.bungie.net" + column4[j].pic);
            context.drawImage(col4pic, 480, 770 + (topColumnSize * 50) + (j * 50) + linePad, 40, 40);
            context.font = '20px NHG-Regular';
            context.fillText(column4[j].name, 530, 797 + (topColumnSize * 50) + (j * 50) + linePad);
        }
    }

    context.textAlign = "right";
    context.font = '15px NHG-Regular';
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
