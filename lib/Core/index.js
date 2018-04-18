'use strict'
/**
 * Timecloud-core
 * 
 * 提供 Timecloud 的所有基础功能内核
 * 包括所有与数据库操作相关的函数
 */

const EventEmitter = require('events').EventEmitter
const humanInterval = require('human-interval')

class Core extends EventEmitter {
  constructor(config, cb) {
    super()

    if (!(this instanceof Core)) {
      return new Core(config)
    }

    config = config || {}

    this._name = config.name
    this._processEvery = humanInterval(config.processEvery) || humanInterval('5 seconds')
    this._defaultConcurrency = config.defaultConcurrency || 5
    this._maxConcurrency = config.maxConcurrency || 20
    this._defaultLockLimit = config.defaultLockLimit || 0
    this._lockLimit = config.lockLimit || 0
    this._definitions = {}
    this._runningJobs = []
    this._lockedJobs = []
    this._jobQueue = []
    this._defaultLockLifetime = config.defaultLockLifetime || 10 * 60 * 1000 // 10 minute default lockLifetime
    this._sort = config.sort || { nextRunAt: 1, priority: -1 }
    this._indices = Object.assign({ name: 1 }, this._sort, { priority: -1, lockedAt: 1, nextRunAt: 1, disabled: 1 })

    this._isLockingOnTheFly = false
    this._jobsToLock = []
    if (config.mongo) {
      this.mongo(config.mongo, config.db ? config.db.collection : undefined, cb)
    } else if (config.db) {
      this.database(config.db.address, config.db.collection, config.db.options, cb)
    }
  }
}

Core.prototype.mongo = require('./mongo')
Core.prototype.database = require('./database')
Core.prototype.db_init = require('./dbInit') // eslint-disable-line camelcase
Core.prototype.name = require('./name')
Core.prototype.processEvery = require('./processEvery')
Core.prototype.maxConcurrency = require('./maxConcurrency')
Core.prototype.defaultConcurrency = require('./defaultConcurrency')
Core.prototype.lockLimit = require('./locklimit')
Core.prototype.defaultLockLimit = require('./defaultLockLimit')
Core.prototype.defaultLockLifetime = require('./defaultLockLifetime')
Core.prototype.sort = require('./sort')
Core.prototype.create = require('./create')
Core.prototype.jobs = require('./jobs')
Core.prototype.purge = require('./purge')
Core.prototype.define = require('./define')
Core.prototype.every = require('./every')
Core.prototype.schedule = require('./schedule')
Core.prototype.now = require('./now')
Core.prototype.cancel = require('./cancel')
Core.prototype.saveJob = require('./saveJob')
Core.prototype.start = require('./start')
Core.prototype.stop = require('./stop')
Core.prototype._findAndLockNextJob = require('./_findAndLockNextJob')

module.exports = Core
