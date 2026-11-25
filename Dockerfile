FROM python:3.12-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends coturn curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
ENV PYTHONUNBUFFERED=1
EXPOSE 8080 3478/tcp 3478/udp 49160-49200/udp
CMD ["bash", "start.sh"]
