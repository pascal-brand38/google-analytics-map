// Copyright (c) Pascal Brand
// MIT License

import type { LatLngExpression, MarkerOptions } from 'leaflet'

export interface AstroLeafLetMarkerType {
  latlng: LatLngExpression,
  options?: MarkerOptions,
}

export interface AstroLeafLetOptionsType {
  center?: LatLngExpression,
  zoom?: number,
  markers?: AstroLeafLetMarkerType[]
}

export interface AstroLeafLetType {
  /** the DOM ID of a <div> element */
  container: string
  /** https://leafletjs.com/reference.html#tilelayer */
  tileLayer: string
  /** Most tile servers require attribution. */
  attribution: string
  containerstyle?: string

  options?: AstroLeafLetOptionsType
}
