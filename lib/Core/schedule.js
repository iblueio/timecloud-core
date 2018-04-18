'use strict'
const debug = require('debug')('timecloud:schedule')

/**
 * 定义一个任务或多个任务的执行周期
 * 
 * @param {String} when   任务开始时间
 * @param {*}     names   任务名字, 字符串或数组
 * @param {Object} data   任务入参
 * @param {Function} cb   Callback
 * @returns {*}           Job or jobs created
 */
module.exports = function (when, names, data, cb) {
  const self = this

  if (cb === undefined && typeof data === 'function') {
    cb = data
    data = undefined
  }

  /**
   * 内部方法: 创建任务并写入数据库
   * 
   * @param {String} when   任务开始时间
   * @param {*}     names   任务名字, 字符串或数组
   * @param {Object} data   任务入参
   * @param {Function} cb   Callback
   * @returns {module.Job}  Instance of new job
   */
  const createJob = (when, name, data, cb) => {
    const job = self.create(name, data)
    job.schedule(when)
    job.save(cb)
    return job
  }

  /**
   * 内部方法: 将createJob变为批量接口
   * 
   * @param {String} when   任务开始时间
   * @param {*}     names   任务名字, 字符串或数组
   * @param {Object} data   任务入参
   * @param {Function} cb   Callback
   * @returns {module.Job}  Instance of new job
   * @returns {*}           Jobs that were created
   */
  const createJobs = (when, names, data, cb) => {
    const results = []
    let pending = names.length
    let errored = false
    return names.map((name, i) => {
      return createJob(when, name, data, (err, result) => {
        if (err) {
          if (!errored) {
            cb(err)
          }
          errored = true
          return
        }
        results[i] = result
        if (--pending === 0 && cb) {
          debug('Timecloud.schedule()::createJobs() -> all jobs created successfully')
          cb(null, results)
        } else {
          debug('Timecloud.schedule()::createJobs() -> error creating one or more of the jobs')
        }
      })
    })
  }

  if (typeof names === 'string' || names instanceof String) {
    debug('Timecloud.schedule(%s, %O, [Object], cb)', when, names)
    return createJob(when, names, data, cb)
  } else if (Array.isArray(names)) {
    debug('Timecloud.schedule(%s, %O, [Object], cb)', when, names)
    return createJobs(when, names, data, cb)
  }
}
