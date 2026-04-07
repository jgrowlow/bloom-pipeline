import 'dotenv/config';
import { createCmsItem, publishSite } from '../lib/webflow.js';
import { updateRecord } from '../lib/airtable.js';

/**
 * Publishes a SiteSpec to Webflow CMS and writes item IDs back to Airtable.
 *
 * @param {Object} siteSpec - The fully assembled site specification
 * @param {string} recordId - The Airtable record ID to update with Webflow item IDs
 * @returns {{ itemIds: string[], published: boolean }}
 */
export async function runPublisherAgent(siteSpec, recordId) {
  try {
    let itemIds;

    // --- Idempotency check ---
    // If Webflow Item IDs already exist on the record, skip CMS creation and go straight to publish.
    if (siteSpec.intake['Webflow Item IDs']) {
      itemIds = JSON.parse(siteSpec.intake['Webflow Item IDs']);
    } else {
      // --- Build Webflow field data ---
      // Customize this mapping to match your Webflow collection's field slugs.
      const fieldData = {
        name: siteSpec.intake['Business Name'],
        slug: siteSpec.intake['Business Name'].toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        'hero-headline': siteSpec.copy.hero_headline,
        'hero-subheadline': siteSpec.copy.hero_subheadline,
        'hero-cta': siteSpec.copy.hero_cta,
        'about-headline': siteSpec.copy.about_headline,
        'about-body': siteSpec.copy.about_body,
        'cta-section-headline': siteSpec.copy.cta_section_headline,
        'cta-section-body': siteSpec.copy.cta_section_body,
        'cta-button': siteSpec.copy.cta_button,
        'page-title': siteSpec.seo.page_title,
        'meta-description': siteSpec.seo.meta_description,
        'primary-color': siteSpec.brand.primary_color,
        'font-heading': siteSpec.brand.font_heading,
        'font-body': siteSpec.brand.font_body,
      };

      // --- Create CMS item(s) ---
      // For multiple items, add 1-second delay between calls: await new Promise(r => setTimeout(r, 1000));
      const item = await createCmsItem(process.env.WEBFLOW_COLLECTION_ID, fieldData);

      // --- Collect item IDs ---
      itemIds = [item.id];
    }

    // --- Publish site ---
    try {
      await publishSite(process.env.WEBFLOW_SITE_ID);
    } catch (err) {
      throw new Error(`Publish failed — CMS items remain in draft: ${err.message}`);
    }

    // --- Write item IDs back to Airtable ---
    await updateRecord(recordId, { 'Webflow Item IDs': JSON.stringify(itemIds) });

    return { itemIds, published: true };
  } catch (err) {
    throw err;
  }
}
