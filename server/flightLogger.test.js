var assert = require('assert')
const Path = require('path')
var fs = require('fs')
var appRoot = require('app-root-path')
const settings = require('settings-store')
const Logger = require('./flightLogger')

describe('Logging Functions', function () {
  beforeEach('Ensure cleared log folder', function () {
    deleteFolderRecursive(Path.join(appRoot.toString(), 'flightlogs', 'tlogs'))
  })

  // Recursively delete folder and files
  const deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach((file, index) => {
        const curPath = Path.join(path, file)
        if (fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath)
        } else { // delete file
          fs.unlinkSync(curPath)
        }
      })
      fs.rmdirSync(path)
    }
  }

  it('#loggerinit()', function () {
    var Lgr = new Logger(settings)

    // assert folders were created
    assert.ok(fs.existsSync(Lgr.topfolder))
    assert.ok(fs.existsSync(Lgr.tlogfolder))

    // check initail status
    if (process.versions < 12) {
        assert.equal(Lgr.getStatus(), 'Cannot do logging on nodejs version <12')
    }
    else {
        assert.equal(Lgr.getStatus(), 'Logging Enabled, no FC packets')
    }
  })

  it('#newlogfile()', function () {
    var Lgr = new Logger(settings)
    Lgr.newtlog()

    if (process.versions < 12) {
        // log a byte
        assert.equal(Lgr.writetlog({ msgbuf: Buffer.from('tést') }), true)
        assert.ok(fs.existsSync(Lgr.activeFileTlog))
    }
  })

  it('#clearlogfiles()', function () {
    var Lgr = new Logger(settings)
    Lgr.newtlog()

    if (process.versions > 12) {
        // log a byte
        assert.equal(Lgr.writetlog({ msgbuf: Buffer.from('tést') }), true)
    }

    Lgr.stoptlog()

    Lgr.cleartlogs()

    // assert all files deleted
    assert.equal(Lgr.activeFileTlog, null)
    assert.equal(fs.readdirSync(Path.join(appRoot.toString(), 'flightlogs', 'tlogs')).length, 0)
  })

  it('#getlogs()', function (done) {
    var Lgr = new Logger(settings)
    Lgr.newtlog()

    if (process.versions < 12) {
        assert.equal(Lgr.getStatus(), 'Cannot do logging on nodejs version <12')
        Lgr.getLogs(function (err, tlogs, activeLogging) {
          assert.equal(tlogs.length, 0)
          assert.equal(activeLogging, false)
          done()
        })
    }
    else {
        // log a byte
        assert.equal(Lgr.writetlog({ msgbuf: Buffer.from('tést') }), true)

        Lgr.getLogs(function (err, tlogs, activeLogging) {
          assert.equal(tlogs.length, 1)
          assert.equal(activeLogging, true)
          done()
        })
    }
  })

  it('#getstatus()', function () {
    var Lgr = new Logger(settings)

    if (process.versions < 12) {
        assert.equal(Lgr.getStatus(), 'Cannot do logging on nodejs version <12')
    }
    else {
        assert.equal(Lgr.getStatus(), 'Logging Enabled, no FC packets')
    }

    // the settings-store module will throw an error because we've
    // not init'd a settings file
    try {
      Lgr.setLogging(false)
    } catch (e) {
    }

    if (process.versions < 12) {
        assert.equal(Lgr.getStatus(), 'Cannot do logging on nodejs version <12')
    }
    else {
        assert.equal(Lgr.getStatus(), 'Not Logging')
    }
  })
})
