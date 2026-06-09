# Nearby Place Search with Google Places Nearby Search

## Task

Find places near the coordinates **40.7484405,-73.9878584** within a radius of **500 m**.

Use only the MCP tool `google_places_nearby_search`.

Use only the Google Places types defined below. Do not use free-text queries, Text Search, web search, or any other Google types.

Use only the following Google Places field masks:

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

Do not request any additional fields.

Important: Pass `fieldMask` as a real JSON array, not as a JSON string.

---

## Search Logic

Execute exactly **two** MCP tool calls.

### Query 1: Gyms & Fitness Centers

Google Places types:

```text
gym
```

Tool call:

```json
{
  "center": {
    "latitude": 40.7484405,
    "longitude": -73.9878584
  },
  "radius": 500,
  "includedTypes": [
    "gym"
  ],
  "fieldMask": [
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
    "places.nationalPhoneNumber"
  ]
}
```

Category: `Gym`

### Query 2: Sports & Recreation

Google Places types:

```text
sports_club
stadium
sports_complex
```

Tool call:

```json
{
  "center": {
    "latitude": 40.7484405,
    "longitude": -73.9878584
  },
  "radius": 500,
  "includedTypes": [
    "sports_club",
    "stadium",
    "sports_complex"
  ],
  "fieldMask": [
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
    "places.nationalPhoneNumber"
  ]
}
```

Category: `Sports & Recreation`

Use all types for Sports & Recreation in **a single** query. Do not run separate queries per type.

---

## Deduplication Rules

- Deduplicate all results by Google Place `id`.
- If a place appears in both queries, keep it under the category of its primary type.
- If a place has `gym` in its types, always classify it as `Gym`.
- Only output places that can be clearly assigned to one of the above categories.

---

## Output Format

Output the results in two separate tables.

### Gyms & Fitness Centers

| Name | Primary Type | Address | Phone | Website | Google Maps | id | Latitude | Longitude | Rating | Reviews |
| ---- | ------------ | ------- | ----- | ------- | ----------- | -- | -------- | --------- | ------ | ------- |

### Sports & Recreation

| Name | Primary Type | Address | Phone | Website | Google Maps | id | Latitude | Longitude | Rating | Reviews |
| ---- | ------------ | ------- | ----- | ------- | ----------- | -- | -------- | --------- | ------ | ------- |

Field mapping:

| Column | Google Field |
| ------ | ------------ |
| Name | places.displayName.text |
| Primary Type | places.primaryType |
| Address | places.formattedAddress |
| Phone | places.nationalPhoneNumber |
| Website | places.websiteUri |
| Google Maps | places.googleMapsUri |
| id | places.id |
| Latitude | places.location.latitude |
| Longitude | places.location.longitude |
| Rating | places.rating |
| Reviews | places.userRatingCount |

If Phone, Website, or Google Maps URL are missing, enter `n/a`.

---

## Sorting

Sort both tables by:

1. Rating descending
2. Number of reviews descending

Places with missing ratings or review counts are sorted after those with values.

---

## Summary

At the end, also output:

- Number of gyms found
- Number of sports & recreation places found
- Search radius in metres
- Location coordinates
- Google Places types used
- Number of MCP tool calls executed

---

## Important Notes

- Use only the MCP tool `google_places_nearby_search`.
- Execute exactly two MCP tool calls.
- Use only the field masks defined above.
- Pass `fieldMask` as a real JSON array, not as a JSON string.
- Use a single combined query for Sports & Recreation types.
- Do not perform additional web searches.
- Do not run separate nearby searches per type.
- Do not use free-text queries.
- Do not use estimates or assumptions.
- Only output places actually returned by the Google Places API.
- If no results are found, state this explicitly.
