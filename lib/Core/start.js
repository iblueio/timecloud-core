'use strict'
const debug = require('debug')('timecloud:start')
const utils = require('../utils')

const processJobs = utils.processJobs

/**
 * 使用 processJobs() 方法开启所有任务周期
 * 
 * @returns {undefined}
 */
module.exports = function() {
  if (this._processInterval) {
    debug('Timecloud.start was already called, ignoring')
  } else {
    debug('Timecloud.start called, creating interval to call processJobs every [%dms]', this._processEvery)
    this._processInterval = setInterval(processJobs.bind(this), this._processEvery)
    process.nextTick(processJobs.bind(this))
  }
}
