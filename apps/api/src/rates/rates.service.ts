import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

// Type for the rates structure stored in Redis
export type ExchangeRates = Record<string, number>;

const FALLBACK_RATES: ExchangeRates = {
  USD: 1.0, // Base
  NGN: 1500,
  GBP: 0.78,
  EUR: 0.92,
};

@Injectable()
export class RatesService implements OnModuleInit {
  private readonly logger = new Logger(RatesService.name);
  private cachedRates: ExchangeRates = { ...FALLBACK_RATES };

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleInit() {
    // Fetch immediately on startup if Redis has no rates yet.
    try {
      const exists = await this.redis.exists('rates:USD');
      if (!exists) {
        await this.fetchAndStoreRates();
      } else {
        const raw = await this.redis.get('rates:USD');
        if (raw) this.cachedRates = this.parseRates(raw);
      }
    } catch (error) {
      this.logger.warn(
        `Exchange rates cache unavailable at startup; using fallback rates. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async handleCron() {
    this.logger.log('Running scheduled exchange rates fetch...');
    await this.fetchAndStoreRates();
  }

  async fetchAndStoreRates() {
    try {
      // Fetch Global Rates from Open Exchange Rates (OER). OER is optional;
      // without an app id we keep the transparent fallback rates.
      let oerRates: ExchangeRates = {};
      const appId = process.env.OER_APP_ID;

      if (appId) {
        try {
          const res = await fetch(
            `https://openexchangerates.org/api/latest.json?app_id=${appId}`,
            { signal: AbortSignal.timeout(5_000) },
          );
          if (res.ok) {
            const data = (await res.json()) as { rates?: ExchangeRates };
            oerRates = data.rates ?? {};
          } else {
            this.logger.warn('Failed to fetch from OER API, using fallbacks.');
          }
        } catch {
          this.logger.warn('Error fetching from OER API, using fallbacks.');
        }
      } else {
        this.logger.log('OER_APP_ID not set; using fallback exchange rates.');
      }

      // Transparent rates — no buffer. Revenue captured via exchange commission
      // and withdrawal spread.
      const combinedRates: ExchangeRates = {
        ...FALLBACK_RATES,
        ...oerRates,
      };

      this.cachedRates = combinedRates;

      try {
        await this.redis.set('rates:USD', JSON.stringify(combinedRates));
        this.logger.log('Successfully updated exchange rates in Redis.');
      } catch (error) {
        this.logger.warn(
          `Could not write exchange rates to Redis; keeping them in memory. ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to update exchange rates', error);
    }
  }

  /**
   * Retrieves the current rates dictionary. Redis is the shared cache, but an
   * in-memory copy keeps the API usable when Redis is temporarily unavailable.
   */
  async getRates(): Promise<ExchangeRates> {
    try {
      const raw = await this.redis.get('rates:USD');
      if (raw) {
        this.cachedRates = this.parseRates(raw);
      }
    } catch {
      this.logger.warn(
        'Exchange rates cache unavailable; using the last known rates.',
      );
    }

    return this.cachedRates;
  }

  private parseRates(raw: string): ExchangeRates {
    try {
      const parsed = JSON.parse(raw) as ExchangeRates;
      return { ...FALLBACK_RATES, ...parsed };
    } catch {
      this.logger.warn(
        'Stored exchange rates were malformed; using fallbacks.',
      );
      return { ...FALLBACK_RATES };
    }
  }
}
