#! /usr/bin/env bash
while read -r line;do yarn ts-node src/testPuppeteer.ts "$line";done < urls.txt
