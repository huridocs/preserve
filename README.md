# Preserve

[![Run tests](https://github.com/huridocs/preserve/actions/workflows/test.yml/badge.svg)](https://github.com/huridocs/preserve/actions/workflows/test.yml) [![Smoke test production build](https://github.com/huridocs/preserve/actions/workflows/smoke_test_production.yml/badge.svg)](https://github.com/huridocs/preserve/actions/workflows/smoke_test_production.yml)

Preserve is a tool for capturing and saving online digital content. It is in response to the growing need for using open source intelligence (OSINT) in human rights investigations and documentation. Integrated with [Uwazi](https://github.com/huridocs/uwazi), Preserve captures content from websites, social media and communication platforms, and archives them with accompanying key metadata to ensure evidentiary value by establishing and demonstrating authenticity and chain of custody.

## Preservation process
The application receives an URL and preserves the following content:
- A .txt file with the page body as text.
- A .html file with the page html.
- A .pdf file with the page content rendered as PDF.
- A snapshot .jpg file with the content defined on the viewport size.
- A full snapshot .jpg file with the content scrolling down on the page.
- If the page has videos, a .mp4 file with the videos downloaded at full resolution.

When all the content is preserved, the every file is hashed and those hashes are saved on a single file, which is sent to a third-party [Trusted Timpestamping Authority](https://www.freetsa.org/) that ensures that the content was present on the Internet at the moment of preserving the given URL.

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

If you are working with Mac Apple Silicon chips, you will need to set your Docker default target platform environment variable:

`export DOCKER_DEFAULT_PLATFORM=linux/amd64`
