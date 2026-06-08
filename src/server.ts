#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PLACES_BASE_URL = "https://places.googleapis.com/v1/places";
const GOOGLE_PLACES_NEARBY_TOOL_NAME = "google_places_nearby_search";
const GOOGLE_PLACES_TEXT_TOOL_NAME = "google_places_text_search";

const DEFAULT_NEARBY_FIELD_MASKS = [
  "places.id",
  "places.displayName",
  "places.primaryType",
  "places.types",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.nationalPhoneNumber",
] as const;

const DEFAULT_NEARBY_FIELD_MASK = DEFAULT_NEARBY_FIELD_MASKS.join(",");

const DEFAULT_TEXT_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.formattedAddress",
  "places.location",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
].join(",");

const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

type Circle = {
  center: { latitude: number; longitude: number };
  radius: number;
};

type TextSearchArgs = {
  textQuery: string;
  center: { latitude: number; longitude: number };
  locationBiasRadius?: number;
  maxResultCount?: number;
  languageCode: string;
  regionCode?: string;
  fieldMask?: string[] | string;
};

type NearbySearchArgs = {
  locationRestriction?: { circle: Circle };
  center?: { latitude: number; longitude: number } | { value: string; isCoordinates?: true };
  radius?: number;
  radiusMeters?: number;
  includedTypes?: string[];
  excludedTypes?: string[];
  includedPrimaryTypes?: string[];
  excludedPrimaryTypes?: string[];
  maxResultCount?: number;
  rankPreference?: "POPULARITY" | "DISTANCE";
  languageCode?: string;
  regionCode?: string;
  fieldMask?: string[] | string;
};

type ToolConfig = {
  name: string;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
  action: (params: any) => Promise<any>;
};

const placeTypeSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z][a-z0-9_]*$/, 'Place type must be lowercase letters, digits, and underscores (e.g. "restaurant", "physiotherapist")');

const latLngSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const coordinateStringSchema = z.object({
  value: z.string().min(1).describe('Coordinates as "latitude,longitude".'),
  isCoordinates: z.literal(true).default(true),
});

const circleSchema = z.object({
  center: latLngSchema,
  radius: z.number().min(1).max(50000),
});

function requireGoogleApiKey(): string {
  if (!GOOGLE_API_KEY) throw new Error("Missing GOOGLE_MAPS_API_KEY");
  return GOOGLE_API_KEY;
}

function parseCoordinates(value: string): { latitude: number; longitude: number } {
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Invalid coordinate format: "${value}". Use "latitude,longitude".`);
  }

  const [latitude, longitude] = parts;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error(`Invalid coordinates: latitude must be -90..90 and longitude must be -180..180.`);
  }

  return { latitude, longitude };
}

function normalizeFieldMask(fieldMask?: string[] | string, defaultMask = DEFAULT_NEARBY_FIELD_MASK): string {
  if (!fieldMask) return defaultMask;

  let fields: string[];
  if (Array.isArray(fieldMask)) {
    fields = fieldMask;
  } else {
    const trimmed = fieldMask.trim();
    if (trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed) || parsed.some((field) => typeof field !== "string")) {
        throw new Error("fieldMask JSON string must contain an array of strings.");
      }
      fields = parsed;
    } else {
      fields = trimmed.split(",");
    }
  }

  const normalized = [...new Set(fields.map((field) => field.trim()).filter(Boolean))];
  if (!normalized.length) return defaultMask;

  const invalid = normalized.filter((field) => !field.startsWith("places."));
  if (invalid.length) {
    throw new Error(`Invalid fieldMask entries: ${invalid.join(", ")}. Nearby Search fields must use the "places." prefix.`);
  }

  return normalized.join(",");
}

function resolveLocationRestriction(args: NearbySearchArgs): { circle: Circle } {
  if (args.locationRestriction) return args.locationRestriction;

  if (!args.center) {
    throw new Error("Provide locationRestriction.circle or center plus radius/radiusMeters.");
  }

  const center = "value" in args.center ? parseCoordinates(args.center.value) : args.center;
  const radius = args.radiusMeters ?? args.radius;
  if (typeof radius !== "number") {
    throw new Error("Provide radius or radiusMeters when using center.");
  }

  return { circle: { center, radius } };
}

function buildNearbySearchBody(args: NearbySearchArgs): Record<string, unknown> {
  const body: Record<string, unknown> = {
    locationRestriction: resolveLocationRestriction(args),
  };

  if (args.includedTypes?.length) body.includedTypes = args.includedTypes;
  if (args.excludedTypes?.length) body.excludedTypes = args.excludedTypes;
  if (args.includedPrimaryTypes?.length) body.includedPrimaryTypes = args.includedPrimaryTypes;
  if (args.excludedPrimaryTypes?.length) body.excludedPrimaryTypes = args.excludedPrimaryTypes;
  if (typeof args.maxResultCount === "number") body.maxResultCount = args.maxResultCount;
  if (args.rankPreference) body.rankPreference = args.rankPreference;
  if (args.languageCode) body.languageCode = args.languageCode;
  if (args.regionCode) body.regionCode = args.regionCode;

  return body;
}

async function readGoogleError(response: Response, context: string): Promise<string> {
  const body = await response.text();
  let message = body;

  try {
    const json = JSON.parse(body);
    message = json?.error?.message ?? json?.error_message ?? body;
  } catch {
    // keep raw body
  }

  if (response.status === 403) {
    return `${context} failed: API key invalid or Places API (New) not enabled for this key. Google HTTP 403: ${message}`;
  }
  if (response.status === 429) {
    return `${context} failed: Google quota/rate limit hit. Google HTTP 429: ${message}`;
  }

  return `${context} failed. Google HTTP ${response.status}: ${message}`;
}

async function googlePost(path: string, body: unknown, fieldMask: string, context: string) {
  const response = await fetch(`${PLACES_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": requireGoogleApiKey(),
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readGoogleError(response, context));
  }

  return response.json();
}

