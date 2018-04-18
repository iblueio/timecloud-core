'use strict'
const debug = require('debug')('timecloud:db_init')

/**
 * 连接MongoDB后初始化使用的Collection, 建立索引
 * 
 * @param {String} collection MongoDB Collection Name, default is timecloudJobs
 * @param {Function} cb       Callback
 * @returns {undefined}
 */
module.exports = function (collection, cb) {
  const self = this
  debug('init database collection using name [%s]', collection)
  this._collection = this._mdb.collection(collection || 'timecloudJobs')
  debug('attempting index creation')
  this._collection.createIndex(this._indices, {
    name: 'findAndLockNextJobIndex'
  }, (err, result) => {
    if (err) {
      debug('index creation failed')
      self.emit('error', err)
    } else {
      debug('index creation success')
      self.emit('ready')
    }

    if (cb) {
      cb(err, self._collection)
    }
  })
}
