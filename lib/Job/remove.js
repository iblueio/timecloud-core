'use strict'

/**
 * 从MongoDB中删除任务
 * 
 * @param {Function} cb     Callback
 * @returns {undefined}
 */
module.exports = function (cb) {
  this.core.cancel({ _id: this.attrs._id }, cb)
}
