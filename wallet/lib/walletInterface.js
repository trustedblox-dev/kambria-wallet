var EventEmitter = require('events');

const ERROR = require('./error');
const CHANGED = require('./changed');

class WalletInterface {
  constructor() {
    class Emitter extends EventEmitter { }
    this.emitter = new Emitter();

    this.user = {
      network: null,
      account: null,
      balance: null,
      changed: null
    };

    this.web3 = null;
  }

  /**
   * Default meta status, need to be overwriten.
   */
  metaStatus() {
    throw new Error(ERROR.META_STATUS_UNSUPPORTED);
  }

  /**
   * Check valid address
   * @param {*} address 
   */
  isAddress(address) {
    return this.web3.isAddress(address);
  }

  /**
   * Get network id
   */
  getNetwork() {
    var self = this;
    return new Promise((resolve, reject) => {
      self.web3.version.getNetwork((er, re) => {
        if (er) return reject(er);
        return resolve(re);
      });
    });
  }

  /**
   * Get account info
   */
  getAccount() {
    var self = this;
    return new Promise((resolve, reject) => {
      self.web3.eth.getAccounts((er, re) => {
        if (er) return reject(er);
        if (re.length <= 0 || !re[0] || !self.isAddress(re[0])) return reject(ERROR.CANNOT_GET_ACCOUNT);
        return resolve(re[0]);
      });
    });
  }

  /**
   * Get account balance
   * @param {*} address 
   */
  getBalance(address) {
    var self = this;
    return new Promise((resolve, reject) => {
      if (!self.isAddress(address)) return reject(ERROR.CANNOT_GET_BALANCE);
      self.web3.eth.getBalance(address, (er, re) => {
        if (er) return reject(er);
        return resolve(Number(re));
      });
    });
  }

  /**
   * Fetch info of user
   */
  fetch() {
    var self = this;
    return new Promise((resolve, reject) => {
      self.getNetwork().then(re => {
        self.user.network = re;
        return self.getAccount();
      }).then(re => {
        self.user.account = re;
        if (!self.user.account) return reject(ERROR.CANNOT_GET_ACCOUNT);
        return self.getBalance(self.user.account);
      }).then(re => {
        self.user.balance = re;
        let data = JSON.parse(JSON.stringify(self.user));
        return resolve(data);
      }).catch(er => {
        return reject(er);
      });
    });
  }

  /**
   * Watch any changes of provider
   */
  watch() {
    var self = this;
    return new Promise((resolve) => {
      var watchCurrentAccount = setInterval(() => {
        // Watch switching network event
        self.getNetwork().then(re => {
          if (self.user.network !== re) {
            self.user.network = re;
            self.user.changed = CHANGED.NETWORK;
            let data = JSON.parse(JSON.stringify(self.user));
            return self.emitter.emit('data', data);
          }
        }).catch(er => {
          self.user.network = null;
          return self.emitter.emit('error', er);
        });
        // Watch switching account event
        self.getAccount().then(re => {
          if (self.user.account !== re) {
            self.user.account = re;
            self.user.changed = CHANGED.ACCOUNT;
            let data = JSON.parse(JSON.stringify(self.user));
            return self.emitter.emit('data', data);
          }
        }).catch(er => {
          self.user.account = null;
          return self.emitter.emit('error', er);
        });
        // Watch changing balance event
        if (self.user.account) self.getBalance(self.user.account).then(re => {
          if (self.user.balance !== re) {
            self.user.balance = re;
            self.user.changed = CHANGED.BALANCE;
            let data = JSON.parse(JSON.stringify(self.user));
            return self.emitter.emit('data', data);
          }
        }).catch(er => {
          self.user.balance = null;
          return self.emitter.emit('error', er);
        });
      }, 2000);

      var stopWatching = function () {
        clearInterval(watchCurrentAccount);
        self.emitter.removeAllListeners();
      }

      return resolve({ stopWatching: stopWatching, event: self.emitter });
    });
  }
}

module.exports = WalletInterface;