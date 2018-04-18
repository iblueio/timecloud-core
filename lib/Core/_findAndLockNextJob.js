'use strict'
const debug = require('debug')('timecloud:_findAndLockNextJob')
const utils = require('../utils')

const createJob = utils.createJob

/**
 * 查询任务并将其状态标志为lock
 * 
 * @param {String} jobName      任务名字
 * @param {Object} definition   任务定义信息
 * @param {Function} cb         Callback
 * @access protected
 * @caller jobQueueFilling() only
 * @returns {undefined}
 */
module.exports = function (jobName, definition, cb) {
  const self = this
  const now = new Date()
  const lockDeadline = new Date(Date.now().valueOf() - definition.lockLifetime)
  debug('_findAndLockNextJob(%s, [Function], cb)', jobName)

  // 先检测MongoDB状态是否正常，再进行操作
  const s = this._mdb.s || this._mdb.db.s
  if (s.topology.connections().length === 0) {
    if (s.topology.autoReconnect && !s.topology.isDestroyed()) {
      debug('Missing MongoDB connection, not attempting to find and lock a job')
      self.emit('error', new Error('Lost MongoDB connection'))
      cb()
    } else {
      debug('topology.autoReconnect: %s, topology.isDestroyed(): %s', s.topology.autoReconnect, s.topology.isDestroyed())
      cb(new Error('MongoDB connection is not recoverable, application restart required'))
    }
  } else {
    /**
    * 拼接查询条件
    */
    const JOB_PROCESS_WHERE_QUERY = {
      $or: [{
        name: jobName,
        lockedAt: null,
        nextRunAt: { $lte: this._nextScanAt },
        disabled: { $ne: true }
      }, {
        name: jobName,
        lockedAt: { $exists: false },
        nextRunAt: { $lte: this._nextScanAt },
        disabled: { $ne: true }
      }, {
        name: jobName,
        lockedAt: { $lte: lockDeadline },
        disabled: { $ne: true }
      }]
    }

    /**
    * 拼接Set条件
    */
    const JOB_PROCESS_SET_QUERY = { $set: { lockedAt: now } }

    /**
    * 拼接Options条件
    */
    const JOB_RETURN_QUERY = { returnOriginal: false, sort: this._sort }

    // 根据上面的拼接条件将任务更改为lock状态，然后启动任务
    this._collection.findOneAndUpdate(
      JOB_PROCESS_WHERE_QUERY,
      JOB_PROCESS_SET_QUERY,
      JOB_RETURN_QUERY,
      (err, result) => {
        let job
        if (!err && result.value) {
          debug('found a job available to lock, creating a new job on Timecloud with id [%s]', result.value._id)
          job = createJob(self, result.value)
        }
        if (err) {
          debug('error occurred when running query to find and lock job')
        }
        cb(err, job)
      })
  }
}
