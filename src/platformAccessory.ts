import {
  Service,
  PlatformAccessory,
  CharacteristicValue,
} from 'homebridge';

import { CO2SignalPlatform } from './platform';
import { CO2SignalClient } from './co2signal';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class CO2SignalPlatformAccessory {
  private service: Service;

  // Use a cache as the API has a aggresive rate-limiting.
  private co2signalCache = {
    co2Intensity: 0,
  };

  private readonly co2signalClient: CO2SignalClient;

  constructor(
    private readonly platform: CO2SignalPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'homebridge-co2signal')
      .setCharacteristic(this.platform.Characteristic.Model, '000000')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '000000');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.CarbonDioxideSensor) ||
      this.accessory.addService(this.platform.Service.CarbonDioxideSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/CarbonDioxideSensor

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.CarbonDioxideLevel)
      .onGet(this.getCarbonDioxideLevel.bind(this));


    this.co2signalClient = new CO2SignalClient(
      this.platform.log,
      this.platform.config.co2signalAPIKey,
      this.platform.config.co2signalAPILocation,
    );

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    this.refreshData();
    setInterval(async () => {
      await this.refreshData();
    }, this.platform.config.apiDataRefreshInterval * 60 * 1000);
  }

  shouldAlert(alertsMode: string, alertThreshold: number, co2Intensity: number): boolean {
    switch (alertsMode) {
      case 'below': return co2Intensity <= alertThreshold;
      case 'above': return co2Intensity >= alertThreshold;
      default: return false;
    }
  }

  async refreshData() {
    try {
      this.co2signalCache.co2Intensity = await this.co2signalClient.getCO2Intensity();

      const shouldAlert = this.shouldAlert(
        this.platform.config.co2IntensityAlertingMode,
        this.platform.config.co2IntensityAlertThreshold,
        this.co2signalCache.co2Intensity,
      );
      this.platform.log.debug('Current intensity:', this.co2signalCache.co2Intensity, 'alerts:', shouldAlert);
      this.service.updateCharacteristic(this.platform.Characteristic.CarbonDioxideDetected, shouldAlert);
      this.service.updateCharacteristic(this.platform.Characteristic.CarbonDioxideLevel, this.co2signalCache.co2Intensity);
    } catch (err) {
      this.platform.log.error('An error occured while refreshing CO2 intensity:', err);
    }
  }


  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getCarbonDioxideLevel(): Promise<CharacteristicValue> {
    if (!this.co2signalCache.co2Intensity) { // No available data
      // Show the device as "Not Responding" in the Home app
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    return this.co2signalCache.co2Intensity;
  }

}
