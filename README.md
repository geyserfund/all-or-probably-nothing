# All-Or-Probably-Nothing (fork of Rise)

All-Or-Probably-Nothing is an Open Source crowdfunding software to raise funds with a hard funding goal limit. If the goal is reached, the funds are deposited to the crowdfund creator. Otherwise, the contributors can get their money back.

More on the original repository [here](https://github.com/supertestnet/rise-fundraising-software#readme).

# How does it work?

Create a fundraiser here: [https://supertestnet.github.io/rise-fundraising-software/create.html](https://supertestnet.github.io/rise-fundraising-software/create.html)

You'll get a sharable link where people can contribute and you can watch your money roll in. The addresses created on the fundraising page are non-custodial bitcoin smart contracts. They allow one of two spending paths: one uses two keys, namely, the fundraiser recipient's key and a key from a trusted oracle -- i.e. my server, or someone else's if it's configured to talk to someone else's server. This spending path allows the fundraiser recipient to take the money only if the oracle lets them. The oracle is only supposed to do this if the fundraiser meets its goal. (That's what index.js does -- it checks if the fundraiser met its goal and then reveals a key to the fundraiser recipient so they can take their money.)

The other spending path is a timelock: if the fundraiser didn't meet its goal, then the oracle should not have revealed the key that lets the fundraiser recipient take the money, so 24 hours after the fundraiser ends, the contributor can take their money back.

# Can I use this software?

Yes, this software was originally released under a Creative Commons license, read more about it [here](https://github.com/geyserfund/all-or-probably-nothing/blob/main/LICENSE)

# Installation

## Pre-requisites

* NodeJS, originally developed on v16.17.0
* NPM, originally developed on version 8.15.0

## Installation

```
git clone geyserfund/all-or-probably-nothing
cd all-or-probably-nothing
npm init
npm install ws browserify-cipher noble-secp256k1 bitcoinjs-lib axios crypto fs
```

Then run the application with:

```
node index.js
```

## Managing Keys

Your private keys are in a file it created called keys.txt in case you want to back those up. 

> **Warning**
> Don't delete that file, your private keys are used throughout the app and they are pulled from that file.

The app should spit out a nostr pubkey and a signing pubkey in your terminal. Copy those keys and add them to redemption.html -- replace the keys I put in for my instance on lines 425 and 426. Do the same thing on lines 140 and 141 of create.html. Then take just the signing key, go into contribute.html, and replace my key with yours on line 315. Great! Now you are your own oracle. Have fun!
