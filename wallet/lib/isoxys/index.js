var WalletInterface = require('../walletInterface');
var async = require("async");
var util = require('../util');
var Provider = require('../provider');
var Privatekey = require('./privatekey');
var Mnemonic = require('./mnemonic');
var Keystore = require('./keystore');
var Ledger = require('./ledger');

const TYPE = require('../type');


class Isoxys extends WalletInterface {

  constructor(net, type) {
    super(net, type);
    
    this.provider = null;
  }

  /**
   * @func setWallet
   * (Internal function) Set up acc to store that can be used as a wallet
   * @param {*} accOpts 
   */
  setWallet(accOpts, callback) {
    var self = this;
    this.provider = (this.type === TYPE.HARDWALLET) ?
      new Provider.HardWallet(this.net) :
      new Provider.SoftWallet(this.net);
    this.provider.init(accOpts, function (web3) {
      self.web3 = web3;
      return callback();
    });
  }

  /**
   * PRIVATE KEY
   */

  /**
   * @func setAccountByPrivatekey
   * Set account by private key. (Do not recommend to use)
   * This function is using private key in direct. Eventhought it was secured by 
   * some cryptographical functions, but we strongly recommend to avoid using it in the
   * production environment.
   * @param {*} privatekey 
   * @param {function} getPassphrase 
   */
  setAccountByPrivatekey(privatekey, getPassphrase, callback) {
    console.warn(`ATTENTION:
    This function is using private key in direct.
    Eventhought it was secured by some cryptographical functions,
    but we strongly recommend to avoid using it in the production environment.`);
    var account = Privatekey.privatekeyToAccount(privatekey);
    account.getPassphrase = getPassphrase;
    this.setWallet(account, callback);
  }

  /**
   * @func getAccountByPrivatekey
   * Get account by private key. (Do not recommend to use)
   * @param {*} privatekey
   * @param {*} callback 
   */
  getAccountByPrivatekey(privatekey, callback) {
    console.warn(`ATTENTION:
    This function is using private key in direct.
    Eventhought it was secured by some cryptographical functions,
    but we strongly recommend to avoid using it in the production environment.`);
    var account = Privatekey.privatekeyToAccount(privatekey);
    return callback(null, account.address);
  }


  /**
   * MNEMONIC / HDKEY
   */

  /**
   * @func setAccountByMnemonic
   * Set account by mnemonic (bip39) following hdkey (bip44)
   * @param {*} mnemonic - 12 words
   * @param {*} password - (optional) password
   * @param {*} path - root derivation path
   * References:
   * m/44'/60'/0'/0: (Default) Jaxx, Metamask, Exodus, imToken, TREZOR (ETH) & BitBox
   * m/44'/60'/0': Ledger (ETH)
   * m/44'/60'/160720'/0': Ledger (ETC)
   * m/44'/61'/0'/0: TREZOR (ETC)
   * m/0'/0'/0': SingularDTV
   * m/44'/1'/0'/0: Network: Testnets
   * m/44'/40'/0'/0: Network: Expanse
   * m/44'/108'/0'/0: Network: Ubiq
   * m/44'/163'/0'/0: Network: Ellaism
   * m/44'/1987'/0'/0: Network: EtherGem
   * m/44'/820'/0'/0: Network: Callisto
   * m/44'/1128'/0'/0: Network: Ethereum Social
   * m/44'/184'/0'/0: Network: Musicoin
   * m/44'/6060'/0'/0: Network: GoChain
   * m/44'/2018'/0'/0: Network: EOS Classic
   * m/44'/200625'/0'/0: Network: Akroma (AKA)
   * m/44'/31102'/0'/0: Network: EtherSocial Network (ESN)
   * m/44'/164'/0'/0: Network: PIRL
   * m/44'/1313114'/0'/0: Network: Ether-1 (ETHO)
   * m/44'/1620'/0'/0: Network: Atheios (ATH)
   * m/44'/889'/0'/0: Network: TomoChain (TOMO)
   * m/44'/76'/0'/0: Network: Mix Blockchain (MIX)
   * m/44'/1171337'/0'/0: Network: Iolite (ILT)
   * 
   * @param {*} index - index of account
   * @param {function} getPassphrase - simulate the account locking/unlocking
   */
  setAccountByMnemonic(mnemonic, password, path, index, getPassphrase, callback) {
    var seed = Mnemonic.mnemonicToSeed(mnemonic, password)
    var hdk = Mnemonic.seedToHDKey(seed);
    var account = Mnemonic.hdkeyToAccount(hdk, path, index);
    account.getPassphrase = getPassphrase;
    this.setWallet(account, callback);
  }

  /**
   * @func getAccountsByMnemonic
   * Get list of accounts by mnemonic
   * @param {*} mnemonic - 12 words 
   * @param {*} password - (optional) password
   * @param {*} path - root derivation path (m/44'/60'/0'/0 as default)
   * @param {*} limit - the number of record per page
   * @param {*} page - index of page
   */
  getAccountsByMnemonic(mnemonic, password, path, limit, page, callback) {
    var list = [];
    for (var i = page * limit; i < page * limit + limit; i++) {
      var seed = Mnemonic.mnemonicToSeed(mnemonic, password)
      var hdk = Mnemonic.seedToHDKey(seed);
      var address = Mnemonic.hdkeyToAddress(hdk, path, i);
      list.push(address);
    }
    return callback(null, list);
  }


  /**
   * KEYSTORE
   */

  /**
   * @func setAccountByKeystore
   * Set account by keystore file
   * @param {*} input - input object
   * @param {*} password - password
   * @param {function} getPassphrase - simulate the account locking/unlocking 
   */
  setAccountByKeystore(input, password, getPassphrase, callback) {
    var account = Keystore.recover(input, password);
    account.getPassphrase = getPassphrase;
    this.setWallet(account, callback);
  }

  /**
   * @func getAccountByKeystore
   * Get account by keystore file
   * @param {*} input - input object
   * @param {*} password - password
   * @param {*} callback 
   */
  getAccountByKeystore(input, password, callback) {
    var account = Keystore.recover(input, password);
    return callback(null, account.address);
  }


  /**
   * LEDGER
   */

  /**
   * @func setAccountByLedger
   * Set account by ledger
   * @param {*} path - root derivation path (m/44'/60'/0' as default)
   * @param {*} index - (optional)
   */
  setAccountByLedger(path, index, callback) {
    var account = {
      getAddress: Ledger.getAddress,
      signTransaction: Ledger.signTransaction,
      path: path,
      index: index
    }
    this.setWallet(account, callback);
  }

  /**
   * @func getAccountsByLedger
   * Get list of accounts by ledger
   * @param {*} path - root derivation path (m/44'/60'/0' as default)
   * @param {*} limit 
   * @param {*} page 
   */
  getAccountsByLedger(path, limit, page, callback) {
    var list = [];
    var coll = [];

    for (var index = page * limit; index < page * limit + limit; index++) {
      coll.push(index);
    }

    if (!path) {
      return callback(null, []);
    } else if (coll.length > 0) {
      async.eachSeries(coll, function (i, cb) {
        var dpath = util.addDPath(path, i);
        Ledger.getAddress(dpath, function (er, addr) {
          if (er) return cb(er);
          if (addr) list.push(addr);
          return cb();
        });
      }, function (er) {
        if (er) return callback(er, null);
        return callback(null, list);
      });
    }
    else {
      return callback(null, []);
    }
  }
}

module.exports = Isoxys;