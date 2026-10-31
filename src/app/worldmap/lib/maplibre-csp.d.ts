// maplibre-gl's CSP build has the same API as its default entry, which carries the types
declare module 'maplibre-gl/dist/maplibre-gl-csp' {
  import maplibregl from 'maplibre-gl';
  export default maplibregl;
}
