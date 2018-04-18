'use strict'

/**
 * 用于初始化MongoDB连接
 * 
 * @param {MongoClient} mdb   MongoClient Instance
 * @param {String} collection MongoDb Collection Name
 * @param {Function} cb       Callback
 * @returns {exports}         Instance of Core
 */
module.exports = function(mdb, collection, cb) {
  this._mdb = mdb
  this.db_init(collection, cb)
  return this
}
