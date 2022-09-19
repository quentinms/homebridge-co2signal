import { Logger } from 'homebridge';
import * as http from 'https';

export class CO2SignalClient {

  private readonly logger: Logger;
  private readonly apiKey: string;
  private readonly location: string;

  constructor(logger: Logger, apiKey: string, location: string) {
    this.logger = logger;
    this.apiKey = apiKey;
    this.location = location;
  }

  async getCO2Intensity(): Promise<number> {
    this.logger.debug('Getting CO₂ intensity for', this.location);

    return new Promise((resolve, reject) => {
      let data = '';

      http.get({
        host: 'api.co2signal.com',
        path: '/v1/latest?countryCode=' + this.location,
        headers: { 'auth-token': this.apiKey },
      }, (res) => {

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error('unexpected status code:' + res.statusCode));
          }
          const val = JSON.parse(data);
          return resolve(val.data.carbonIntensity);
        });

        res.on('error', (err) => {
          return reject(err);
        });
      });
    });
  }
}
