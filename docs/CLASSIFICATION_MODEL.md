# EU-DOC Classification Model

This file defines the classification boundaries used by EU-DOC. Keep these rules stable so product, document, search, and admin features do not drift into conflicting logic.

## Three Separate Classification Layers

EU-DOC uses three different classification layers. They must not be merged into one field.

### 1. Consumer Product Category

Purpose: help C-end users find products by real-world usage.

Examples:
- Sports & Outdoor > Equestrian Equipment > Equestrian Helmet
- Electronics > Smart Home > Plug / Light
- Children Products > Toys > Electric Toys

Usage:
- Home page category entrances
- Product search filters
- Product detail page
- Company product list
- B-end product editing

Data rule:
- A product should have one primary consumer category for clear public navigation.
- Optional secondary levels can be used for a more precise tree.
- Existing `products.category_primary_id` and `products.category_secondary_id` represent consumer categories.

### 2. Compliance / Review Category

Purpose: help regulators, customs, testing labs, and compliance reviewers find documents by regulation or certification path.

Examples:
- PPE / Personal Protective Equipment
- EMC
- LVD
- RED
- RoHS / REACH
- Toy Safety
- Machinery
- Medical Device
- Standards such as EN 1384, EN 1078, EN 71, EN IEC 62368

Usage:
- Compliance-oriented search filters
- Product compliance section
- Document detail page context
- Admin review and data organization

Data rule:
- A product can belong to multiple compliance categories.
- Compliance categories should be maintained by platform admins, not ordinary company users.
- Use `product_compliance_categories(product_id, category_id)` for many-to-many relations.

### 3. Document Type

Purpose: identify what a specific file is.

Examples:
- Certificate
- Declaration of Conformity / DoC
- User Manual
- Test Report
- Installation Guide
- Warranty File
- Other

Usage:
- Upload confirmation
- Product document slots
- Document detail page
- Search filters

Data rule:
- Document type is not a product category.
- Keep using `documents.document_type` for this layer.
- Do not add file types such as DoC or manual into the product category tree.

## Naming In Code

Use these names consistently:

- `taxonomyType: "consumer"` for C-end product categories.
- `taxonomyType: "compliance"` for compliance / review categories.
- `documentType` for file type.
- `categoryPrimaryId` for the product's main consumer category.
- `complianceCategoryIds` for the product's compliance categories.

Backend may temporarily read legacy database rows without `taxonomy_type`, but new code should write the canonical names above.

## UI Rule

- Consumer categories should use human, product-oriented words.
- Compliance categories should use regulation, directive, standard, or certification words.
- Document types should be shown near files, not mixed into product category selection.
