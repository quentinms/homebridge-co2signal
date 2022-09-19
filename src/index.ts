import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { CO2SignalPlatform } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, CO2SignalPlatform);
};
