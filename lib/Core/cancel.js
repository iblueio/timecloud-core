'use strict'
const debug = require('debug')('timecloud:cancel')

/**
 * 取消符合查询条件的所有任务, 从MongoDB中删除任务信息
 * 
 *  @param {Object} query MongoDB 查询条件
 *  @param {Function} cb  Callback(error, numRemoved)
 *  @caller client code, Core.purge(), Job.remove()
 *  @returns {undefined}
 */
module.exports = function(query, cb) {
  debug('attempting to cancel all Timecloud jobs', query)
  this._collection.deleteMany(query, (error, result) => {
    if (cb) {
      if (error) {
        debug('error trying to delete jobs from MongoDB')
      } else {
        debug('jobs cancelled')
      }
      cb(error, result && result.result ? result.result.n : undefined)
    }
  })
}
