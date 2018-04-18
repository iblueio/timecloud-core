'use strict'
const debug = require('debug')('timecloud:stop')

/**
 * 清除所有任务的执行周期
 * 
 * @param {Function} cb Callback
 * @returns {undefined}
 */
module.exports = function (cb) {
  const self = this
  /**
   * 内部方法: 解锁所有处于lock状态的任务，使他们可以在下次启动服务的时候不会因为状态没更新而被卡住
   * 
   * @param {Function} done Callback
   * @access private
   * @returns {undefined}
   */
  const _unlockJobs = function (done) {
    debug('Timecloud._unlockJobs()')
    const jobIds = self._lockedJobs.map(job => job.attrs._id)

    if (jobIds.length === 0) {
      debug('no jobs to unlock')
      return done()
    }

    debug('about to unlock jobs with ids: %O', jobIds)
    self._collection.updateMany({ _id: { $in: jobIds } }, { $set: { lockedAt: null } }, err => {
      if (err) {
        return done(err)
      }

      self._lockedJobs = []
      return done()
    })
  }

  debug('Timecloud.stop called, clearing interval for processJobs()')
  cb = cb || function () { }
  clearInterval(this._processInterval)
  this._processInterval = undefined
  _unlockJobs(cb)
}
