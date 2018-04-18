'use strict'
const debug = require('debug')('timecloud:saveJob')
const utils = require('../utils')

const processJobs = utils.processJobs

/**
 * 将任务信息存储进MongoDB
 * 
 * @param {module.Job} job 需要存储的Job实例
 * @param {Function} cb    Callback
 * @returns {undefined}
 */
module.exports = function (job, cb) {
  debug('attempting to save a job into Timecloud instance')

  // 获取需要记录的但不需要存储到MongoDB的任务信息
  const fn = cb
  const self = this
  const id = job.attrs._id
  const unique = job.attrs.unique
  const uniqueOpts = job.attrs.uniqueOpts

  // 删除上述获取到的信息
  const props = job.toJSON()
  delete props._id
  delete props.unique
  delete props.uniqueOpts

  // 在数据库中存储操作这个任务的Timecloud实例名字
  props.lastModifiedBy = this._name
  debug('set job props: \n%O', props)

  // 获取当前时间并拼接MongoDB默认查询条件
  const now = new Date()
  const protect = {}
  let update = { $set: props }
  debug('current time stored as %s', now.toISOString())

  // 如果当前的Job实例已经拥有id字段, 则在MongoDB中更新记录而不是插入记录
  if (id) {
    // 更新记录
    debug('job already has _id, calling findOneAndUpdate() using _id as query')
    this._collection.findOneAndUpdate({
      _id: id
    },
      update, {
        returnOriginal: false
      },
      processDbResult)
  } else if (props.type === 'single') {
    debug('job with type of "single" found')

    // 如果 nextRunAt 的时间在当前时间以前, 则不取更新数据库中的这个字段, 标识该任务阻塞
    if (props.nextRunAt && props.nextRunAt <= now) {
      debug('job has a scheduled nextRunAt time, protecting that field from upsert')
      protect.nextRunAt = props.nextRunAt
      delete props.nextRunAt
    }

    // 保护记录不被覆盖
    if (Object.keys(protect).length > 0) {
      update.$setOnInsert = protect
    }

    // 尝试插入任务信息
    debug('calling findOneAndUpdate() with job name and type of "single" as query')
    this._collection.findOneAndUpdate({
      name: props.name,
      type: 'single'
    },
      update, {
        upsert: true,
        returnOriginal: false
      },
      processDbResult)
  } else if (unique) {
    // 如果希望任务是唯一标识的, 则在插入的时候使用unique字段标识
    const query = job.attrs.unique
    query.name = props.name
    if (uniqueOpts && uniqueOpts.insertOnly) {
      update = { $setOnInsert: props }
    }

    // 使用unique查找条件去判断应该更新记录还是插入记录
    debug('calling findOneAndUpdate() with unique object as query: \n%O', query)
    this._collection.findOneAndUpdate(query, update, { upsert: true, returnOriginal: false }, processDbResult)
  } else {
    // 经过上述判断，最后得出这个记录是新的，则插入该记录
    debug('using default behavior, inserting new job via insertOne() with props that were set: \n%O', props)
    this._collection.insertOne(props, processDbResult)
  }

  /**
   * 处理从数据库中查询到的任务信息，决定是立即执行还是让processJob()方法去执行
   * @param {Error} err   从MongoDB中获取到的错误信息
   * @param {*} result    从findOneAndUpdate()方法或insertOne()发方法获取到的MongoDB记录
   * @access private
   * @returns {undefined}
   */
  function processDbResult(err, result) {
    // 检测是否从MongoDB中获取到错误信息
    if (err) {
      debug('processDbResult() received an error, job was not updated/created')
      if (fn) {
        return fn(err)
      }
      throw err
    } else if (result) {
      debug('processDbResult() called with success, checking whether to process job immediately or not')

      // 根据ops字段判断是findOneAndUpdate()方法返回的还是insertOne()返回的
      let res = result.ops ? result.ops : result.value
      if (res) {
        // 如果查询到数组，则取第一个做为查询到的任务信息
        if (Array.isArray(res)) {
          res = res[0]
        }

        // 获取任务的_id和nextRunAt字段，用于决定是立即执行还是按周期执行
        job.attrs._id = res._id
        job.attrs.nextRunAt = res.nextRunAt

        // 如果任务信息的nextRunAt字段不存在，或在当前时间以前，则立即执行该任务
        if (job.attrs.nextRunAt && job.attrs.nextRunAt < self._nextScanAt) {
          debug('[%s:%s] job would have ran by nextScanAt, processing the job immediately', job.attrs.name, res._id)
          processJobs.call(self, job)
        }
      }
    }

    // 如果有回调函数，则执行回调函数
    if (fn) {
      fn(null, job)
    }
  }
}
