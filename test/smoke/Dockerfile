FROM alpine:3.15

RUN apk add --no-cache curl

COPY smoke-test.sh smoke-test.sh

CMD ["sh", "smoke-test.sh", "http://app:3000"]