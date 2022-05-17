const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');

const commands = [
    new SlashCommandBuilder()
        .setName('weapon')
        .setDescription('Weapon details and perk combinations. Generates image.')
        .addStringOption(option =>
            option.setName("weapon_name")
                .setDescription("Name of the weapon to search.")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('weapontext')
        .setDescription('Weapon details and perk combinations. Text only.')
        .addStringOption(option =>
            option.setName("weapon_name")
                .setDescription("Name of the weapon to search.")
                .setRequired(true)),
]
    .map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(
	Routes.applicationCommands(clientId),
	{ body: commands },
);

