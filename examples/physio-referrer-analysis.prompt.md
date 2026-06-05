# Standortanalyse mit Google Places Nearby Search

## Aufgabe

Analysiere den Standort **52.5288656,13.4560194** im Umkreis von **400 m**.

Nutze ausschließlich das MCP-Tool `google_places_nearby_search`.

Nutze ausschließlich die unten definierten Google Places Types. Verwende keine freien Suchbegriffe, keine Text Search, keine Websuche und keine anderen Google Types.

Verwende ausschließlich die folgenden Google Places Field Masks:

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

Fordere keine weiteren Felder an.

Wichtig: Übergebe `fieldMask` als echtes JSON-Array, nicht als JSON-String.

---

## Suchlogik

Führe genau **zwei** MCP-Tool-Aufrufe aus.

### Abfrage 1: Wettbewerber

Google Places Type:

```text
physiotherapist
```

Tool-Aufruf:

```json
{
  "center": {
    "latitude": 52.5288656,
    "longitude": 13.4560194
  },
  "radius": 400,
  "includedTypes": [
    "physiotherapist"
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

Klassifizierung:

```text
Wettbewerber
```

### Abfrage 2: Zuweiser

Google Places Types:

```text
doctor
medical_clinic
medical_center
general_hospital
hospital
```

Tool-Aufruf:

```json
{
  "center": {
    "latitude": 52.5288656,
    "longitude": 13.4560194
  },
  "radius": 400,
  "includedTypes": [
    "doctor",
    "medical_clinic",
    "medical_center",
    "general_hospital",
    "hospital"
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

Klassifizierung:

```text
Zuweiser
```

Verwende diese Google Places Types in **einer einzigen** Abfrage. Es sollen keine zusätzlichen Abfragen pro Type durchgeführt werden.

---

## Ausschluss- und Deduplikationsregeln

- Treffer mit Google Type `physiotherapist` dürfen niemals als `Zuweiser` klassifiziert werden.
- Wenn ein Treffer sowohl einen Zuweiser-Type als auch `physiotherapist` enthält, wird er ausschließlich als `Wettbewerber` geführt.
- Dedupliziere alle Ergebnisse anhand der Google Place `id`.
- Falls ein Treffer mehrfach gefunden wird, behalte nur den vollständigsten Datensatz.
- Gib keine Treffer aus, die keiner der oben genannten Kategorien eindeutig zugeordnet werden können.

---

## Ausgabeformat

Gib die Ergebnisse in zwei getrennten Tabellen aus.

### Wettbewerber

| Name | Google Place Type | Adresse | Telefon | Website | Google Maps | id | Latitude | Longitude | Google Rating | Anzahl Bewertungen |
| ---- | ----------------- | ------- | ------- | ------- | ----------- | -- | -------- | --------- | ------------- | ------------------ |

### Zuweiser

| Name | Google Place Type | Adresse | Telefon | Website | Google Maps | id | Latitude | Longitude | Google Rating | Anzahl Bewertungen |
| ---- | ----------------- | ------- | ------- | ------- | ----------- | -- | -------- | --------- | ------------- | ------------------ |

Verwende folgende Feldzuordnung:

| Tabellenspalte | Google Field |
| --- | --- |
| Name | places.displayName.text |
| Google Place Type | places.primaryType |
| Adresse | places.formattedAddress |
| Telefon | places.nationalPhoneNumber |
| Website | places.websiteUri |
| Google Maps | places.googleMapsUri |
| id | places.id |
| Latitude | places.location.latitude |
| Longitude | places.location.longitude |
| Google Rating | places.rating |
| Anzahl Bewertungen | places.userRatingCount |

Wenn Telefon, Website oder Google Maps URL fehlen, trage `nicht verfügbar` ein.

---

## Sortierung

Sortiere beide Tabellen nach:

1. Google Rating absteigend
2. Anzahl Bewertungen absteigend

Fehlende Ratings oder fehlende Bewertungsanzahlen werden nach vorhandenen Werten einsortiert.

---

## Zusammenfassung

Gib am Ende zusätzlich aus:

- Anzahl Wettbewerber
- Anzahl Zuweiser
- Suchradius in Metern
- Standortkoordinaten
- Verwendete Google Places Types
- Anzahl durchgeführter MCP-Tool-Aufrufe

---

## Wichtige Hinweise

- Verwende ausschließlich das MCP-Tool `google_places_nearby_search`.
- Führe genau zwei MCP-Tool-Aufrufe aus.
- Verwende ausschließlich die oben definierten Field Masks.
- Übergebe `fieldMask` als echtes JSON-Array, nicht als JSON-String.
- Verwende für die Zuweiser-Suche genau eine gemeinsame Abfrage mit allen definierten Zuweiser-Types.
- Führe keine zusätzlichen Websuchen durch.
- Führe keine weiteren Nearby-Suchen für einzelne Types durch.
- Verwende keine freien Suchbegriffe.
- Verwende keine Schätzungen oder Annahmen.
- Gib nur tatsächlich gefundene Google Places Ergebnisse aus.
- Wenn keine Ergebnisse gefunden werden, gib dies explizit an.
