# Field Reference for `peek.json`

## Root Object

- `version` (string) – Schema version (e.g. "1.0").
- `meta` (object) – Site metadata.
- `license` (object) – License configuration and pricing rules.

## `meta`

- `site_name` (string) – Human-readable name of the site.
- `publisher` (string) – Name of the publishing organization.
- `categories` (array[string]) – High-level content types (e.g. "news", "reviews").
- `last_updated` (date) – Last update date (YYYY-MM-DD).

## `license`

- `license_issuer` (string/uri) – API endpoint to acquire a license and inspect remaining spend.
- `terms_url` (string/uri) – Link to legal terms (typically at /.well-known/peek-license.json).

### `pricing` (object)

- `default_per_page` (number) – Cost (USD) for a standard page.
- `max_per_page` (number) – Maximum cost allowed for a single page.
- `currency` (string, default: "USD") – Currency used.
- `override_mechanism` (enum: "header", "402-response", "both") – How pages signal override pricing.
- `override_header_name` (string, default: "X-Peek-Page-Cost") – Name of the header that carries override price.
