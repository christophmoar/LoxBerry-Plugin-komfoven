'use strict';
const configHelper = require('./api/confighelper')
const httpstatus = require('http-status-codes')
const Komfovent = require('./api/komfovent')

module.exports = ({ router, loxberry, logger }) => {
  router.get('/get', async (req, res) => {
    // fetch async data in batch, first from main page, once completed then data from additional page
    const cfg = await configHelper.get(loxberry);
    const ids = new Array (
      'omo', 
      'om-1','om-2','om-3','om-4','om-5','om-6','om-7','om-8',
      'oc-1','oc-2','ai0','ai1','ai2','ec2','ec4','ec1','ec7d','ec7m','ec7t','fcg','ec3','ec8d','ec8m','ec8t','ec6d','ec6m','ec6t','saf','eaf');
    const ids2 = new Array ('v_ad','v_es');  
    Komfovent.processBatch(ids, ids2, cfg, logger);  
    return res.json({status: httpstatus.ReasonPhrases.OK});
  });

  return router;
};
