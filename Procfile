# bundle exec puma -p $PORT -t 1:5 -w 2
web: bundle exec rails server -p $PORT
# redis: redis-server /usr/local/etc/redis.conf
worker: bundle exec sidekiq -e production