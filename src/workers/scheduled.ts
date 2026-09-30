import type { ExecutionContext, ScheduledController } from '@cloudflare/workers-types';
import { createDb } from '../db';
import { createRunDeps, runRecurringExpenses } from './services/recurring-expense-generation';
import type { Env } from './types';

// Cron Trigger entry point (see wrangler.toml [triggers]): recurring expenses generation
export async function scheduled(
  controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  ctx.waitUntil(
    runRecurringExpenses(createRunDeps(createDb(env.DB)), new Date(controller.scheduledTime)).then(
      () => undefined,
    ),
  );
}
