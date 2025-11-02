# WORKNOW 

## Requirements

- **Node.js**: >= 22.18.0 (required)
- **npm**: >= 10.0.0

### Check Node.js Version

```bash
node --version
```

If you're using an older version, update Node.js:

```bash
# Using nvm (recommended)
nvm install 22.18.0
nvm use 22.18.0

# Or download from https://nodejs.org/
```

**Important**: The application requires Node.js 22.18.0+ due to dependencies like `pdf-parse` and `puppeteer` that use newer Node.js APIs.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```


