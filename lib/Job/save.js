'use strict'

/**
 * 保存任务至MongoDB
 * 
 * @param {Function} cb   Callback
 * @returns {exports}     Instance of Job
 */
module.exports = function (cb) {
  this.core.saveJob(this, cb)
  return this
}
