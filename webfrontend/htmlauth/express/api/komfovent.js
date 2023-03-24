'use strict';
const Influx = require('influxdb-nodejs');
const axios = require ('axios');
const cheerio = require ('cheerio');
const udp = require('dgram');

/*
The following code is based on 
https://github.com/ksvan/node-red-contrib-komfovent/blob/master/komfnodes/komfovent.js

on the project
https://github.com/ksvan/node-red-contrib-komfovent/tree/master/komfnodes

for node-red-contrib-komfovent
https://flows.nodered.org/node/node-red-contrib-komfovent

It has been adapted/changed to cover the specific use-case for this loxberry plugin.

Changes have been made 
- in the extraction of data from the webpage for the komvent fields with 1/0 values in the html attributes of the element
- in the way of connecting, logging in, and scraping the page to support more efficient scraping of multiple fields in the same without re-connecting and re-reading the entire page 
- in various helper methods specific for the loxberry plugin

Thanks ksvan for the greate work.
https://flows.nodered.org/user/ksvan
https://github.com/ksvan

*/

/*
Komfovent library for integration with Komfovent units using C6 controller
Based on reverse engineering of web interface ajax calls, not modbus/bacnet even though supported by the unit.
Look at reverse.md for considerations on that design and further details on how stuff works.
All method stateless, no shared global variables in the class

Public functions returns standard json objects with result and error fields as strings, originally made to simplify usage in nodered flows.
Private functions does not, they throw. All functions are async
*/

  /* private makeRequest()
  * * generic methog to make the http calls using axios
  * TODO make private function, throw instead of return objects for the flow
  * @param postConfig The config object, axios standard, to make the request.
  */
  const makeRequest = async (postConfig) => {
    // Make a request for logon
    const request = axios;
    try {
      const result = await request(postConfig);
      return result;
    }
    catch (error) {
      if (error.response) {
        // server responded something other than http 2xx
        throw new Error('No 200 OK received. Status was: ' + error.response.status);
      }
      else if (error.request) {
        // server did not respond
        throw new Error('Unit did not respond: ' + error.request);
      }
      else {
        throw new Error('Unknown error with http request: ' + error);
      }
    } // catch error end
  }

  /* public logon()
  * * function to logon initally
  * TODO: improving detection of logged in state and errors by screenscraping
  * @param username Komfovent username to logon
  * @param password Password for the same user
  * @param ip for the komfovent unit in question
  */
  const logon = async (username, password, ip) => {
    // validate input
    if (typeof username !== 'string' || !username || typeof password !== 'string' || !password) {
      return ({ error: true, result: 'Empty username/password received, quitting' });
    }
    if (typeof ip !== 'string' || !ip) {
      return ({ error: true, result: 'Empty IP received, quitting' });
    }
    const postConfig = {
      url: 'http://' + ip,
      method: 'POST',
      data: '1=' + username + '&' + '2=' + password
    };
    let result;
    try {
      result = await makeRequest(postConfig);
    }
    catch (error) {
      return { error: true, result: error.toString() };
    }
    // check that we are actually logged on
    if (result === 'undefined' || result === '') {
      return { error: true, result: 'http request failed', unit: ip };
    }
    else if (result.data.indexOf('Incorrect password!') >= 0 || result.status > 200) {
      return { error: true, result: 'Wrong password for unit', unit: ip };
    }
    else if (result.data.indexOf('value="Logout') >= 0 && result.status === 200) {
      // then assume we are logged on correctly
      return { error: false, result: 'logged on', unit: ip };
    }
    else {
      // seems like something unknown failed, the beauty of screenscraping
      return { error: true, result: 'Something totally unknown happened with logon', unit: ip };
    }
  }// logon end

  /* public etMode()
  * * function to set a mode on the logged on unit. Will not work, but not fail, if not logged on first
  * TODO: future validation that the actual mode was set ok. Better error flow. check what device returns for bad modes
  * @param mode Input object mode{name: 'auto', code: '285=2'}, where code is the values Komfovent expects
  * @param ip address of the komfovent unit to set mode on
  */
  const setMode = async (mode, ip) => {
    // validate input
    if (typeof mode.code !== 'string' || !mode) {
      return ({ error: true, result: 'Empty mode received, quitting', unit: ip });
    }
    if (typeof ip !== 'string' || !ip) {
      return ({ error: true, result: 'Empty IP received, quitting' });
    }
    // defining message needed by c6 to switch modes
    const postConfig = {
      url: 'http://' + ip + '/ajax.xml',
      method: 'POST',
      data: mode.code
    };
    // make request for mode change
    const result = await makeRequest(postConfig);
    if (result.status === 200 && result.data.indexOf('c6') > 0) {
      // then assuming it was ok, right http and the weird standard body response from C6 controller
      return { error: false, result: mode.name };
    }
    else {
      return { error: true, result: 'Could not set mode. Non existing? ' + mode.name , unit: ip};
    }
  } // setmode end

  /* private getMode()
  * * Function to fetch currently active mode
  * TODO fix attrib scan from scraper and find text value of active mode
  * @param ip ip of the unit to fetch mode status from
  */
  const getMode = async (ip) => {
    // no validate input, private
    try {
      const scraped = await getData('data', ip);
      const msgResult = scraped('div[data-selected="1"]').innerText();// ('div.control-1'); // .attr('data-selected');
      console.dir(msgResult);
      if (typeof msgResult === 'undefined' || !msgResult) {
        return { error: true, result: 'Active mode not found', unit: ip };
      }
      else {
        // seems like we got the data without errors
        return { error: false, result: msgResult, unit: ip };
      }
    }
    catch (error) {
      return { error: true, result: 'Could not fetch data for mode: ' + error, unit: ip };
    }
  } // getMode end

  /* private getData()
  * * private function to fetch data from the different komfovent views
  * TODO
  * @param name Name of the datafield to fetch. IDs defined in C6 web setup, documented in README and reverse.md
  * @param ip IP address of the unit to fetch from
  * @return cherio object for query of scraped content
  */
  const getData = async (name, ip) => {
    // no validate input, private only
    // change target to subpage if identity/name
    const page = name.indexOf('_') > 0 ? 'det.html' : '';
    // setup for get request
    const getConfig = {
      url: 'http://' + ip + '/' + page,
      method: 'GET'
    };
    // get the page and scrape it
    const result = await makeRequest(getConfig);
    // validate results before parsing
    if (result !== 'undefined' && result && !result.error && result.data) {
      // load scraper and scrape received content
      const scraper = cheerio;
      const scraped = scraper.load(result.data);
      return scraped;
    }
    else {
      throw new Error('Could not fetch page: ' + result.result);
    }
  } // getData end

  /* public getId()
  * * public function to fetch the different data id values from the web pages
  * TODO
  * @param Name of the datafield to fetch. IDs defined in C6 web setup, documented in README and reverse.md
  */
  const getId = async (name, ip) => {
    // validate input
    if (typeof name !== 'string' || !name) {
      return ({ error: true, result: 'Empty ID received, quitting', unit: ip });
    }
    if (typeof ip !== 'string' || !ip) {
      return ({ error: true, result: 'Empty IP received, quitting', unit: ip });
    }
    try {
      const scraped = await getData(name, ip);
      
      // christoph.moar/20230306 use the data-selected if we are talking about a boolean flag
      var scrap = scraped('#' + name);
      var attr = scrap.attr('data-selected');
      var msgResult = scrap.text().trim();
      if(attr)
        msgResult = attr;
        
      if (typeof msgResult === 'undefined' || !msgResult) {
        return { error: true, result: 'ID not found', unit: ip };
      }
      else {
      // seems like we got the data without errors
        return { error: false, result: msgResult, unit: ip };
      }
    }
    catch (error) {
      return { error: true, result: 'Could not fetch data: ' + error, unit: ip };
    }
  } // getId end
  
  /* public getIds()
  * * public function to fetch the different data ids values from the web pages
  * TODO
  * @param Name of the datafield to fetch. IDs defined in C6 web setup, documented in README and reverse.md
  */
  const getIds = async (names, ip) => {
    // our result map
    var resultMap = new Map();
    
    // the first array element shall be the one to take further decisions with
    var firstName = names[0];
    // validate input
    if (typeof firstName !== 'string' || !firstName) {
      return ({ error: true, result: 'Empty ID received, quitting', unit: ip });
    }
    if (typeof ip !== 'string' || !ip) {
      return ({ error: true, result: 'Empty IP received, quitting', unit: ip });
    }
    try {
      // get the page relevant for this name
      const scraped = await getData(firstName, ip);
      
      // now loop over every array element and fetch the data
      var size = names.length;
      for (var i = 0; i < size; i++)
      {
        var name = names[i];
        // get the text node and the data-selected flag, to be used if we are talking about a boolean flag
        var scrap = scraped('#' + name);
        var attr = scrap.attr('data-selected');
        var msgResult = null;
        if(attr) 
          msgResult = attr;  
        else 
          msgResult = scrap.text().trim();
        // check if we have a result
        if (typeof msgResult === 'undefined' || !msgResult) {
          resultMap.set(name, null);
        }
        else {
          const first = msgResult.split(' ')[0];
          if(isNaN(Number(first)))
            resultMap.set(name, first);
          else
            resultMap.set(name, parseFloat(first));
          
        }
      }
          
      // return the result
      return { error: false, result: resultMap, unit: ip };
    }
    catch (error) {
      return { error: true, result: 'Could not fetch data: ' + error, unit: ip };
    }
  } // getId end

  const fetch = async (ids, username, password, ip) => {
    let value = null;
    try {
      let logonResult = await logon(username, password, ip);
      if (!logonResult.error)
        value = await getIds(ids, ip);
      else 
        value = logonResult;
    }
    catch (error) {
      value = error;
    }
    return value;
  }
  
  const processBatch = async (ids, ids2, cfg, logger) => {
    let merged = null;
    let ip=cfg.config.KOMFOVENT.SERVER;
    let username=cfg.config.KOMFOVENT.USERNAME;
    let password=cfg.config.KOMFOVENT.PASSWORD;
    
    if(!ip || !username || !password) {
      logger.error('Skipping komfovent connection, missing config data');
      return;
    }
    
    try {
      logger.info('Connecting to komfovent to fetch data');
      let logonResult = await logon(username, password, ip);
      if (!logonResult.error) {
        let value = await getIds(ids, ip);
        if(!value.error) {
          let value2 = await getIds(ids2, ip);
          if(!value2.error) {
            // now prepare the json
            merged = prepareJson(value.result, value2.result);
            // push to influxdb
            pushToInflux(merged, cfg, logger);
            // push to miniserver
            pushToMiniserver(merged, cfg, logger);
          }
          else
            merged = value2;
        }
        else
          merged = value;
      }
      else 
        merged = logonResult;
    }
    catch (error) {
      merged = error;
    }
    return merged;
  }
  
  const pushToMiniserver = (values, cfg, logger) => {
    const ip = cfg.miniserverip;
    const port = cfg.config.MINISERVER.PORT;
    
    // prepare json for push to miniserver
    const jsonObject = Object.fromEntries(values);
    const jsonString = JSON.stringify(jsonObject, null, null);
    var jsonOutput = jsonString.replaceAll(",", " , ");
    jsonOutput = jsonOutput.replaceAll(":", ": ");
    
    logger.debug('Writing to miniserver '+ip+':'+port);
    logger.debug(jsonOutput);
    
    // setup dgram
    var client = udp.createSocket('udp4');
    client.send(jsonOutput,port,ip,function(error){
      if(error){
        logger.error('Write data to miniserver error')
        logger.error(error);
      }else{
        logger.info('Write data to miniserver success')
      }
      client.close();
    });    
    
  }
      
  const pushToInflux = (values, cfg, logger) => {
    const database = cfg.config.INFLUXDB.DATABASE;
    const measurement = cfg.config.INFLUXDB.MEASUREMENT;
    const server = cfg.config.INFLUXDB.SERVER;
    const port = cfg.config.INFLUXDB.PORT;
    const username = cfg.config.INFLUXDB.USERNAME;
    const password = cfg.config.INFLUXDB.PASSWORD;
    
    if(!database || !measurement || !server || !port) {
      logger.info('Skipping write point to influx');
      return;
    }
    
    const connection = 'http://'+username+':'+password+'@'+server+':'+port+'/'+database;
    const client = new Influx(connection);
    
    // influxdb field and tagschema
    const influxFieldSchema = {
      air_damper_perc      :'f',
      airflow_extract_perc :'f',
      airflow_supply_perc  :'f',
      consume_energy_day   :'f',
      consume_energy_month :'f',
      consume_energy_total :'f',
      energy_saving_level  :'f',
      fan_mode             :'s',
      fan_mode_id          :'i',
      filter_clogging_perc :'f',
      heat_efficiency      :'f',
      heat_energy_day      :'f',
      heat_energy_month    :'f',
      heat_energy_total    :'f',
      heat_power           :'f',
      heat_recovery        :'f',
      power_current        :'f',
      recover_energy_day   :'f',
      recover_energy_month :'f',
      recover_energy_total :'f',
      temp_extract         :'f',
      temp_outdoor         :'f',
      temp_supply          :'f',
    };  
    const influxTagSchema = {};  
  
    client.schema('http', influxFieldSchema, influxTagSchema, {
      // default is false
      stripUnknown: true,
    });
    
    // create a map for the influx insert, containing only the defined keys
    let point = new Map();
    values.forEach(function(value, key) {
      if(influxFieldSchema[key])
        point.set(key, value);
    });
  
    // write the point and return
    client.write(measurement)
      .field(Object.fromEntries(point))
      .then(() => logger.info('Write point to influx success'))
      .catch(console.error);    
  }
  
  const prepareJson = (res, res2) => {
    // mapping komfovent webpage codes to friendly names
    const externalName = {
      'omo':'fan_mode',
      'oc-1':'eco_mode','oc-2':'auto_mode','ai0':'temp_supply','ai1':'temp_extract','ai2':'temp_outdoor',
      'ec2':'heat_recovery','ec4':'heat_power','ec1':'heat_efficiency',
      'ec7d':'heat_energy_day','ec7m':'heat_energy_month','ec7t':'heat_energy_total',
      'fcg':'filter_clogging_perc',
      'ec3':'power_current','ec8d':'recover_energy_day','ec8m':'recover_energy_month','ec8t':'recover_energy_total',
      'ec6d':'consume_energy_day','ec6m':'consume_energy_month','ec6t':'consume_energy_total',
      'saf':'airflow_supply_perc','eaf':'airflow_extract_perc',
      'v_ad':'air_damper_perc','v_es':'energy_saving_level',
      'om-1':'away',  'om-2':'normal','om-3':'intensive','om-4':'boost','om-5':'kitchen','om-6':'fireplace','om-7':'override','om-8':'holidays'};
      
    // some fieldnames that need special handling
    const id_omo = 'omo';
    const id_om_prefix = 'om-';
    const externalNameMode = 'fan_mode';
    const externalNameModeId = 'fan_mode_id';
  
    let merged = new Map();
    let omoValue = "";
    
    res.forEach(function(value, key) {
      // the following code will remember the localized value found for omo and use it to match
      // in the om- prefixed state flags to detect which state is active and then to apply a non-localized
      // external friendly json fan_mode value. also we will export a numeric fan_mode_id, and we will apply
      // a 0/1 flag to each single state.
      if(key==id_omo)
        omoValue = value;
        
      // the above was only to keep the omo value. now the other cases
      // if string startswith om- prefix, we will save the mapped key/value, then check for value 1 and save as fan_mode as well
      else if(key.startsWith(id_om_prefix)) {
        if(value == omoValue) {
          let idvalue = key.split('-')[1];
          let idnumber=null;
          if(idvalue && !isNaN(Number(idvalue)))
            idnumber = parseFloat(idvalue);
          merged.set(externalNameMode, externalName[key]);
          merged.set(externalNameModeId, idnumber);
          merged.set(externalName[key], 1);
        }
        else
          merged.set(externalName[key], 0);
      }
      // else just the regular value
      else
        merged.set(externalName[key], value);
    });
    res2.forEach(function(value, key) {
      merged.set(externalName[key], value);
    });
    return merged;
  }
  
module.exports = {
  fetch,
  processBatch,
  pushToInflux,
  prepareJson
};