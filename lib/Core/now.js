'use strict'
const debug = require('debug')('timecloud:now')

/**
 * 在当前时间立即新建一个任务并保存至MongoDB
 * 
 * @param {String} name   任务名称
 * @param {Object} data   任务入参
 * @param {Function} cb   Callback
 * @returns {module.Job}  New job instance created
 */
module.exports = function (name, data, cb) {
  if (!cb && typeof data === 'function') {
    cb = data
    data = undefined
  }
  debug('Timecloud.now(%s, [Object])', name)
  const job = this.create(name, data)
  job.schedule(new Date())
  job.save(cb)
  return job
}
