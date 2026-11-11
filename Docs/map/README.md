# Map

A core functionality of our product is the [map](../../app/src/app/components/map/map.tsx). It provides foresters (project editors) the ability draw stands, select parcels, access soil data, and link attributes. It provides landowners (project viewers) the ability to view their property information in context.

## Tech stack

The map is a MapLibre GL view (`maplibre-gl` ^6.16.0). Its basemap is [ESRI Satellite Imagery](https://developers.arcgis.com/rest/basemap-styles/arcgis-imagery-style-get/), and those tiles require a token.

## Documentation References

- [Address](address.md): Address suggestions and geocoding.
- [Basemap](basemap.md): ESRI basemap tiles, caching, and security.
- [Camera](camera.md): Camera position, zooming, and panning.
- [Drawing](drawing.md): Polygon sketch, snapping, and edit handles.

