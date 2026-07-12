FROM nginx:1.27-alpine

RUN apk add --no-cache ca-certificates gettext curl

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY keep-warm.sh /usr/local/bin/keep-warm.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/keep-warm.sh /usr/local/bin/entrypoint.sh

EXPOSE 8000

STOPSIGNAL SIGQUIT

CMD PORT=${PORT:-8000} && export PORT && envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && /usr/local/bin/keep-warm.sh & nginx -g 'daemon off;'
