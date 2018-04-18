'use strict'
const debug = require('debug')('timecloud:purge')

/**
 * 清除数据库中所有旧的任务（即实例化Timecloud后没有被define的任务）
 * 
 * @param {Function} cb   Callback
 * @returns {undefined}
 */
module.exports = function (cb) {
  const definedNames = Object.keys(this._definitions)
  debug('Timecloud.purge(%o)')
  this.cancel({name: {$not: {$in: definedNames}}}, cb)
}
