<script setup lang="ts">
import * as secp from '@noble/secp256k1';
import * as bitcoinjs from 'bitcoinjs-lib';
import { ECPairFactory, ECPairAPI } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';
import * as browserifyCipher from 'browserify-cipher';
const ECPair: ECPairAPI = ECPairFactory(tinysecp);

sessionStorage.clear();
var { getSharedSecret, schnorr, utils } = secp;
var crypto = window.crypto;
var getRand = (size) => crypto.getRandomValues(new Uint8Array(size));
var sha256 = bitcoinjs.crypto.sha256;
var nostr_keypair = ECPair.makeRandom();
var nostr_privKey = nostr_keypair.privateKey.toString('hex');
var nostr_pubKey = nostr_keypair.publicKey.toString('hex');
nostr_pubKey = nostr_pubKey.substring(2);
console.log('nostr_pubKey:', nostr_pubKey);
var oracle_nostr = 'ffff2be8b5be12fa8b3fb48bb3ebfc40b9b6801bae34aa4d25c899780fb8d6f7';
var oracle_pubkey = '02ffff2be8b5be12fa8b3fb48bb3ebfc40b9b6801bae34aa4d25c899780fb8d6f7';
var relay = 'wss://relay.damus.io';
var socket = new WebSocket(relay);
socket.addEventListener('message', handleMessage);
var subId = ECPair.makeRandom().privateKey.toString('hex');
var filter = { authors: [nostr_pubKey] };
var subId2 = ECPair.makeRandom().privateKey.toString('hex');
var filter2 = { '#p': [nostr_pubKey] };
socket.addEventListener('open', openConnection);

