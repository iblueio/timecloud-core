'use strict'
module.exports = {
  none: core => {},
  daily: core => {
    core.define('once a day test job', (job, done) => {
      process.send('ran')
      done()
      process.exit(0)
    })

    core.every('one day', 'once a day test job')
  },
  'daily-array': core => {
    core.define('daily test 1', (job, done) => {
      process.send('test1-ran')
      done()
    })

    core.define('daily test 2', (job, done) => {
      process.send('test2-ran')
      done()
    })


    core.every('one day', [ 'daily test 1', 'daily test 2' ])
  },
  'define-future-job': core => {
    const future = new Date()
    future.setDate( future.getDate() + 1)

    core.define('job in the future', (job, done) => {
      process.send('ran')
      done()
      process.exit(0)
    })

    core.schedule(future, 'job in the future')
  },
  'define-past-due-job': core => {
    const past = new Date()
    past.setDate( past.getDate() - 1)

    core.define('job in the past', (job, done) => {
      process.send('ran')
      done()
      process.exit(0)
    })

    core.schedule(past, 'job in the past')
  },
  'schedule-array': core => {
    var past = new Date()
    past.setDate(past.getDate() - 1)

    core.define('scheduled test 1', (job, done) => {
      process.send('test1-ran')
      done()
    })

    core.define('scheduled test 2', (job, done) => {
      process.send('test2-ran')
      done()
    })

    core.schedule(past, ['scheduled test 1', 'scheduled test 2'])
  },
  now: function(core) {
    core.define('now run this job', (job, done) => {
      process.send('ran')
      done()
      process.exit(0)
    })

    core.now('now run this job')
  }
}
