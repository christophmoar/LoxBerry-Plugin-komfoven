const path = require('path')
const inireader = require('read-ini-file')
const iniwriter = require('write-ini-file')
const configHelper = require('./api/confighelper')

module.exports = ({ router, expressStatic, loxberry, logger}) => {
  router.get('/', async (req, res) => {
    const cfg = await configHelper.get(loxberry);
    const pluginpath = cfg.pluginpath;
    return res.render('index', { pluginpath, title: cfg.plugindata.title, pluginData: cfg.plugindata, config: cfg.config});
  });
  
  router.post('/', async (req, res) => {
    const cfg = await configHelper.get(loxberry);
    const pluginpath = cfg.pluginpath;
    const data = {
      KOMFOVENT: {
        SERVER: req.body.komfovent_server,
        USERNAME: req.body.komfovent_username,
        PASSWORD: req.body.komfovent_password
      },
      MINISERVER: { 
        PORT: req.body.miniserver_port
      },
      INFLUXDB: {
        DATABASE: req.body.influxdb_database,
        MEASUREMENT: req.body.influxdb_measurement,
        SERVER: req.body.influxdb_server,
        PORT: req.body.influxdb_port,
        USERNAME: req.body.influxdb_username,
        PASSWORD: req.body.influxdb_password
      }
    };
    iniwriter.writeIniFileSync(cfg.configfile, data);
    cfg.config = inireader.readIniFileSync(cfg.configfile);
    return res.render('index', { pluginpath, title: cfg.plugindata.title, pluginData: cfg.plugindata, config: cfg.config});
  });

  router.use('/assets', expressStatic(path.resolve(__dirname, 'assets')));
  return router;
};
