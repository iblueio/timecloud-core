<p align="center">
  <img src="iblueio.png" alt="iBlue" width="100" height="100">
</p>
<h1 align="center">
  timecloud-core
</h1>
<p align="center">
  A distributed scheduling system based on Node.js
</p>

# Features

- 轻量级内核
- 集群部署, 防止单点故障
- MongoDB持久化存储
- 任务优先级排列
- 任务监控，进程控制


# Installation

通过NPM安装

    npm install timecloud-core


# timecloud-core简介

timecloud-core是一个定时任务管理模块的轻量级内核，它将node中的定时任务存储在数据库中，通过事件回调与监听实现定时任务调度。

## 使用步骤概述

总的来说分4步：

* 初始化(`new Core(..)`)
* 定义任务(`core.define(..)`)
* 配置任务(`core.every(..)`)
* 最后设置事件监听(`core.on(..)`

```js
const Core = require('timecloud-core')
const connection_options = {
  db: {
    address: 'mongodb://127.0.0.1:27017/timecloud',
    collection: 'timecloudJobs',
    options: { server: { auto_reconnect: true } },
  },
}
// 初始化内核
let core = new Core(connection_options)
core
  .name('TIMECLOUD TEST - ' + process.pid)
  .defaultConcurrency(5)
  .defaultLockLifetime(10000)
// 定义任务
core.define('updateCampaignTimeout', { priority: 'high', concurrency: 3 }, (job, done) => {
  dbp_job.updateCampaignTimeoutTick()
    .then(() => done())
    .catch((error) => { throw error })
})
// 配置任务(需要在ready事件中完成)
core.on('ready', () => {
  core.every('00 09 18 * * *', 'updateCampaignTimeout', {}, {timezone: 'Asia/Shanghai'})
  console.log('timecloud-core测试开始，启动完毕')
  core.start()
})
// 设置监听
core.on('start', (job) => {
  console.log('检测到job启动: ', job.attrs.name)
})

core.on('complete', (job) => {
  console.log('检测到job完成: ', job.attrs.name)
})

core.on('success', (job) => {
  console.log('检测到job成功: ', job.attrs.name)
})

core.on('fail', (job) => {
  console.log('检测到job失败: ', job.attrs.name)
  console.log('失败时间: ', job.attrs.failedAt)
  console.log('失败原因: ', job.attrs.failReason)
  core.stop()
})
// 最后，优雅的退出方案
function graceful() {
  core.stop(() => {
    console.log('检测到退出')
    process.exit(0);
  });
}

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);
```
---

## 步骤详述

### 初始化


初始化有两种方案：

* 通过完整的参数传递
* 链式初始化（推荐使用）

部分说明：

* `.database(url, [collectionName])`连接数据库，例如`core.database('mongodb://127.0.0.1:27017/core', 'timecloudJobs')`，其中`collectionName`可省略，默认值为`timecloudJobs`
* `.name(string)`jobs存储于数据库中会有`lastModifiedBy`字段，存储调度这个任务的timecloud-core名字
* `.processEvery(interval)`用于设置timecloud-core轮询数据库检测是否有新的任务加入的扫描时间
* `.defaultLockLimit(number)`设置默认值，timecloud-core调度任务时会锁定该任务，防止其他timecloud-core重复执行任务，当任务超出lockLifetime或调用done时会解锁任务，define新任务时如果设置`.lockLimit(number)`则会覆盖默认值。该值用于设置锁定任务的数量，默认为0，即无限制
* `.defaultLockLifetime(number)`上面说了，当任务被调度时会被锁定，当任务调用完毕执行`done()`后会解锁，或者执行的时间很长，超出了lockLifetime也会解锁，同样，define其他任务时如果设置了lockLifetime参数，会覆盖掉默认值

---

### 定义任务
`core.define(jobName, [options], fn)`

```js
core.define('updateCampaignTimeout', { priority: 'high', concurrency: 3 }, (job, done) => {
  dbp_job.updateCampaignTimeoutTick()
    .then(() => done())
    .catch((error) => { throw error })
})
```


####参数说明：
 
`jobName`
类型`String`，用于存储于数据库中的`name`字段，同时配置任务和设置监听会使用到该参数

`options`
可配置`concurrency`、`lockLimit`、`lockLifetime`、`priority`，前文都已说过，
`priority`为任务优先级：`lowest|low|normal|high|highest|number`，前五个是字符串，传入后会被转为数字，依次对应:`-20|-10|0|10|20`

`fn(job, done)`：
*  配置任务时，会设置每次执行任务需要传入的参数，该参数都被放在了`job.attrs.data`中，
* 任务出错，会调用`job.fail(reason)`方法，其中的`reason`可以是字符串或`Error`，当调用此方法时，会设置`job.attrs.failedAt`为当前时间(ISO)，`job.attrs.failReason`为`reason`或`Error.message`
* 对于异步任务，必须调用`done`方法告知任务结束
* 对于同步任务，省略为`fn(job)`即可

 ---

### 配置任务
`core.every(interval, name, [data], [options], [cb])`
```js
core.every('00 09 18 * * *', 'updateCampaignTimeout', {}, {timezone: 'Asia/Shanghai'})
core.every('30 seconds', 'updateCampaignOverBudget')
core.every('1 minutes', 'synchronizeBudget')
```
#### 参数说明

`interval`
可以是字符串，或cron时间，cron时间格式为
```
* * * * * *
| | | | | | 
| | | | | +-- Day of the Week   (range: 0-6, 0 standing for Monday)
| | | | +---- Month             (range: 0-11)
| | | +------ Day of the Month  (range: 1-31)
| | +-------- Hour              (range: 0-23)
| +---------- Minute            (range: 0-59)
+------------ Second            (range: 0-59)
```
设置每隔几分钟的任务用`'5 minutes'`就好了，但是如果设置每天的什么时候运行，就要使用cron设置，且要注意时区（在options中设置）！！

`name`
就是任务的名字，一定要对应，可以是字符串数组，这样的话多个任务就使用同一个配置

`data`
是一个`Object`，在`define`任务时通过`job.attrs.data`获取该对象

`options`
注意，要设置`options`必须先设置`data`，所以data可以传空`Object{}`，在`options`中可以设置的有`timezone`，必须是可识别的时区字符串，默认为`'America/New_York`，而在我们的时区，必须要设置对时区，才能正常运行定时任务！我们的时区字符串是`Asia/Shanghai`

[完整时区查询戳我（维基百科）](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

`cb`
当`job`成功被加入数据库时会调用回调函数

---

### 设置监听

```js
core.on('ready', () => {
  // core.every('5 seconds', 'say hello')
  core.every('00 09 18 * * *', 'updateCampaignTimeout', {}, {timezone: 'Asia/Shanghai'})
  core.every('30 seconds', 'updateCampaignOverBudget')
  core.every('1 minutes', 'synchronizeBudget')
  core.purge((err, numRemoved) => {
    console.log('旧任务被移除: ', numRemoved)
  })
  console.log('timecloud-core测试开始，启动完毕')
  core.start()
})

core.on('fail', (job) => {
  console.log('检测到job失败: ', job.attrs.name)
  console.log('失败时间: ', job.attrs.failedAt)
  console.log('失败原因: ', job.attrs.failReason)
  core.stop()
})
```
可以监听的事件有：

* `'ready', function()`
* `'start', function(job)`
* `'start:job name', function(job)`
* `'complete', function(job)`
* `'complete:job name', function(job)`
* `'success', function(job)`
* `'success:job name', function(job)`
* `'fail', function(err, job)`
* `'fail: job name', function(err, job)`

其中比较重要的事件就是`ready`了，当timecloud-core初始化完毕成功连接数据库后，会发出`ready`事件，此时就要通过监听该事件，在`ready`时间中对`define`过的任务配置时间等参数，最后调用`core.start()`启动`core`

我们发现，在`ready`事件中，我们还调用了`core.purge(cb)`，这个函数是清理数据库中的旧任务（即这此运行程序没有被define到的job）


---


## 注意事项

- timecloud-core在mongoDB中的存储方式：
```
{
	"_id" : ObjectId("5981983d9b85994179fc98c9"),
	"name" : "updateCampaignTimeout",
	"type" : "single",
	"data" : {
		
	},
	"priority" : 10,
	"repeatInterval" : "00 09 18 * * *",
	"repeatTimezone" : "Asia/Shanghai",
	"lastModifiedBy" : "TIMECLOUD TEST - 97807",
	"nextRunAt" : ISODate("2017-08-03T10:09:00.011Z"),
	"lockedAt" : null,
	"lastRunAt" : ISODate("2017-08-02T10:09:00.011Z"),
	"lastFinishedAt" : ISODate("2017-08-02T10:09:00.076Z"),
	"failReason" : "failed to calculate nextRunAt due to invalid repeat interval",
	"failCount" : 1,
	"failedAt" : ISODate("2017-08-02T09:44:54.551Z")
}
```
- 重复启动timecloud-core时，会**更新**对应的项，而不是覆盖，只要任务名相同，就不会在数据库中创建新的数据项，也不会删除旧的job（该次执行程序没有define到的job），除非在ready事件中调用`core.purge`

- 在配置任务(`core.every`)时一定要注意时区的设置

- `core.every`配置失败时(传入的interval不对等原因)，会返回`undefined`，正常情况下返回`job`对象

- 关于job对象：
```js
Job {
  core:
   EventEmitter {
     _name: 'TIMECLOUD TEST - 97807',
     _processEvery: 5000,
     _defaultConcurrency: 5,
     _maxConcurrency: 20,
     _defaultLockLimit: 0,
     _lockLimit: 0,
     _definitions:
      { updateCampaignTimeout: [Object],
        updateCampaignOverBudget: [Object],
        synchronizeBudget: [Object] },
     _runningJobs: [],
     _lockedJobs: [],
     _jobQueue: [],
     _defaultLockLifetime: 10000,
     _isLockingOnTheFly: false,
     _jobsToLock: [],
     _events:
      { ready: [Function],
        start: [Function],
        complete: [Function],
        success: [Function],
        fail: [Function] },
     _eventsCount: 5,
     _mdb:
      Db {
        domain: null,
        _events: {},
        _eventsCount: 0,
        _maxListeners: undefined,
        s: [Object],
        serverConfig: [Getter],
        bufferMaxEntries: [Getter],
        databaseName: [Getter] },
     _collection: Collection { s: [Object] } },
  attrs:
   { name: 'updateCampaignTimeout',
     data: {},
     type: 'single',
     priority: 10,
     nextRunAt: moment.parseZone("2017-08-02T18:09:00.009+08:00"),
     repeatInterval: '00 09 18 * * *',
     repeatTimezone: 'Asia/Shanghai' } }
```



# Example Usage

```js

let mongoConnectionString = 'mongodb://127.0.0.1/timecloud';

let core = new Core({db: {address: mongoConnectionString}});

// 手动指定MongoDB Collection名称:
// let core = new Core({db: {address: mongoConnectionString, collection: 'jobCollectionName'}});

// 手动设定MongoDB Collection选项:
// let core = new Core({db: {address: mongoConnectionString, collection: 'jobCollectionName', options: {ssl: true}}});

// 手动传入初始化好的MongoClient
// let core = new Core({mongo: myMongoClient});

core.define('delete old users', function(job, done) {
  User.remove({lastLogIn: { $lt: twoDaysAgo }}, done);
});

core.on('ready', function() {
  // 使用字符串
  core.every('3 minutes', 'delete old users');

  // 使用CronTab
  core.every('*/3 * * * *', 'delete old users');

  // 启动内核
  core.start();
});

```

```js
core.define('send email report', {priority: 'high', concurrency: 10}, function(job, done) {
  let data = job.attrs.data;
  emailClient.send({
    to: data.to,
    from: 'example@example.com',
    subject: 'Email Report',
    body: '...'
  }, done);
});

core.on('ready', function() {
  core.schedule('in 20 minutes', 'send email report', {to: 'admin@example.com'});
  core.start();
});
```

```js
core.on('ready', function() {
  let weeklyReport = core.create('send email report', {to: 'another-guy@example.com'})
  weeklyReport.repeatEvery('1 week').save();
  core.start();
});
```



# License
[The MIT License](LICENSE)
