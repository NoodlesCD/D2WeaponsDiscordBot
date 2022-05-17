const schedule = require("node-schedule");
const fs = require('fs');
const fetch = require('node-fetch');

const { bungieAPIkey } = require("./config.json");
const localManifest = require("./manifest/manifest.json");

const job = schedule.scheduleJob("* 5 11 * * *", () => {
    let changes = false;

    let call = fetch("https://www.bungie.net/Platform/Destiny2/Manifest/", {
        method: "GET",
        headers: { "X-Auth-Token": bungieAPIkey }
    }).then(response => response.json());
    let json = call.Response.jsonWorldComponentContentPaths.en;

    if (json.DestinyInventoryItemDefinition != localManifest.inventoryItemDefinition) {
        download(json.DestinyInventoryItemDefinition, "./manifest/DestinyInventoryItemDefinition.json");
        localManifest.inventoryItemDefinition = json.DestinyInventoryItemDefinition;
        changes = true;
    }
    if (json.DestinyPlugSetDefinition != localManifest.plugSetDefinition) {
        download(json.DestinyPlugSetDefinition, "./manifest/DestinyPlugSetDefinition.json");
        localManifest.plugSetDefinition = json.DestinyPlugSetDefinition;
        changes = true;
    }
    if (json.DestinyStatDefinition != localManifest.statDefinition) {
        download(json.DestinyStatDefinition, "./manifest/DestinyStatDefinition.json");
        localManifest.statDefinition = json.DestinyStatDefinition;
        changes = true;
    }
    if (json.DestinyDamageTypeDefinition != localManifest.damageTypeDefinition) {
        download(json.DestinyDamageTypeDefinition, "./manifest/DestinyDamageTypeDefinition.json");
        localManifest.damageTypeDefinition = json.DestinyDamageTypeDefinition;
        changes = true;
    }

    if (changes) { fs.writeFileSync("./manifest/manifest.json", JSON.stringify(localManifest)); console.log("Manifest updated.") }
});

async function download(url, path) {
    const res = await fetch("http://www.bungie.net" + url, { method: "GET" })
        .then(res => res.json())
        .then(json => fs.writeFileSync(path, JSON.stringify(json)))
}