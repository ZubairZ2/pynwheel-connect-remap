# bundle exec puma -p $PORT -t 1:5 -w 2
web: bundle exec rails server -p ${PORT:-3000}
redis: redis-server /usr/local/etc/redis.conf
sidekiq_worker: bundle exec sidekiq -C ./config/sidekiq.yml