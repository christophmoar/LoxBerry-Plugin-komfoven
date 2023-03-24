#!/usr/bin/env python3

import sys
import os
import json
import urllib3

def webserver_config():
        LBSCONFIG = os.getenv('LBSCONFIG')
        generaljsonPath = LBSCONFIG+'/general.json'
        generaljsonFilehandle = open(generaljsonPath)
        generaljson = json.load(generaljsonFilehandle)

        sys.stderr.write ("Get LoxBerry Webserver Config from general.json\n")
        sys.stderr.write ("System config dir: " + LBSCONFIG + "\n")
        sys.stderr.write ("System config file: " + generaljsonPath + "\n")

        if "Webserver" in generaljson:
                return generaljson['Webserver']
        else:
                sys.stderr.write ("Webserver data not available\n")


webserver = webserver_config()

if not webserver:
        sys.stderr.write ("Webserver data not available. Please notify plugin developer.\n")
        quit()

PDIR='REPLACELBPPLUGINDIR'
url = "http://localhost:"+webserver['Port']+'/express/plugins/'+PDIR+'/get'
http = urllib3.PoolManager()
response = http.request('GET', url)
json_response = json.loads(response.data)
print(json_response)
