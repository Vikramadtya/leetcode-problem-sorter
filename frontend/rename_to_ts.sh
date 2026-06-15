#!/bin/bash
find src -type f -name "*.jsx" -exec bash -c 'mv "$0" "${0%.jsx}.tsx"' {} \;
find src -type f -name "*.js" -exec bash -c 'mv "$0" "${0%.js}.ts"' {} \;
