'use strict'

/**
 * 更新任务的lockedAt字段, 使任务进入lock状态
 * 
 * @param {Function} cb called when job "touch" fails or passes
 * @returns {undefined}
 */
module.exports = function(cb) {
  this.attrs.lockedAt = new Date()
  this.save(cb)
}
