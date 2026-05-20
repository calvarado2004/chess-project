#!/bin/sh
# Replace BACKEND_HOST placeholder in nginx config and start nginx
sed -i "s|\$BACKEND_HOST|${BACKEND_HOST:-backend}|g" /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
