# LoxBerry-Plugin-komfoven

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Apache License][license-shield]][license-url]

This Plugin gets every 1 minutes various values from a komfovent c6 device, sends them to the miniserver via udp messages and optionally to a influxdb database. The reading of the komfovent data is based on the code
https://github.com/ksvan/node-red-contrib-komfovent/blob/master/komfnodes/komfovent.js

from the node-red komfovent module
https://github.com/ksvan/node-red-contrib-komfovent

The file has been adapted and extended to support the use-case needed in this loxberry plugin, the modified version is here
https://github.com/christophmoar/LoxBerry-Plugin-komfoven/blob/master/webfrontend/htmlauth/express/api/komfovent.js

Supposed to work on LoxBerry > v2.2, tested on LoxBerry v3.0

Plugin information and documentation page can be found at:
https://wiki.loxberry.de/plugins/komfovent_bridge/start

<!-- GETTING STARTED -->
## Getting Started

### Function of the plugin
The plugin triggers a cronjob script every 1min that reads various data from the komfovent c6 webserver, scraping the page to extract all available data. It then sends them via UDP to the miniserver, using a space-padded json format to permit for easy value extraction on the miniserver side. If you also indicate a target influxdb database and measurement, the plugin will also push the values to influxdb for further processing.

### Installation
The installation should be straight forward via web interface of the loxberry.

### Configuration options
The settings are:

```
[KOMFOVENT]
SERVER={ip address of komfovent c6}
USERNAME={username}
PASSWORD={password}

[MINISERVER]
PORT={udp port on miniserver to push data}

[INFLUXDB]
DATABASE={database name}
MEASUREMENT={measurement name}
SERVER={server name or ip address}
PORT={port}
USERNAME={username}
PASSWORD={password}
```

## Data sent via JSON to miniserver
The following is an example of a json struct sent to the miniserver, containing the following data:

```
{
   "away":0,
   "fan_mode":"normal",
   "fan_mode_id":2,
   "normal":1,
   "intensive":0,
   "boost":0,
   "kitchen":0,
   "fireplace":0,
   "override":0,
   "holidays":0,
   "eco_mode":0,
   "auto_mode":1,
   "temp_supply":21.7,
   "temp_extract":21.8,
   "temp_outdoor":15.3,
   "heat_recovery":192,
   "heat_power":175,
   "heat_efficiency":38,
   "heat_energy_day":3.2,
   "heat_energy_month":117.28,
   "heat_energy_total":1101.55,
   "filter_clogging_perc":100,
   "power_current":230,
   "recover_energy_day":4.66,
   "recover_energy_month":228.22,
   "recover_energy_total":5833.16,
   "consume_energy_day":3.75,
   "consume_energy_month":142.9,
   "consume_energy_total":1767.66,
   "airflow_supply_perc":50,
   "airflow_extract_perc":50,
   "air_damper_perc":100,
   "energy_saving_level":52
}
```

## Aggregated data in a grafana dashboard
The following screenshot shows some of the aggregated data displayed in a grafana dashboard.

![image](https://user-images.githubusercontent.com/62471240/225679930-cc5b9c65-a4d5-412e-9dc7-19d68542c32c.png)

## Setup in the Loxone Config Software
* Create a "Virtual UDP Input" and one or more "Virtual UDP Input Commands"
![image](https://user-images.githubusercontent.com/62471240/227454322-5e3fe2c9-66a9-4266-b629-e42b4ceba469.png)

* Configure the "Virtual UDP Input Commands" to parse the relevant values for your application
![image](https://user-images.githubusercontent.com/62471240/227454508-3395116f-d693-4302-b183-1205362433c2.png)

* Setup status icons to display in the loxone app
![image](https://user-images.githubusercontent.com/62471240/227454101-15edb4db-bb7e-4962-9cc3-0f340c92c825.png)

* If you want to map status ids to textual representations, you can configure the status component of loxone as here
![image](https://user-images.githubusercontent.com/62471240/227454227-a47ff1f5-4cbe-4498-a237-0ee94a5b28bb.png)


## Example Output in Loxone
You can display whatever values are relevant for you, the following example shows 
* the fan_mode_id converted to a textual/graphical icon (Lüftung Mode)
* the filter clogging status (Lüftung Filter)
* the status of the eco mode (on/off)
* the status of the auto mode (on/off)

![image](https://user-images.githubusercontent.com/62471240/227453872-b2947e14-7826-46fb-adb4-49282b07d3a6.png)


<!-- LICENSE -->
## License

Distributed under the Apache License 2.0. See `LICENSE` for more information.

<!-- CONTACT -->
## Contact

Christoph Moar - [@christophmoar](https://twitter.com/christophmoar) 

Project Link: [https://github.com/christophmoar/LoxBerry-Plugin-komfoven](https://github.com/christophmoar/LoxBerry-Plugin-komfoven)

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

The komfovent access has been adapted by code provided by node-red-contrib-komfovent.
The plugin itself uses the Loxberry Express Server Plugin.

Thanks and aknowledgements to the following fine projects:
* [Node-red-contrib-komfovent] (https://github.com/ksvan/node-red-contrib-komfovent)
* [Loxberry Express Server Plugin] (https://github.com/LoxYourLife/loxberry-express)
* [Loxberry] (https://wiki.loxberry.de)
* [Loxforum] (https://www.loxforum.com)


<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/christophmoar/LoxBerry-Plugin-komfoven.svg?style=for-the-badge
[contributors-url]: https://github.com/christophmoar/LoxBerry-Plugin-komfoven/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/christophmoar/LoxBerry-Plugin-komfoven.svg?style=for-the-badge
[forks-url]: https://github.com/christophmoar/LoxBerry-Plugin-komfoven/network/members
[stars-shield]: https://img.shields.io/github/stars/christophmoar/LoxBerry-Plugin-komfoven.svg?style=for-the-badge
[stars-url]: https://github.com/christophmoar/LoxBerry-Plugin-komfoven/stargazers
[issues-shield]: https://img.shields.io/github/issues/christophmoar/LoxBerry-Plugin-komfoven.svg?style=for-the-badge
[issues-url]: https://github.com/christophmoar/LoxBerry-Plugin-komfoven/issues
[license-shield]: https://img.shields.io/github/license/christophmoar/LoxBerry-Plugin-komfoven.svg?style=for-the-badge
[license-url]: https://github.com/christophmoar/LoxBerry-Plugin-komfoven/blob/main/LICENSE


