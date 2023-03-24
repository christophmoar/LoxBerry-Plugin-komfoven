'use strict';
const path = require('path');
const inireader = require('read-ini-file')

const get = async (loxberry) => {
  const PRODUCTION = process.env.NODE_ENV === 'production';
  const plugindata = await loxberry.system.pluginData();
  const pluginpath = await loxberry.system.expressPath();
  const miniserver = await loxberry.system.getMiniserver();
  
  if (PRODUCTION) {
    const configfile = path.join(plugindata.directories.lbpconfigdir, 'plugin.cfg');
    const config = inireader.readIniFileSync(configfile);
    const miniserverip = miniserver[0]['Ipaddress']; 
    return {
      plugindata: plugindata,
      pluginpath: pluginpath,
      miniserverip: miniserverip,
      configfile: configfile,
      config: config
    };
  }
  else {
    const configfile = path.join(process.env.LBPCONFIG, plugindata.name, 'plugin.cfg');
    const config = inireader.readIniFileSync(configfile);
    
    const systemconfigfile = path.join(process.env.LBSCONFIG, 'general.cfg');
    const systemconfig = inireader.readIniFileSync(systemconfigfile);
    const miniserverip = systemconfig.MINISERVER1.IPADDRESS; 
    return {
      plugindata: plugindata,
      pluginpath: pluginpath,
      miniserverip: miniserverip,
      configfile: configfile,
      config: config
    };
  }
};

module.exports = {
  get
};