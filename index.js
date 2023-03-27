"use strict";
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const JWKS_URI = "https://auth.example.com/.well-known/jwks.json";
const JWT_TRUSTED_ISSUER = "https://auth.example.com/";
const JWT_TRUSTED_AUDIENCE = "https://agent.example.com";

// Get the public key from JWKS.
const jwksGetKey = async (jwksUri, kid) => {
  const client = jwksClient({ jwksUri, timeout: 30000 });
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
};

// Unauthorized response.
const response401 = {
  status: "401",
  statusDescription: "Unauthorized",
};

// Lambda@Edge function.
exports.handler = async (event, context, callback) => {
  try {
    console.log("Handling event", JSON.stringify(event, null, 2));
    const request = event.Records[0].cf.request;
    const headers = request.headers;

    if (!headers.authorization) {
      console.log("No authorization header");
      return callback(null, response401);
    }

    // Extract the authorization scheme and token.
    const [authScheme, authToken] = headers.authorization[0].value.split(" ");
    console.log("Authorization scheme", authScheme);
    console.log("Authorization token", authToken);

    let jwtToken;
    switch (authScheme.toLowerCase()) {
      // The authorization token is a base64-encoded string of 'username:password', where password is the actual JWT token.
      case "basic":
        jwtToken = Buffer.from(authToken, "base64").toString().split(":")[1];
        break;
      // The authorization token is a JWT token.
      case "bearer":
        jwtToken = authToken;
        break;
    }
    console.log("JWT token", jwtToken);

    // Fail if the token is not JWT.
    const decodedJwt = jwt.decode(jwtToken, { complete: true });
    if (!decodedJwt) {
      console.log("Not a valid JWT token");
      return callback(null, response401);
    }

    // Fail if token is not from trusted issuer.
    if (decodedJwt.payload.iss != JWT_TRUSTED_ISSUER) {
      console.log("Invalid issuer", decodedJwt.payload.iss);
      return callback(null, response401);
    }

    // Get the kid from the token and retrieve corresponding PEM.
    const kid = decodedJwt.header.kid;
    const pem = await jwksGetKey(JWKS_URI, kid);
    if (!pem) {
      console.log("Invalid access token");
      return callback(null, response401);
    }

    // Verify the signature of the JWT token to ensure it's really coming from a trusted party.
    jwt.verify(jwtToken, pem, {
      issuer: JWT_TRUSTED_ISSUER,
      audience: JWT_TRUSTED_AUDIENCE,
    });

    // Valid token.
    console.log("Successful verification");

    // CloudFront can proceed to fetch the content from origin.
    console.log("Returning request", JSON.stringify(request, null, 2));
    return callback(null, request);
  }
  catch (err) {
    console.error("Failed verification", err);
    return callback(null, response401);
  }
};
