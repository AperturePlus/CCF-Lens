/**
 * Adapters Module Index
 * 
 * Exports all adapter-related types and classes for site-specific
 * paper extraction and processing.
 */

// Types
export type {
  VenueSource,
  PaperInfo,
  ProcessedPaperInfo,
  SiteAdapter,
  SiteAdapterConfig,
  SiteAdapterFactory
} from './types'

// Site Manager
export { SiteManager, getSiteManager } from './site-manager'

// Site Adapters
export { ArxivAdapter, createArxivAdapter } from './arxiv-adapter'
export { DblpAdapter, createDblpAdapter } from './dblp-adapter'
export { IeeeAdapter, createIeeeAdapter } from './ieee-adapter'
