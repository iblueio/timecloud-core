'use strict'
const expect = require('expect.js')
const MongoClient = require('mongodb').MongoClient
const Core = require('../index')
const Job = require('../lib/Job')

const mongoHost = process.env.MONGODB_HOST || 'localhost'
const mongoPort = process.env.MONGODB_PORT || '27017'
const mongoCfg = 'mongodb://' + mongoHost + ':' + mongoPort + '/timecloud-test'

// 创建Core实例
let jobs = null
let mongo = null

// 在测试前删除所有测试数据
const clearJobs = done => {
  mongo.collection('timecloudJobs').remove({}, done)
}

const jobTimeout = 500
const jobType = 'do work'
const jobProcessor = () => {}

describe('Core', () => {
  // 在每个单测之前新建Core实例并定义测试用的任务
  beforeEach(done => {
    jobs = new Core({
      db: {
        address: mongoCfg
      }
    }, () => {
      MongoClient.connect(mongoCfg, (err, db) => {
        if (err) {
          done(err)
        }
        mongo = db
        setTimeout(() => {
          clearJobs(() => {
            jobs.define('someJob', jobProcessor)
            jobs.define('send email', jobProcessor)
            jobs.define('some job', jobProcessor)
            jobs.define(jobType, jobProcessor)
            done()
          })
        }, 50)
      })
    })
  })

  // 在每个单测后释放MongoDB连接并停止所有任务
  afterEach(done => {
    setTimeout(() => {
      jobs.stop(() => {
        clearJobs(() => {
          mongo.close(() => {
            jobs._mdb.close(done)
          })
        })
      })
    }, 50)
  })

  it('sets a default processEvery', () => {
    expect(jobs._processEvery).to.be(5000)
  })

  describe('configuration methods', () => {
    it('sets the _db directly when passed as an option', () => {
      const core = new Core({mongo})
      expect(core._mdb.databaseName).to.equal('timecloud-test')
    })
  })

  describe('configuration methods', () => {
    describe('mongo', () => {
      it('sets the _db directly', () => {
        const core = new Core()
        core.mongo(mongo)
        expect(core._mdb.databaseName).to.equal('timecloud-test')
      })

      it('returns itself', () => {
        const core = new Core()
        expect(core.mongo(mongo)).to.be(core)
      })
    })

    describe('name', () => {
      it('sets the core name', () => {
        jobs.name('test queue')
        expect(jobs._name).to.be('test queue')
      })
      it('returns itself', () => {
        expect(jobs.name('test queue')).to.be(jobs)
      })
    })

    describe('processEvery', () => {
      it('sets the processEvery time', () => {
        jobs.processEvery('3 minutes')
        expect(jobs._processEvery).to.be(180000)
      })
      it('returns itself', () => {
        expect(jobs.processEvery('3 minutes')).to.be(jobs)
      })
    })
    describe('maxConcurrency', () => {
      it('sets the maxConcurrency', () => {
        jobs.maxConcurrency(10)
        expect(jobs._maxConcurrency).to.be(10)
      })
      it('returns itself', () => {
        expect(jobs.maxConcurrency(10)).to.be(jobs)
      })
    })
    describe('defaultConcurrency', () => {
      it('sets the defaultConcurrency', () => {
        jobs.defaultConcurrency(1)
        expect(jobs._defaultConcurrency).to.be(1)
      })
      it('returns itself', () => {
        expect(jobs.defaultConcurrency(5)).to.be(jobs)
      })
    })
    describe('lockLimit', () => {
      it('sets the lockLimit', () => {
        jobs.lockLimit(10)
        expect(jobs._lockLimit).to.be(10)
      })
      it('returns itself', () => {
        expect(jobs.lockLimit(10)).to.be(jobs)
      })
    })
    describe('defaultLockLimit', () => {
      it('sets the defaultLockLimit', () => {
        jobs.defaultLockLimit(1)
        expect(jobs._defaultLockLimit).to.be(1)
      })
      it('returns itself', () => {
        expect(jobs.defaultLockLimit(5)).to.be(jobs)
      })
    })
    describe('defaultLockLifetime', () => {
      it('returns itself', () => {
        expect(jobs.defaultLockLifetime(1000)).to.be(jobs)
      })
      it('sets the default lock lifetime', () => {
        jobs.defaultLockLifetime(9999)
        expect(jobs._defaultLockLifetime).to.be(9999)
      })
      it('is inherited by jobs', () => {
        jobs.defaultLockLifetime(7777)
        jobs.define('testDefaultLockLifetime', () => {})
        expect(jobs._definitions.testDefaultLockLifetime.lockLifetime).to.be(7777)
      })
    })
    describe('sort', () => {
      it('returns itself', () => {
        expect(jobs.sort({nextRunAt: 1, priority: -1})).to.be(jobs)
      })
      it('sets the default sort option', () => {
        jobs.sort({nextRunAt: -1})
        expect(jobs._sort).to.eql({nextRunAt: -1})
      })
    })
  })

  describe('job methods', () => {
    describe('create', () => {
      let job
      beforeEach(() => {
        job = jobs.create('sendEmail', {to: 'some guy'})
      })

      it('returns a job', () => {
        expect(job).to.be.a(Job)
      })
      it('sets the name', () => {
        expect(job.attrs.name).to.be('sendEmail')
      })
      it('sets the type', () => {
        expect(job.attrs.type).to.be('normal')
      })
      it('sets the core', () => {
        expect(job.core).to.be(jobs)
      })
      it('sets the data', () => {
        expect(job.attrs.data).to.have.property('to', 'some guy')
      })
    })

    describe('define', () => {
      it('stores the definition for the job', () => {
        expect(jobs._definitions.someJob).to.have.property('fn', jobProcessor)
      })

      it('sets the default concurrency for the job', () => {
        expect(jobs._definitions.someJob).to.have.property('concurrency', 5)
      })

      it('sets the default lockLimit for the job', () => {
        expect(jobs._definitions.someJob).to.have.property('lockLimit', 0)
      })

      it('sets the default priority for the job', () => {
        expect(jobs._definitions.someJob).to.have.property('priority', 0)
      })
      it('takes concurrency option for the job', () => {
        jobs.define('highPriority', {priority: 10}, jobProcessor)
        expect(jobs._definitions.highPriority).to.have.property('priority', 10)
      })
    })

    describe('every', () => {
      describe('with a job name specified', () => {
        it('returns a job', () => {
          expect(jobs.every('5 minutes', 'send email')).to.be.a(Job)
        })
        it('sets the repeatEvery', () => {
          expect(jobs.every('5 seconds', 'send email').attrs.repeatInterval).to.be('5 seconds')
        })
        it('sets the core', () => {
          expect(jobs.every('5 seconds', 'send email').core).to.be(jobs)
        })
        it('should update a job that was previously scheduled with `every`', done => {
          jobs.every(10, 'shouldBeSingleJob')
          setTimeout(() => {
            jobs.every(20, 'shouldBeSingleJob')
          }, 10)

          // Give the saves a little time to propagate
          setTimeout(() => {
            jobs.jobs({name: 'shouldBeSingleJob'}, (err, res) => { // eslint-disable-line max-nested-callbacks
              if (err) {
                throw err
              }
              expect(res).to.have.length(1)
              done()
            })
          }, jobTimeout)
        })
      })
      describe('with array of names specified', () => {
        it('returns array of jobs', () => {
          expect(jobs.every('5 minutes', ['send email', 'some job'])).to.be.an('array')
        })
      })
    })

    describe('schedule', () => {
      describe('with a job name specified', () => {
        it('returns a job', () => {
          expect(jobs.schedule('in 5 minutes', 'send email')).to.be.a(Job)
        })
        it('sets the schedule', () => {
          const fiveish = (new Date()).valueOf() + 250000
          expect(jobs.schedule('in 5 minutes', 'send email').attrs.nextRunAt.valueOf()).to.be.greaterThan(fiveish)
        })
      })
      describe('with array of names specified', () => {
        it('returns array of jobs', () => {
          expect(jobs.schedule('5 minutes', ['send email', 'some job'])).to.be.an('array')
        })
      })
    })

    describe('unique', () => {
      describe('should demonstrate unique contraint', () => {
        it('should modify one job when unique matches', done => {
          jobs.create('unique job', {
            type: 'active',
            userId: '123',
            other: true
          }).unique({
            'data.type': 'active',
            'data.userId': '123'
          }).schedule('now').save((err, job1) => {
            if (err) {
              done(err)
            }

            // Avoid timing condition where nextRunAt coincidentally is the same
            setTimeout(() => { // eslint-disable-line max-nested-callbacks
              jobs.create('unique job', {
                type: 'active',
                userId: '123',
                other: false
              }).unique({
                'data.type': 'active',
                'data.userId': '123'
              }).schedule('now').save((err, job2) => { // eslint-disable-line max-nested-callbacks
                if (err) {
                  done(err)
                }

                expect(job1.attrs.nextRunAt.toISOString()).not.to.equal(job2.attrs.nextRunAt.toISOString())

                mongo.collection('timecloudJobs').find({
                  name: 'unique job'
                }).toArray((err, j) => { // eslint-disable-line max-nested-callbacks
                  if (err) {
                    done(err)
                  }

                  expect(j).to.have.length(1)
                  done()
                })
              })
            }, 1)
          })
        })

        it('should not modify job when unique matches and insertOnly is set to true', done => {
          jobs.create('unique job', {
            type: 'active',
            userId: '123',
            other: true
          }).unique({
            'data.type': 'active',
            'data.userId': '123'
          }, {
            insertOnly: true
          }).schedule('now').save((err, job1) => {
            if (err) {
              done(err)
            }

            jobs.create('unique job', {
              type: 'active',
              userId: '123',
              other: false
            }).unique({
              'data.type': 'active',
              'data.userId': '123'
            }, {
              insertOnly: true
            }).schedule('now').save((err, job2) => { // eslint-disable-line max-nested-callbacks
              if (err) {
                done(err)
              }

              expect(job1.attrs.nextRunAt.toISOString()).to.equal(job2.attrs.nextRunAt.toISOString())

              mongo.collection('timecloudJobs').find({
                name: 'unique job'
              }).toArray((err, job) => { // eslint-disable-line max-nested-callbacks
                if (err) {
                  done(err)
                }
                expect(job).to.have.length(1)
                done()
              })
            })
          })
        })
      })

      describe('should demonstrate non-unique contraint', () => {
        it('should create two jobs when unique doesn\'t match', done => {
          const time = new Date(Date.now() + (1000 * 60 * 3))
          const time2 = new Date(Date.now() + (1000 * 60 * 4))

          jobs.create('unique job', {
            type: 'active',
            userId: '123',
            other: true
          }).unique({
            'data.type': 'active',
            'data.userId': '123',
            nextRunAt: time
          }).schedule(time).save(err => {
            if (err) {
              done(err)
            }
            jobs.create('unique job', {
              type: 'active',
              userId: '123',
              other: false
            }).unique({
              'data.type': 'active',
              'data.userId': '123',
              nextRunAt: time2
            }).schedule(time).save(err => { // eslint-disable-line max-nested-callbacks
              if (err) {
                done(err)
              }
              mongo.collection('timecloudJobs').find({
                name: 'unique job'
              }).toArray((err, job) => { // eslint-disable-line max-nested-callbacks
                if (err) {
                  done(err)
                }
                expect(job).to.have.length(2)
                done()
              })
            })
          })
        })
      })
    })

    describe('now', () => {
      it('returns a job', () => {
        expect(jobs.now('send email')).to.be.a(Job)
      })
      it('sets the schedule', () => {
        const now = new Date()
        expect(jobs.now('send email').attrs.nextRunAt.valueOf()).to.be.greaterThan(now.valueOf() - 1)
      })

      it('runs the job immediately', done => {
        jobs.define('immediateJob', job => {
          expect(job.isRunning()).to.be(true)
          jobs.stop(done)
        })
        jobs.now('immediateJob')
        jobs.start()
      })
    })

    describe('jobs', () => {
      it('returns jobs', done => {
        const job = jobs.create('test')
        job.save(() => {
          jobs.jobs({}, (err, c) => {
            if (err) {
              throw err
            }
            expect(c.length).to.not.be(0)
            expect(c[0]).to.be.a(Job)
            clearJobs(done)
          })
        })
      })
    })

    describe('purge', () => {
      it('removes all jobs without definitions', done => {
        const job = jobs.create('no definition')
        jobs.stop(() => {
          job.save(() => {
            jobs.jobs({
              name: 'no definition'
            }, (err, j) => { // eslint-disable-line max-nested-callbacks
              if (err) {
                return done(err)
              }
              expect(j).to.have.length(1)
              jobs.purge(err => { // eslint-disable-line max-nested-callbacks
                if (err) {
                  return done(err)
                }
                jobs.jobs({
                  name: 'no definition'
                }, (err, j) => { // eslint-disable-line max-nested-callbacks
                  if (err) {
                    return done(err)
                  }
                  expect(j).to.have.length(0)
                  done()
                })
              })
            })
          })
        })
      })
    })

    describe('saveJob', () => {
      it('persists job to the database', done => {
        const job = jobs.create('someJob', {})
        job.save((err, job) => {
          if (err) {
            done(err)
          }
          expect(job.attrs._id).to.be.ok()
          clearJobs(done)
        })
      })
    })
  })

  describe('cancel', () => {
    beforeEach(done => {
      let remaining = 3
      const checkDone = function(err) {
        if (err) {
          return done(err)
        }
        remaining--
        if (!remaining) {
          done()
        }
      }
      jobs.create('jobA').save(checkDone)
      jobs.create('jobA', 'someData').save(checkDone)
      jobs.create('jobB').save(checkDone)
    })

    afterEach(done => {
      jobs._collection.remove({name: {$in: ['jobA', 'jobB']}}, err => {
        if (err) {
          return done(err)
        }
        done()
      })
    })

    it('should cancel a job', done => {
      jobs.jobs({name: 'jobA'}, (err, j) => {
        if (err) {
          return done(err)
        }
        expect(j).to.have.length(2)
        jobs.cancel({name: 'jobA'}, err => {
          if (err) {
            return done(err)
          }
          jobs.jobs({name: 'jobA'}, (err, j) => {
            if (err) {
              return done(err)
            }
            expect(j).to.have.length(0)
            done()
          })
        })
      })
    })

    it('should cancel multiple jobs', done => {
      jobs.jobs({name: {$in: ['jobA', 'jobB']}}, (err, j) => {
        if (err) {
          return done(err)
        }
        expect(j).to.have.length(3)
        jobs.cancel({name: {$in: ['jobA', 'jobB']}}, err => {
          if (err) {
            return done(err)
          }
          jobs.jobs({name: {$in: ['jobA', 'jobB']}}, (err, j) => {
            if (err) {
              return done(err)
            }
            expect(j).to.have.length(0)
            done()
          })
        })
      })
    })

    it('should cancel jobs only if the data matches', done => {
      jobs.jobs({name: 'jobA', data: 'someData'}, (err, j) => {
        if (err) {
          return done(err)
        }
        expect(j).to.have.length(1)
        jobs.cancel({name: 'jobA', data: 'someData'}, err => {
          if (err) {
            return done(err)
          }
          jobs.jobs({name: 'jobA', data: 'someData'}, (err, j) => {
            if (err) {
              return done(err)
            }
            expect(j).to.have.length(0)
            jobs.jobs({name: 'jobA'}, (err, j) => {
              if (err) {
                return done(err)
              }
              expect(j).to.have.length(1)
              done()
            })
          })
        })
      })
    })
  })
})
