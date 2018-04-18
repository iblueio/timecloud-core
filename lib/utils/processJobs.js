'use strict'
const debug = require('debug')('timecloud:internal:processJobs')
const createJob = require('./createJob')

/**
 * 轮询MongoDB并处理所有的任务, 如果传入extraJob参数, 则立即执行这个任务
 * 
 * 
 * @param {module.Job} extraJob  需要立即执行的任务
 * @returns {undefined}
 */
module.exports = function(extraJob) {
  debug('starting to process jobs')
  // 确保this._processInterval已经被设置（如果Core.stop()方法被调用，会清除这个字段）
  if (!this._processInterval) {
    debug('no _processInterval set when calling processJobs, returning')
    return
  }

  const self = this
  const definitions = this._definitions
  const jobQueue = this._jobQueue
  let jobName

  // 确认是否有立即执行的任务，如果没有，则解析当前定义的任务
  if (!extraJob) {
    //遍历当前的任务队列，将要执行的任务推入任务队列
    for (jobName in definitions) {
      if ({}.hasOwnProperty.call(definitions, jobName)) {
        debug('queuing up job to process: [%s]', jobName)
        jobQueueFilling(jobName)
      }
    }
  } else if (definitions[extraJob.attrs.name]) {
    // 立即执行任务
    debug('job [%s] was passed directly to processJobs(), locking and running immediately', extraJob.attrs.name)
    self._jobsToLock.push(extraJob)
    lockOnTheFly()
  }

  /**
   * 判定一个任务是否需要被设置为lock状态
   * @param {String} name 任务名字
   * @returns {boolean}   是否需要被lock
   */
  function shouldLock(name) {
    const jobDefinition = definitions[name]
    let shouldLock = true
    if (self._lockLimit && self._lockLimit <= self._lockedJobs.length) {
      shouldLock = false
    }
    if (jobDefinition.lockLimit && jobDefinition.lockLimit <= jobDefinition.locked) {
      shouldLock = false
    }
    debug('job [%s] lock status: shouldLock = %s', name, shouldLock)
    return shouldLock
  }

  /**
   * 内部方法: 将任务推入任务队列并根据优先级排队
   * @param {*} jobs          需要被推入的任务
   * @param {boolean} inFront 是否需要被推入到队列之前（优先级）
   * @returns {undefined}
   */
  function enqueueJobs(jobs, inFront) {
    if (!Array.isArray(jobs)) {
      jobs = [jobs]
    }

    jobs.forEach(job => {
      let jobIndex
      let start
      let loopCondition
      let endCondition
      let inc

      if (inFront) {
        start = jobQueue.length ? jobQueue.length - 1 : 0
        inc = -1
        loopCondition = function() {
          return jobIndex >= 0
        }
        endCondition = function(queuedJob) {
          return !queuedJob || queuedJob.attrs.priority < job.attrs.priority
        }
      } else {
        start = 0
        inc = 1
        loopCondition = function() {
          return jobIndex < jobQueue.length
        }
        endCondition = function(queuedJob) {
          return queuedJob.attrs.priority >= job.attrs.priority
        }
      }

      for (jobIndex = start; loopCondition(); jobIndex += inc) {
        if (endCondition(jobQueue[jobIndex])) {
          break
        }
      }

      jobQueue.splice(jobIndex, 0, job)
    })
  }

  /**
   * 内部方法: 锁定一个任务置为lock状态并保存至MongoDB
   * 由于有限任务会在开始前就立即执行（大多数时候是因为手动触发，需要使用这个方法锁定任务）
   * @returns {undefined}
   */
  function lockOnTheFly() {
    // 如果被锁定了，则直接返回
    if (self._isLockingOnTheFly) {
      debug('lockOnTheFly() already running, returning')
      return
    }

    // 如果没有需要锁定的任务，则直接返回
    if (self._jobsToLock.length === 0) {
      debug('no jobs to current lock on the fly, returning')
      self._isLockingOnTheFly = false
      return
    }

    self._isLockingOnTheFly = true

    // 获取需要锁定的任务并更新字段
    const now = new Date()
    const job = self._jobsToLock.pop()

    // 判断能否被锁定（因为有lockLimit的限制）
    if (!shouldLock(job.attrs.name)) {
      debug('lock limit hit for: [%s]', job.attrs.name)
      self._jobsToLock = []
      self._isLockingOnTheFly = false
      return
    }

    // 查询MongoDB检测是否需要被锁定
    const criteria = {
      _id: job.attrs._id,
      lockedAt: null,
      nextRunAt: job.attrs.nextRunAt,
      disabled: {$ne: true}
    }

    // 设置更新条件和选项
    const update = {$set: {lockedAt: now}}
    const options = {returnOriginal: false}

    // 锁定任务，使用MongoDB原子操作
    self._collection.findOneAndUpdate(criteria, update, options, (err, resp) => {
      if (err) {
        throw err
      }
      // 如果任务被锁定，则可以开始执行任务
      if (resp.value) {
        const job = createJob(self, resp.value)
        debug('found job [%s] that can be locked on the fly', job.attrs.name)
        self._lockedJobs.push(job)
        definitions[job.attrs.name].locked++
        enqueueJobs(job)
        jobProcessing()
      }

      // 执行完毕，解除限制
      self._isLockingOnTheFly = false

      // 重新执行该函数，处理下一个需要锁定的任务
      lockOnTheFly()
    })
  }

  /**
   * 内部方法: 将任务推入任务执行队列
   * 
   * @param {String} name fill a queue with specific job name
   * @returns {undefined}
   */
  function jobQueueFilling(name) {
    // 如果该任务不能被锁定（通常是达到了锁定上限），则直接返回
    if (!shouldLock(name)) {
      debug('lock limit reached in queue filling for [%s]', name)
      return
    }

    // 设置下次执行_processEvery的时间
    const now = new Date()
    self._nextScanAt = new Date(now.valueOf() + self._processEvery)

    // 寻找下一次需要执行的任务并且锁定
    self._findAndLockNextJob(name, definitions[name], (err, job) => {
      if (err) {
        debug('[%s] job lock failed while filling queue', name)
        throw err
      }

      // 如果还有任务
      // 1. 添加到lock list
      // 2. 添加lock数量
      // 3. 将任务添加到队列中
      // 4. 重复执行当前函数
      if (job) {
        debug('[%s:%s] job locked while filling queue', name, job.attrs._id)
        self._lockedJobs.push(job)
        definitions[job.attrs.name].locked++
        enqueueJobs(job)
        jobQueueFilling(name)
        jobProcessing()
      }
    })
  }

  /**
   * 内部方法: 处理当前任务队列的第一个任务
   * 
   * @returns {undefined}
   */
  function jobProcessing() {
    // 确保任务队列中有任务
    if (jobQueue.length === 0) {
      return
    }

    const now = new Date()

    // 获取任务，确保没有被concurrency的配置限制住
    let next
    for (next = jobQueue.length - 1; next > 0; next -= 1) {
      const def = definitions[jobQueue[next].attrs.name]
      if (def.concurrency > def.running) {
        break
      }
    }

    // 获取队列中的一个任务
    const job = jobQueue.splice(next, 1)[0]
    const jobDefinition = definitions[job.attrs.name]

    debug('[%s:%s] about to process job', job.attrs.name, job.attrs._id)

    // 如果任务的nextRunAt字段在现在的时间以前，则立即实行，
    // 否则，计算出时间差并使用setTimeout来定时执行任务
    if (job.attrs.nextRunAt < now) {
      debug('[%s:%s] nextRunAt is in the past, run the job immediately', job.attrs.name, job.attrs._id)
      runOrRetry()
    } else {
      const runIn = job.attrs.nextRunAt - now
      debug('[%s:%s] nextRunAt is in the future, calling setTimeout(%d)', job.attrs.name, job.attrs._id, runIn)
      setTimeout(runOrRetry, runIn)
    }

    /**
     * 内部方法: 启动任务或重试任务
     * 
     * @returns {undefined}
     */
    function runOrRetry() {
      if (self._processInterval) {
        // 如果任务执行的数量小于设置的concurrency且全局变量_maxConcurrency还可以执行任务的话, 则执行任务
        if (jobDefinition.concurrency > jobDefinition.running && self._runningJobs.length < self._maxConcurrency) {
          // 计算任务运行的时间是否已经超过了lockLifetime的限制
          const lockDeadline = new Date(Date.now() - jobDefinition.lockLifetime)

          // 如果已经超过了限制，则解除对这个任务的监控, 减少全局的locked数量，但不会unlock这个任务，而是挂在后台继续执行
          if (job.attrs.lockedAt < lockDeadline) {
            debug('[%s:%s] job lock has expired, freeing it up', job.attrs.name, job.attrs._id)
            self._lockedJobs.splice(self._lockedJobs.indexOf(job), 1)
            jobDefinition.locked--
            jobProcessing()
            return
          }

          // 如果任务没有超过lockLifetime的限制, 则执行任务

          // 将任务推到_runningJobs队列中，标记其正在执行
          self._runningJobs.push(job)
          jobDefinition.running++

          // 执行任务
          debug('[%s:%s] processing job', job.attrs.name, job.attrs._id)
          job.run(processJobResult)

          // 继续执行该函数检查是否有需要处理的任务
          jobProcessing()
        } else {
          // 如果超出可运行任务的数量限制，则推入队列中等待运行（会根据任务的优先级进行排队）
          debug('[%s:%s] concurrency preventing immediate run, pushing job to top of queue', job.attrs.name, job.attrs._id)
          enqueueJobs(job, true)
        }
      }
    }
  }

  /**
   * 内部方法: 当任务执行完毕时会调用这个方法, 更改内存中记录任务的状态值
   * 
   * @param {Error} err       任务的错误
   * @param {module.Job} job  需要更改状态的任务
   * @returns {undefined}
   */
  function processJobResult(err, job) {
    if (err && !job) {
      throw (err)
    }
    const name = job.attrs.name

    // 任务的done()已经被执行了，但这个方法又被执行了，则报错
    if (self._runningJobs.indexOf(job) === -1) {
      debug('[%s] callback was called, job must have been marked as complete already', job.attrs._id)
      throw new Error('callback already called - job ' + name + ' already marked complete')
    }

    // 从运行中队列删除该任务, 并减少running状态值
    self._runningJobs.splice(self._runningJobs.indexOf(job), 1)
    if (definitions[name].running > 0) {
      definitions[name].running--
    }

    // 从locked队列删除该任务, 并减少loked状态值
    self._lockedJobs.splice(self._lockedJobs.indexOf(job), 1)
    if (definitions[name].locked > 0) {
      definitions[name].locked--
    }

    // 当任务完成时，重新扫描任务队列
    jobProcessing()
  }
}
