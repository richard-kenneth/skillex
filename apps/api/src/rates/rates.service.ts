import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';

// Type for the rates structure stored in Redis
export type ExchangeRates = Record<string, number>;

@Injectable()
export class RatesService implements OnModuleInit {
  private readonly logger = new Logger(RatesService.name);
  private readonly redis: Redis;

  constructor() {
    // Connect to Redis. In production, pass the URL from env vars
    // Using default localhost:6379 for this environment
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async onModuleInit() {
    // Optionally fetch immediately on startup if none exist
    const exists = await this.redis.exists('rates:USD');
    if (!exists) {
      await this.fetchAndStoreRates();
    }
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async handleCron() {
    this.logger.log('Running scheduled exchange rates fetch...');
    await this.fetchAndStoreRates();
  }

  async fetchAndStoreRates() {
    try {
      // Fetch Global Rates from Open Exchange Rates (OER)
      let oerRates: ExchangeRates = {};
      const appId = process.env.OER_APP_ID;

      if (appId) {
        try {
          const res = await fetch(
            `https://openexchangerates.org/api/latest.json?app_id=${appId}`,
          );
          if (res.ok) {
            const data = await res.json();
            oerRates = data.rates || {};
          } else {
            this.logger.warn('Failed to fetch from OER API, using fallbacks.');
          }
        } catch (err) {
          this.logger.warn('Error fetching from OER API, using fallbacks.');
        }
      } else {
        this.logger.warn('OER_APP_ID not set, relying on fallback rates.');
      }

      // Transparent rates — no buffer. Revenue captured via exchange commission & withdrawal spread.
      const combinedRates: ExchangeRates = {
        USD: 1.0, // Base
        NGN: 1500, // Fallback
        GBP: 0.78,
        EUR: 0.92,
        ...oerRates,
      };

      // Store in Redis
      await this.redis.set('rates:USD', JSON.stringify(combinedRates));
      this.logger.log('Successfully updated exchange rates in Redis.');
    } catch (error) {
      this.logger.error('Failed to update exchange rates', error);
    }
  }

  /**
   * Retrieves the current rates dictionary from Redis
   */
  async getRates(): Promise<ExchangeRates> {
    const raw = await this.redis.get('rates:USD');
    if (raw) {
      return JSON.parse(raw);
    }
    // Fallback if Redis is totally empty — transparent rates
    return { USD: 1.0, NGN: 1500, GBP: 0.78, EUR: 0.92 };
  }
}