async function nearbySearch(args: NearbySearchArgs) {
  const fieldMask = normalizeFieldMask(args.fieldMask);
  const requestBody = buildNearbySearchBody(args);
  const response = await googlePost(":searchNearby", requestBody, fieldMask, "Places Nearby Search");

  return {
    success: true,
    googleEndpoint: "places:searchNearby",
    fieldMask: fieldMask.split(","),
    request: requestBody,
    places: response.places ?? [],
  };
}

async function textSearch(args: TextSearchArgs) {
  const fieldMask = normalizeFieldMask(args.fieldMask, DEFAULT_TEXT_FIELD_MASK);
  const requestBody: Record<string, unknown> = {
    textQuery: args.textQuery,
    locationBias: {
      circle: {
        center: args.center,
        radius: args.locationBiasRadius ?? 2000,
      },
    },
    maxResultCount: args.maxResultCount ?? 20,
    languageCode: args.languageCode,
  };

  if (args.regionCode) requestBody.regionCode = args.regionCode;

  const response = await googlePost(":searchText", requestBody, fieldMask, "Places Text Search");

  return {
    success: true,
    googleEndpoint: "places:searchText",
    fieldMask: fieldMask.split(","),
    request: requestBody,
    places: response.places ?? [],
  };
}

function jsonToolResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function safeAction(action: () => Promise<any>) {
  try {
    return jsonToolResult(await action());
  } catch (error) {
    return jsonToolResult({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const tools: ToolConfig[] = [
  {
    name: GOOGLE_PLACES_NEARBY_TOOL_NAME,
    description:
      "General-purpose Google Places API (New) Nearby Search. Supports the Nearby Search request parameters: locationRestriction, includedTypes, excludedTypes, includedPrimaryTypes, excludedPrimaryTypes, maxResultCount, rankPreference, languageCode, regionCode, and explicit places.* field masks. Also accepts center + radius as a convenience for circle searches.",
    schema: {
      locationRestriction: z.object({ circle: circleSchema }).optional(),
      center: z.union([latLngSchema, coordinateStringSchema]).optional(),
      radius: z.number().min(1).max(50000).optional(),
      radiusMeters: z.number().min(1).max(50000).optional(),
      includedTypes: z.array(placeTypeSchema).min(1).max(50).optional(),
      excludedTypes: z.array(placeTypeSchema).min(1).max(50).optional(),
      includedPrimaryTypes: z.array(placeTypeSchema).min(1).max(50).optional(),
      excludedPrimaryTypes: z.array(placeTypeSchema).min(1).max(50).optional(),
      maxResultCount: z.number().min(1).max(20).optional(),
      rankPreference: z.enum(["POPULARITY", "DISTANCE"]).optional(),
      languageCode: z.string().min(2).max(10).optional(),
      regionCode: z.string().min(2).max(2).optional(),
      fieldMask: z
        .array(z.string().min(1))
        .min(1)
        .optional()
        .describe("Field mask as a JSON array of places.* strings. Do not pass a JSON-encoded string."),
    },
    action: nearbySearch,
  },
  {
    name: GOOGLE_PLACES_TEXT_TOOL_NAME,
    description:
      "Google Places API (New) Text Search. Use for keyword-driven searches (e.g. 'Orthopäde', 'Physiotherapie Praxis') where Nearby Search cannot distinguish medical subspecialties via type alone. Applies a soft locationBias circle (default 2000m); results outside the radius may still be returned — the caller is responsible for hard distance filtering. Supports textQuery, center, locationBiasRadius, maxResultCount, languageCode, regionCode, and explicit places.* field masks.",
    schema: {
      textQuery: z.string().min(1).max(500).describe("Search term, e.g. 'Orthopäde' or 'Physiotherapie Praxis'."),
      center: latLngSchema,
      locationBiasRadius: z.number().min(1).max(50000).optional().describe("Soft bias radius in metres (default 2000). Results outside this radius may still be returned."),
      maxResultCount: z.number().min(1).max(20).optional(),
      languageCode: z.string().min(2).max(10),
      regionCode: z.string().min(2).max(2).optional(),
      fieldMask: z
        .array(z.string().min(1))
        .min(1)
        .optional()
        .describe("Field mask as a JSON array of places.* strings. Defaults to standard text search fields including places.location for distance filtering."),
    },
    action: textSearch,
  },
];

const server = new McpServer({
  name: "mapular-places-mcp",
  version: "0.1.0",
});

for (const tool of tools) {
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.schema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (params) => safeAction(() => tool.action(params))
  );
}

async function execTool(toolName: string, params: any) {
  const tool = tools.find((candidate) => candidate.name === toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}. Available: ${tools.map((candidate) => candidate.name).join(", ")}`);
  }
  return tool.action(params);
}

if (process.argv[2] === "exec") {
  const toolName = process.argv[3];
  const params = process.argv[4] ? JSON.parse(process.argv[4]) : {};
  try {
    console.log(JSON.stringify(await execTool(toolName, params), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exit(1);
  }
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
