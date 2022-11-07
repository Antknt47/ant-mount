const chokidar = require('chokidar');
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
var log4js = require("log4js");
var logger = log4js.getLogger();
logger.level = "info";

mountList = {
  "cdb0ec08-5039-40ad-8f6c-551e48f1a629": "/home/pi/wd-red"
}

// bug
async function MakeDevice(path) {
    try {
      dev = {};
      const {stdout, stderr} = await exec(`sudo blkid ${path}`);
      resultArr = stdout.replaceAll('\n', '').split(' ');
      let index = 0;
      for (const line of resultArr) {
        if (index == 0) {
          dev.path = line.split(':')[0];
        } else {
          words = line.split('=');
          dev[words[0]] = words[1].replaceAll('"', '');
        }
        ++index;
      }
      return dev;
    } catch (error) {
      return {};
    }
}

async function GetUUID(path) {
  try {
    const {stdout, stderr} = await exec(`sudo blkid ${path}`);
    resultArr = stdout.replaceAll('\n', '').split(' ');
    let index = 0;
    for (const line of resultArr) {
      if (index != 0 ) {
        words = line.split('=');
        if(words[0] == "UUID") {
          return words[1].replaceAll('"', '');
        }
      }
      ++index;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function FindMount(path) {
  try {
    const {stdout, stderr} = await exec(`findmnt -D -o TARGET ${path}`);
    return stdout.split('\n')[1];
  } catch (error) {
    return null
  }
}

async function Init() {
  try {
    const {stdout, stderr} = await exec(`ls /dev/sd*`);
    devList = stdout.split('\n');
    for(const path of devList) {
      Mount(path);
    }
  } catch (error) {
  }
}

async function Mount(path){
  const uuid = await GetUUID(path);
  const mount = await FindMount(path)
  logger.debug(mount)
  // Mount, if not yet mounted and in mountList.
  if(!mount && mountList[uuid]) {
    logger.info(`Mount [${path}] to [${mountList[uuid]}], UUID=${uuid}`);
    try {
      const cmd = `sudo mount ${path} ${mountList[uuid]}`
      logger.info(`cmd exec: ${cmd}`);
      const {stdout, stderr} = await exec(cmd);
    } catch (error) {
      logger.info(error);
    }
  }
}

async function Unmount(path){
  const mount = await FindMount(path)
  logger.debug(mount)
  // Unmount, if mounted.
  if(mount) {
    logger.info(`Unmount [${path}]`);
    try {
      const cmd = `sudo umount ${path}`
      logger.info(`cmd exec: ${cmd}`);
      const {stdout, stderr} = await exec(cmd);
    } catch (error) {
      logger.info(error);
    }
  }
}

logger.info("Auto-mount start.");

chokidar.watch('/dev/sd*')
.on('all', async (event, path) => {
  uuid = await GetUUID(path);
  logger.info(`${event} ${path} ${uuid}`);
})
.on('add', async (path) => {
  Mount(path);
})
.on('unlink', async (path) => {
  Unmount(path);
})

setTimeout(async () => {
  Init();
}, 3000)