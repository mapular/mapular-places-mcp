# Mapular Places MCP

Mapular Places MCP lets Claude use **Google Places API Nearby Search**.

It provides one tool:

```text
google_places_nearby_search
```

Use it when Claude should search for places near coordinates, using Google Places types such as `restaurant`, `doctor`, `physiotherapist`, `school`, or `store`.

## What you need

Before setup, you need:

1. **Node.js 20 or newer** installed
2. A **Google Maps / Google Places API key**
3. **Places API (New)** enabled in Google Cloud
4. Billing enabled in Google Cloud

Your Google API key stays on your computer. Mapular does not receive your key or your search requests.

## Setup option 1: local install from this repo

Use this option if you cloned or downloaded this repository.

### Step 1: install and build

Open a terminal in the repository folder and run:

```bash
npm install
npm run build
```

### Step 2: add this to your Claude MCP config

Replace `/absolute/path/to/mapular-places-mcp` with the real path to this folder and `YOUR_GOOGLE_PLACES_API_KEY` with your Google Places API key.

```json
{
  "mcpServers": {
    "mapular-places": {
      "command": "node",
      "args": ["/absolute/path/to/mapular-places-mcp/dist/server.js"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "YOUR_GOOGLE_PLACES_API_KEY"
      }
    }
  }
}
```

### Step 3: restart Claude

Restart Claude after saving the config.

Claude starts the MCP server itself. You do **not** need to run `npm run start` when using Claude.

> **For developers only:**
> Use `npm run start` only for manual development/testing, not for normal Claude setup.
>
> ```bash
> GOOGLE_MAPS_API_KEY=your_key npm run start
> ```

## Setup option 2: use the npm package

Use this option if the package is available on npm. You do not need to clone this repository or run `npm install` / `npm run build`.

Add this to your Claude MCP config:

```json
{
  "mcpServers": {
    "mapular-places": {
      "command": "npx",
      "args": ["-y", "@mapular/places-mcp"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "YOUR_GOOGLE_PLACES_API_KEY"
      }
    }
  }
}
```

Restart Claude after saving the config.

## How it works

- Claude starts this MCP server locally on your computer.
- Claude talks to the server through MCP.
- The server sends Nearby Search requests to Google Places API.
- Your Google API key is read from the Claude config.
- Mapular does not host this server and does not see your requests.

## Tool input

The tool supports Google Places Nearby Search parameters:

- `locationRestriction.circle.center.latitude`
- `locationRestriction.circle.center.longitude`
- `locationRestriction.circle.radius`
- `includedTypes`
- `excludedTypes`
- `includedPrimaryTypes`
- `excludedPrimaryTypes`
- `maxResultCount`
- `rankPreference`
- `languageCode`
- `regionCode`
- `fieldMask`

It also supports a simpler coordinate format:

```json
{
  "center": {
    "latitude": 52.5288656,
    "longitude": 13.4560194
  },
  "radius": 400,
  "includedTypes": ["physiotherapist"]
}
```

The tool is only for **Nearby Search**. It does not do keyword search, Text Search, or web search.

## Field masks

Field masks control which fields Google returns.

If you do not provide a field mask, this default is used:

```text
places.id
places.displayName
places.primaryType
places.types
places.formattedAddress
places.location
places.rating
places.userRatingCount
places.googleMapsUri
places.websiteUri
places.nationalPhoneNumber
```

You can request any valid Nearby Search field mask that starts with `places.`.

Important: pass `fieldMask` as a real JSON array, not as text containing an array. It looks like this:

```json
{
  "fieldMask": ["places.id", "places.displayName", "places.location"]
}
```

## Prompt examples

See [`examples/physio-referrer-analysis.prompt.md`](examples/physio-referrer-analysis.prompt.md) for a complete Claude/Cowork prompt that runs two Nearby Search calls and formats competitor/referrer tables.

## Advanced: manual testing without Claude

These commands are only for developers or manual testing.

Run the server manually:

```bash
GOOGLE_MAPS_API_KEY=your_key npm run start
```

Run one tool call from the terminal:

```bash
GOOGLE_MAPS_API_KEY=your_key npm run exec -- google_places_nearby_search '{"center":{"latitude":52.5288656,"longitude":13.4560194},"radius":400,"includedTypes":["physiotherapist"]}'
```

## License

Apache-2.0
