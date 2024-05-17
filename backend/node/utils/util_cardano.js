
/*
 *       Calls to Cardano Lib APIs
 */

const axios = require('axios').default;
const CardanoWasm = require("@emurgo/cardano-serialization-lib-nodejs");
const Bip39 = require("bip39");
const {Buffer} = require('buffer');
const { Seed } = require('cardano-wallet-js');
    
let harden = function (num) {
    return 0x80000000 + num;
}

/*
 *       Wallet
 */

// check here: https://forum.cardano.org/t/using-emurgo-cardano-serialization-lib-nodejs-for-creating-and-signing-transaction/88864 

const getKeyDetails = (_mnemonic) => {
    const seed = Bip39.mnemonicToSeedSync(_mnemonic, "")
    const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(seed, Buffer.from (""));
    const privateKey = rootKey.to_raw_key();
    const publicKey = rootKey.to_public().to_raw_key();
    const accountKey = rootKey
        .derive(harden(1852)) // purpose
        .derive(harden(1815)) // coin type
        .derive(harden(0)); // account #0
    const utxoPubKey = accountKey
        .derive(0) // external
        .derive(0)
        .to_public();
    const stakeKey = accountKey
        .derive(2) // chimeric
        .derive(0)
        .to_public();

    return { 
        seed: seed,
        privateKey: privateKey, 
        publicKey: publicKey, 
        utxoPubKey: utxoPubKey, 
        stakeKey: stakeKey 
    }
}

const getBaseAddress = (objKey) => {
    const baseAddr = CardanoWasm.BaseAddress.new(
        CardanoWasm.NetworkInfo.testnet().network_id(),
        CardanoWasm.StakeCredential.from_keyhash(objKey.utxoPubKey.to_raw_key().hash()),
        CardanoWasm.StakeCredential.from_keyhash(objKey.stakeKey.to_raw_key().hash()),
      );
    return baseAddr;
}


const getPrivateKey = (objKey) => {
    return objKey.privateKey;
}

const getPublicKey = (objKey) => {
    return objKey.publicKey;
}

const generateSeedPhrase = async function (){
    // generate a recovery phrase of 15 words (default)
    const mnemonic = Seed.generateRecoveryPhrase();
    return {
        data: {
            mnemonic: mnemonic,
            seed: Bip39.mnemonicToSeedSync(mnemonic, "").toString('hex')
        }
    };    
}


const getWalletDetails = async function (objParam){
    try {
        if(!objParam.mnemonic) {
            throw {
                data:null,
                status: 400,
                statusText: "Mnemonic required"
            }
        }

        let objKey = getKeyDetails(objParam.mnemonic);
        let baseAddr = getBaseAddress(objKey).to_address().to_bech32();
        return {
            data: {
                addr: baseAddr,
                private: getPrivateKey(objKey).to_bech32(),
                mnemonic: objParam.mnemonic,
                seed: objKey.seed.toString('hex')
            }
        };    
    }
    catch(err)  {
        throw err;
    }
}

/*
 *       Transactions
 */

const async_prepareTx = async function (objParam){
}

const async_signTx = async function (objParam){
}

const async_submitTx = async function (objParam){
}

module.exports = {
    generateSeedPhrase,
    getWalletDetails,
    async_prepareTx,
    async_signTx,
    async_submitTx
}