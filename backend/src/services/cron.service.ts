import cron from 'node-cron';
import { scraperService } from './scraper.service';
import { prisma } from '../db';

export class CronService {
  /**
   * Schedules all background cron jobs for the application
   */
  startCronJobs() {
    console.log('🤖 [CronService] Initializing scheduled tasks...');

    // Schedule 1: Auto-Scraper running every hour (0 * * * *)
    cron.schedule('0 * * * *', async () => {
      await this.runDailyScraping();
    });

    console.log('🤖 [CronService] Hourly movie auto-scraper scheduled (runs at the start of every hour).');
  }

  /**
   * Executes the actual movie sync & writes detailed logging to database
   */
  async runDailyScraping(): Promise<{ success: boolean; syncedCount: number; results: string[] }> {
    console.log('🤖 [CronService] Starting scheduled daily scraping task...');
    
    // Create pending log entry
    const log = await prisma.scrapingLog.create({
      data: {
        status: 'PENDING',
        syncedCount: 0,
        results: []
      }
    });

    try {
      // Sync the first page of latest hoathinh updates (only existing database movies)
      const syncResult = await scraperService.syncLatestHoathinh(1, true);

      // Update log entry as success
      await prisma.scrapingLog.update({
        where: { id: log.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          syncedCount: syncResult.syncedCount,
          results: syncResult.results
        }
      });

      console.log(`🤖 [CronService] Scheduled daily scraping completed successfully. Synced ${syncResult.syncedCount} movies.`);
      return syncResult;
    } catch (err: any) {
      console.error('❌ [CronService] Scheduled daily scraping failed:', err.message);
      
      // Update log entry as failed
      await prisma.scrapingLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: err.message
        }
      });
      throw err;
    }
  }
}

export const cronService = new CronService();
