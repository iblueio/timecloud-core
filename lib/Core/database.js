'use strict'
const MongoClient = require('mongodb').MongoClient
const debug = require('debug')('timecloud:database')

/**
 * 连接MongoDB数据库
 * 
 * @param {String} url        MongoDB URL
 * @param {String} collection MongoDB Collection Name
 * @param {Object} options    Connect Options
 * @param {Function} cb       Callback
 * @returns {exports}
 */
module.exports = function (url, collection, options, cb) {
  const self = this
  if (!url.match(/^mongodb:\/\/.*/)) {
    url = 'mongodb://' + url
  }

  collection = collection || 'timecloudJobs'
  options = Object.assign({ autoReconnect: true, reconnectTries: Number.MAX_SAFE_INTEGER, reconnectInterval: this._processEvery }, options)
  MongoClient.connect(url, options, (error, db) => {
    if (error) {
      debug('error connecting to MongoDB using collection: [%s]', collection)
      if (cb) {
        cb(error, null)
      } else {
        throw error
      }
      return
    }
    debug('successful connection to MongoDB using collection: [%s]', collection)
    self._mdb = db
    self.db_init(collection, cb)
  })
  return this
}
