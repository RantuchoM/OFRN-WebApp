-- Retención más agresiva tras el throttle (espacio muerto + bodies pg_net del día).
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'ofrn-cron-log-retention';

SELECT cron.schedule(
  'ofrn-cron-log-retention',
  '30 4 * * *',
  $$
  DELETE FROM cron.job_run_details
  WHERE (end_time IS NOT NULL AND end_time < now() - interval '7 days')
     OR (end_time IS NULL AND start_time < now() - interval '7 days');

  DELETE FROM net._http_response
  WHERE created < now() - interval '1 day';
  $$
);
