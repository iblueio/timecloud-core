'use strict'
const debug = require('debug')('timecloud:name')

/**
 * 设置 Timecloud 实例的名字
 * 
 * @param {String} name
 * @returns {exports}
 */
module.exports = function (name) {
  debug('Timecloud.name(%s)', name)
  this._name = name
  return this
}
