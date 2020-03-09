/*
 * Logs flight data (tlogs) to file
 */

const path = require('path');
var appRoot = require('app-root-path');
var fs = require('fs');
var moment = require('moment');
var microtime = require('microtime');
var jspack = require("jspack").jspack;
var winston = require('./winstonconfig')(module);
const process = require('process')

class flightLogger {
    constructor(settings) {
        this.topfolder = path.join(appRoot.toString(), 'flightlogs');
        this.tlogfolder = path.join(this.topfolder, 'tlogs');
        this.activeFileTlog = null;
        this.activeLogging = true;
        this.settings = settings;

        //get settings
        this.activeLogging = this.settings.value("flightLogger.activeLogging", true);

        //mkdir the log folders (both of them)
        fs.mkdirSync(this.tlogfolder, { recursive: true });
    }

    // Start a new tlog
    newtlog() {
        if (process.versions < 12) {
            console.log("Cannot do logging on nodejs version <12");
            winston.info("Cannot do logging on nodejs version <12");
            return;
        }
        var filename = moment().format("YYYYMMDD-HHmmss"); //new Date().toISOString();
        this.activeFileTlog = path.join(this.tlogfolder, filename + ".tlog");
        console.log("New Tlog: " + this.activeFileTlog);
        winston.info("New Tlog: " + this.activeFileTlog);
    }

    //stop logging (Tlog)
    stoptlog() {
        console.log("Closed Tlog: " + this.activeFileTlog);
        winston.info("Closed Tlog: " + this.activeFileTlog);
        this.activeFileTlog = null;
    }

    //Delete all tlogs
    cleartlogs() {
        const files = fs.readdirSync(this.tlogfolder);

        files.forEach((file) => {
            const filePath = path.join(this.tlogfolder, file);
            //don't remove the actively logging file
            if (!(this.activeFileTlog == filePath && this.activeLogging))
            {
                fs.unlinkSync(filePath);
            }
        });

        console.log("Deleted tlogs");
        winston.info("Deleted tlogs");
    }

    //write data to active log(s)
    //takes in a mavlink message
    //needs to be synchonous to ensure logfile isn't opened in parallel
    writetlog(msg) {
        if (!this.activeLogging) {
            return false;
        }
        if (!this.activeFileTlog) {
            this.newtlog();
        }
        try {
            //note this section does not work on nodejs < 12

            //Note we're using BigInt here, as a standard 32-bit Int
            //is too small to hold a microsecond timestamp
            const microSeconds = BigInt(microtime.now());
            var timebits = Buffer.alloc(8); //8 bytes = 64 bits = BigInt

            //use this instead of jspack.Pack('>Q', [microSeconds]);
            timebits.writeBigInt64BE(microSeconds);

            var toWrite = Buffer.concat([timebits, msg.msgbuf]);
            fs.appendFileSync(this.activeFileTlog, toWrite, "binary");
            return true;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    }


    //enable or disable logging by sending true or false
    setLogging(logstat) {
        this.activeLogging = logstat;

        //and save
        this.settings.setValue("flightLogger.activeLogging", this.activeLogging);

        console.log("Saved Logging settings: " + this.activeLogging);
        winston.info("Saved Logging settings: " + this.activeLogging);

        return this.activeLogging;
    }

    //get system status
    getStatus() {
        if (process.versions < 12) {
            return "Cannot do logging on nodejs version <12";
        }
        if (this.activeFileTlog && this.activeLogging) {
            return "Logging to " + path.basename(this.activeFileTlog);
        }
        else if (!this.activeFileTlog && this.activeLogging){
            return "Logging Enabled, no FC packets";
        }
        else {
            return "Not Logging";
        }
    }

    //find all files in dir
    findInDir(dir, fileList = []) {
        const files = fs.readdirSync(dir);

        files.forEach((file) => {
            const filePath = path.join(dir, file);
            const fileStat = fs.lstatSync(filePath);
            const filemTime = new Date(fileStat.mtimeMs);

            if (fileStat.isDirectory()) {
                this.findInDir(filePath, fileList);
            } else {
                var relpath = path.relative(this.topfolder, filePath);
                var mTime = moment(filemTime).format("LLL");
                fileList.push({key: relpath, name: path.basename(filePath), modified: mTime, size: Math.round(fileStat.size/1024)});
            }
        });

      return fileList;
    }

    //get list of logfiles for website
    //return format is (err, tlogs)
    getLogs(callback) {
        var newfilestlog = this.findInDir(this.tlogfolder);
        return callback(false, newfilestlog, this.activeLogging);
    };

}

module.exports = flightLogger

