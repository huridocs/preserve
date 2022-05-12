# Preserve

[![Run tests](https://github.com/huridocs/preserve/actions/workflows/test.yml/badge.svg)](https://github.com/huridocs/preserve/actions/workflows/test.yml) [![Smoke test production build](https://github.com/huridocs/preserve/actions/workflows/smoke_test_production.yml/badge.svg)](https://github.com/huridocs/preserve/actions/workflows/smoke_test_production.yml)

## Requirements
- Docker
- Docker compose (installed by default in Docker desktop for Mac/Windows)

## Development

To start the containers:

```shell
./run start
```

To start the containers exposing the ports to your host machine:
```shell
./run start:local
```
