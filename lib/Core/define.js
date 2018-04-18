'use strict'
const debug = require('debug')('timecloud:define')

/**
 * 定义任务, 将用户定义的任务参数等存入内存(this._definitions)
 * 
 * @param {String} name         Name of job
 * @param {Object} options      Options for job to run
 * @param {Function} processor  Function to be called to run job
 * @returns {undefined}
 */
module.exports = function(name, options, processor) {
  if (!processor) {
    processor = options
    options = {}
  }
  this._definitions[name] = {
    fn: processor,
    concurrency: options.concurrency || this._defaultConcurrency,
    lockLimit: options.lockLimit || this._defaultLockLimit,
    priority: options.priority || 0,
    lockLifetime: options.lockLifetime || this._defaultLockLifetime,
    running: 0,
    locked: 0
  }
  debug('job [%s] defined with following options: \n%O', name, this._definitions[name])
}
