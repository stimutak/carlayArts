# Client input drop zone

This folder is the handoff point for forthcoming public content. The live working
list remains available at `/client-a-fournir` and is generated from
`docs/artwork-inventory-review.json`.

## Delivery structure

1. Copy the relevant `*.template.json` file and remove `.template` from its name.
2. Put artwork files under `client-input/media/<artwork-slug>/` using descriptive
   names such as `full.jpg`, `detail-texture.jpg`, `back.jpg`, and `room.jpg`.
3. Keep source-resolution files intact. Optimization happens during integration.
4. Mark a record `owner-approved` only after its public facts and files have been
   reviewed by the owner.
5. Run the normal schema, build, link, browser, and accessibility checks after the
   information is mapped into `src/content/artworks/`.

Do not place passwords, provider secrets, payment credentials, customer data, private
addresses, one-time codes, or unapproved legal documents here. Real commerce activation
is a separate checkpoint.

## Placement

- `artist.template.json`: homepage and `/a-propos`.
- `site.template.json`: `/contact`, footer, and public metadata.
- `policies.template.json`: pre-purchase summaries and later checkout review.
- `artwork.template.json`: copy once per slug; facts and media feed its generated
  `/oeuvre/<slug>` page and the catalog.

The templates use `null` deliberately. Missing values remain visible in the client
checklist and never silently become public claims.
