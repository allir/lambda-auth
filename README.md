# lamdba-auth

This Lambda@Edge function takes a CloudFront request and will check it for an authorization header and validate agains a verifier.
For distribution the code is "compiled" into a single file which includes only the requied dependencies and makes for a much smaller deployment artifact.

This is particularly useful as there are size limits on lambdas set on "viewer request".

## Requirements

* node.js
* ncc

```shell
brew install node
npm i -g @vercel/ncc
```

## Configuration

Set the jwks url, trusted issuer and audience, to the values required.

Example:

```javascript

const JWKS_URI = "https://auth.example.com/.well-known/jwks.json";
const JWT_TRUSTED_ISSUER = "https://auth.example.com/";
const JWT_TRUSTED_AUDIENCE = "https://audience.example.com";

```

## Compiling

Installing the requirements and using `ncc` to "compile" the code into a single file.

```shell
npm install
ncc build index.js -o output
zip -j output/auth-lambda.zip output/index.js
```

The deployable zip file will be in the `./output` folder as `auth-lambda.zip`