function saveData(data, fileName) {
  var a = document.createElement('a');
  document.body.appendChild(a);
  a.style.cssText = 'display: none';
  var blob = new Blob([data], { type: 'octet/stream' }),
    url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

async function sendDM(message, recipient) {
  var encrypted_message = encrypt(nostr_privKey, recipient, message);
  var encrypted_event = {
    content: encrypted_message,
    created_at: Math.floor(Date.now() / 1000),
    kind: 20004,
    tags: [['p', recipient]],
    pubkey: nostr_pubKey,
  };
  var signedEncryptedEvent = await getSignedEvent(encrypted_event, nostr_privKey);
  socket.send(JSON.stringify(['EVENT', signedEncryptedEvent]));
}

async function sendPublicFundraiserMessage(message) {
  var event = {
    content: message,
    created_at: Math.floor(Date.now() / 1000),
    kind: 4239,
    tags: [],
    pubkey: nostr_pubKey,
  };
  var signedEvent = await getSignedEvent(event, nostr_privKey);
  console.log('signedEvent:', signedEvent);
  socket.send(JSON.stringify(['EVENT', signedEvent]));
  var url =
    window.location.href.substring(0, window.location.href.indexOf('create.htm')) +
    'contribute.html?id=' +
    signedEvent.id;
  document.getElementById('link').innerHTML = '';
  document.getElementById(
    'link'
  ).innerHTML += `<div style="font-weight: bold; margin-bottom: 20px;">Sharable link</div>`;
  document.getElementById('link').innerHTML += `<div><a href="${url}" target="_blank">${url}</a></div>`;
  document.getElementById('link').style.display = 'block';
  var second_url = window.location.href.substring(0, window.location.href.indexOf('create.htm')) + 'redemption.html';
  var redemption_file = {};
  redemption_file['type'] = 'creator';
  var redemption_content = {};
  redemption_content['nostr_privkey'] = nostr_privKey;
  redemption_content['privkey'] = sessionStorage['privkey'];
  redemption_content['pubkey'] = sessionStorage['pubkey'];
  redemption_content['event_id'] = signedEvent.id;
  redemption_content['redemption_url'] = second_url;
  redemption_file['content'] = redemption_content;
  saveData(JSON.stringify(redemption_file), 'redemption_file.json');
  var second_url = window.location.href.substring(0, window.location.href.indexOf('create.htm')) + 'redemption.html';
  var alert = `A file called redemption_file.json was just downloaded on your computer. This file contains all of the information you need to take your money if the fundraiser raises the right amount, except a piece of data from your oracle, which you'll only get if the fundraiser raises the right amount. To get this last piece of data, wait til the fundraiser is over and raised the right amount of money, then visit this link to redeem all that money: <a href="${second_url}" target="_blank">${second_url}</a> -- note that you only have 24 hours after the fundraiser ends to take the money, if you wait longer than that, everyone gets their money back.`;
  document.getElementById(
    'link'
  ).innerHTML += `<div style="font-weight: bold; margin-bottom: 20px; margin-top: 20px;">More info</div>`;
  document.getElementById('link').innerHTML += `<div>${alert}</div>`;
}

async function getSignedEvent(event, privateKey) {
  var eventData = JSON.stringify([
    0, // Reserved for future use
    event['pubkey'], // The sender's public key
    event['created_at'], // Unix timestamp
    event['kind'], // Message “kind” or type
    event['tags'], // Tags identify replies/recipients
    event['content'], // Your note contents
  ]);
  event.id = sha256(eventData).toString('hex');
  event.sig = await schnorr.sign(event.id, privateKey);
  return event;
}
function hexToBytes(hex) {
  return Uint8Array.from(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

function bytesToHex(bytes) {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}
function base64ToHex(str) {
  var raw = atob(str);
  var result = '';
  var i;
  for (i = 0; i < raw.length; i++) {
    var hex = raw.charCodeAt(i).toString(16);
    result += hex.length === 2 ? hex : '0' + hex;
  }
  return result;
}
function encrypt(privkey, pubkey, text) {
  var key = secp
    .getSharedSecret(privkey, '02' + pubkey, true)
    .toString()
    .substring(2);
  var iv = window.crypto.getRandomValues(new Uint8Array(16));
  var cipher = browserifyCipher.createCipheriv('aes-256-cbc', hexToBytes(key), iv);
  var encryptedMessage = cipher.update(text, 'utf8', 'base64');
  const emsg = encryptedMessage + cipher.final('base64');
  var uint8View = new Uint8Array(iv.buffer);
  var decoder = new TextDecoder();
  return emsg + '?iv=' + btoa(String.fromCharCode.apply(null, uint8View));
}
function decrypt(privkey, pubkey, ciphertext) {
  var [emsg, iv] = ciphertext.split('?iv=');
  var key = secp
    .getSharedSecret(privkey, '02' + pubkey, true)
    .toString()
    .substring(2);
  var decipher = browserifyCipher.createDecipheriv('aes-256-cbc', hexToBytes(key), hexToBytes(base64ToHex(iv)));
  var decryptedMessage = decipher.update(emsg, 'base64');
  const dmsg = decryptedMessage + decipher.final('utf8');
  return dmsg;
}
async function waitForHashFromOracle() {
  async function didOracleGiveHashYet(): Promise<string> {
    var hash_is_in = sessionStorage['oracle_hash'];
    return new Promise(function (resolve, reject) {
      if (!hash_is_in) {
        setTimeout(async function () {
          var msg = await didOracleGiveHashYet();
          resolve(msg);
        }, 100);
      } else {
        resolve(hash_is_in);
      }
    });
  }
  async function getTimeoutData() {
    var hash_is_in = await didOracleGiveHashYet();
    return hash_is_in;
  }
  var returnable = await getTimeoutData();
  return returnable;
}
async function handleMessage(message) {
  var [type, subId, event] = JSON.parse(message.data);
  var { kind, content } = event || {};
  if (!event) return;
  var sig_is_valid = await secp.schnorr.verify(event.sig, event.id, event.pubkey);
  if (!sig_is_valid) return;
  if (kind === 4239) {
    console.log('content:', content);
  }
  if (kind === 20004 || kind === 4) {
    if (event.pubkey == oracle_nostr) {
      content = decrypt(nostr_privKey, event.pubkey, content);
      sessionStorage['oracle_hash'] = content;
    }
  }
}
async function openConnection(e) {
  console.log('connected to ' + relay);
  var subscription = ['REQ', subId, filter];
  var subscription2 = ['REQ', subId2, filter2];
  socket.send(JSON.stringify(subscription));
  socket.send(JSON.stringify(subscription2));
}
function checkHeartbeat() {
  console.log('checking heartbeat');
  let heartbeat = false;
  var heartbeatsubId = '00000002' + ECPair.makeRandom().privateKey.toString('hex').substring(8);
  var heartbeatfilter = { ids: ['41ce9bc50da77dda5542f020370ecc2b056d8f2be93c1cedf1bf57efcab095b0'] };
  var heartbeatsub = ['REQ', heartbeatsubId, heartbeatfilter];
  if (socket && socket.readyState != 0) {
    socket.send(JSON.stringify(heartbeatsub));
  }
  setTimeout(function () {
    var closer = ['CLOSE', heartbeatsubId];
    if (socket && socket.readyState != 0) {
      socket.send(JSON.stringify(closer));
    }
  }, 1500);
  setTimeout(function () {
    if (!heartbeat && socket.readyState == 3) {
      socket.removeEventListener('open', openConnection);
      socket.removeEventListener('message', handleMessage);
      socket = new WebSocket(relay);
      socket.addEventListener('open', openConnection);
      socket.addEventListener('message', handleMessage);
    }
  }, 2000);
}

async function doBackgroundTasks() {
  checkHeartbeat();
  setTimeout(function () {
    doBackgroundTasks();
  }, 10000);
}
doBackgroundTasks();
async function preparePublicMessage(name, goal, date) {
  date = date.split('-');
  goal = Number(goal);
  var msg_for_oracle = {};
  msg_for_oracle['type'] = 'init';
  setTimeout(function () {
    sendDM(JSON.stringify(msg_for_oracle), oracle_nostr);
  }, 500);
  console.log([2]);
  var hash_and_sig = await waitForHashFromOracle();
  console.log([3]);
  var oracle_hash = JSON.parse(hash_and_sig)['hash'];
  var oracle_sig = JSON.parse(hash_and_sig)['sig'];
  var msgpreimg = `this hash: ${oracle_hash} is valid only for the fundraiser created by this pubkey: ${nostr_pubKey}`;
  var sigIsValid = await secp.verify(oracle_sig, bitcoinjs.crypto.sha256(msgpreimg), oracle_pubkey);
  if (!sigIsValid) {
    alert('something went horribly wrong');
    return;
  } else {
    console.log('yay the sig was valid');
  }
  var timestamp = Math.floor(new Date(date[0], date[1] - 1, date[2]).getTime() / 1000) + 86400;
  var keypair = ECPair.makeRandom();
  var privkey = keypair.privateKey.toString('hex');
  var pubkey = keypair.publicKey.toString('hex');
  sessionStorage['privkey'] = privkey;
  sessionStorage['pubkey'] = pubkey;
  console.log('pubkey:', pubkey);
  var msg = {};
  msg['name'] = name;
  msg['oracle_hash'] = oracle_hash;
  msg['oracle_pubkey'] = oracle_pubkey;
  msg['oracle_sig'] = oracle_sig;
  msg['oracle_nostr'] = oracle_nostr;
  msg['creator_pubkey'] = pubkey;
  msg['timestamp'] = timestamp;
  msg['goal'] = goal;
  msg['denomination'] = 'usd';
  sendPublicFundraiserMessage(JSON.stringify(msg));
}

function modalVanish() {
  document.getElementById('black-bg').style.display = 'none';
  document.getElementById('modal').style.display = 'none';
}
</script>
<template>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, user-scalable=no" />
  </head>

  <body>
    <h1>Create a fundraiser</h1>
    <p>Fundraiser name</p>
    <input id="name" type="text" name="name" />
    <p>Goal (in whole dollars, no cents)</p>
    <input id="goal" type="number" name="goal" min="1" value="1" />
    <p>End date</p>
    <input id="enddate" type="date" name="enddate" />
    <p>
      <button
        id="submitter"
        type="button"
        name="submitter"
        onclick="preparePublicMessage( 
          document.getElementById('name').value, document.getElementById('goal' ).value,
        document.getElementById( 'enddate' ).value );"
      >
        Submit
      </button>
    </p>
    <div id="link" style="overflow-wrap: break-word" />
    <div id="black-bg" onclick="modalVanish();" />
    <div id="modal" />
  </body>
</template>
<style scoped lang="scss">
* {
  box-sizing: border-box;
  font-size: 1.15em;
  font-family: Arial, sans-serif;
}

html {
  max-width: 70ch;
  padding: 3em 1em;
  margin: auto;
  line-height: 1.25;
}

h1 {
  font-size: 2em;
}

h2 {
  font-size: 1.5em;
}

input {
  width: 100%;
  height: 1.8em;
  border: 1px solid grey;
}

#black-bg {
  display: none;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  background-color: #000;
  opacity: 0.5;
  width: 100vw;
  height: 100vh;
}

#modal {
  display: none;
  position: fixed;
  box-sizing: border-box;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  max-width: 560px;
  background-color: #fff;
  border-radius: 10px;
  padding: 20px;
  color: #000;
  text-align: center;
  overflow-wrap: break-word;
}
</style>
