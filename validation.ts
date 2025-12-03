import { type } from "arktype";

// Browser event validation schema
export const browserEventSchema = type({
  "url": "string",
  "referrer?": "string",
  "screenResolution?": "string",
  "language?": "string",
  "sessionId?": "string",
});

// Browser error validation schema
export const browserErrorSchema = type({
  "message": "string",
  "stack?": "string",
  "url?": "string",
});

// Server event validation schema
export const serverEventSchema = type({
  "endpoint": "string",
  "method": "string",
  "statusCode": "number",
  "duration": "number",
  "userAgent?": "string",
  "ip?": "string",
});

// Server error validation schema
export const serverErrorSchema = type({
  "message": "string",
  "stack?": "string",
  "url?": "string",
  "userAgent?": "string",
});
