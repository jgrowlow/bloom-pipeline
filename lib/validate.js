// Webflow-supported Google Fonts whitelist
// Last verified: 2026-04-06
// Source: https://webflow.com/feature/google-fonts
export const WEBFLOW_GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Oswald',
  'Raleway',
  'Poppins',
  'Nunito',
  'Source Sans Pro',
  'Merriweather',
  'Playfair Display',
  'PT Sans',
  'Ubuntu',
  'Rubik',
  'Work Sans',
  'Mulish',
  'Quicksand',
  'DM Sans',
  'Space Grotesk',
  'Libre Baskerville',
  'Josefin Sans',
  'Barlow',
  'Exo 2',
  'Cabin',
  'Karla',
  'Manrope',
  'Figtree',
  'Plus Jakarta Sans',
  'Outfit',
];

// ─── Task 3.1 ───────────────────────────────────────────────────────────────

/**
 * Validates a BrandSpec output object.
 * Throws a descriptive error if any validation rule fails.
 * @param {object} output
 */
export function validateBrandSpec(output) {
  const requiredFields = [
    'primary_color',
    'secondary_color',
    'accent_color',
    'font_heading',
    'font_body',
    'tone',
    'logo_direction',
  ];

  for (const field of requiredFields) {
    if (output[field] === undefined || output[field] === null || output[field] === '') {
      throw new Error(`BrandSpec validation failed: missing required field: ${field}`);
    }
  }

  const colorFields = ['primary_color', 'secondary_color', 'accent_color'];
  const hslRegex = /^hsl\(\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?%\s*,\s*\d+(\.\d+)?%\s*\)$/i;
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  for (const field of colorFields) {
    const value = output[field];
    if (!hslRegex.test(value) && !hexRegex.test(value)) {
      throw new Error(
        `BrandSpec validation failed: ${field} is not a valid HSL or hex value`
      );
    }
  }
}

// ─── Task 3.2 ───────────────────────────────────────────────────────────────

/**
 * Validates a CopySpec output object.
 * Throws a descriptive error if any validation rule fails.
 * @param {object} output
 */
export function validateCopySpec(output) {
  const requiredFields = [
    'hero_headline',
    'hero_subheadline',
    'hero_cta',
    'about_headline',
    'about_body',
    'services',
    'social_proof_headline',
    'cta_section_headline',
    'cta_section_body',
    'cta_button',
  ];

  for (const field of requiredFields) {
    if (output[field] === undefined || output[field] === null || output[field] === '') {
      throw new Error(`CopySpec validation failed: missing required field: ${field}`);
    }
  }

  // hero_headline word count ≤ 8
  const heroWords = output.hero_headline.trim().split(/\s+/);
  if (heroWords.length > 8) {
    throw new Error(`CopySpec validation failed: hero_headline exceeds 8 words`);
  }

  // No placeholder text (check all string fields)
  const placeholderPatterns = [
    /lorem ipsum/i,
    /\[insert/i,
    /placeholder/i,
    /\[your/i,
    /xxx/i,
  ];

  const stringFields = requiredFields.filter((f) => typeof output[f] === 'string');
  for (const field of stringFields) {
    for (const pattern of placeholderPatterns) {
      if (pattern.test(output[field])) {
        throw new Error(
          `CopySpec validation failed: placeholder text detected in ${field}`
        );
      }
    }
  }

  // CTA fields must begin with an action verb
  const actionVerbs = /^(get|start|book|discover|schedule|try|join|learn)\b/i;
  for (const field of ['hero_cta', 'cta_button']) {
    if (!actionVerbs.test(output[field].trim())) {
      throw new Error(
        `CopySpec validation failed: ${field} must begin with an action verb`
      );
    }
  }

  // services must be an array of objects with non-empty name, tagline, description
  if (!Array.isArray(output.services)) {
    throw new Error(`CopySpec validation failed: services must be an array`);
  }

  for (let i = 0; i < output.services.length; i++) {
    const service = output.services[i];
    for (const field of ['name', 'tagline', 'description']) {
      if (!service[field] || String(service[field]).trim() === '') {
        throw new Error(
          `CopySpec validation failed: service at index ${i} missing field: ${field}`
        );
      }
    }
  }
}

// ─── Task 3.3 ───────────────────────────────────────────────────────────────

/**
 * Validates an SEOSpec output object.
 * Throws a descriptive error if any validation rule fails.
 * @param {object} output
 */
export function validateSeoSpec(output) {
  const requiredFields = [
    'page_title',
    'meta_description',
    'h1',
    'focus_keyword',
    'secondary_keywords',
    'og_title',
    'og_description',
  ];

  for (const field of requiredFields) {
    if (output[field] === undefined || output[field] === null || output[field] === '') {
      throw new Error(`SEOSpec validation failed: missing required field: ${field}`);
    }
  }

  // Character limits
  const charLimits = {
    page_title: 60,
    meta_description: 155,
    og_title: 60,
    og_description: 200,
  };

  for (const [field, limit] of Object.entries(charLimits)) {
    const len = output[field].length;
    if (len > limit) {
      throw new Error(
        `SEOSpec validation failed: ${field} is ${len} characters, limit is ${limit}`
      );
    }
  }

  // focus_keyword must appear in h1 and meta_description (case-insensitive)
  const keyword = output.focus_keyword.toLowerCase();
  for (const field of ['h1', 'meta_description']) {
    if (!output[field].toLowerCase().includes(keyword)) {
      throw new Error(
        `SEOSpec validation failed: focus_keyword not found in ${field}`
      );
    }
  }

  // secondary_keywords must be a non-empty array of strings
  if (
    !Array.isArray(output.secondary_keywords) ||
    output.secondary_keywords.length === 0 ||
    !output.secondary_keywords.every((k) => typeof k === 'string')
  ) {
    throw new Error(
      `SEOSpec validation failed: secondary_keywords must be a non-empty array`
    );
  }
}

// ─── Task 3.4 ───────────────────────────────────────────────────────────────

const VALID_SECTION_TYPES = new Set([
  'hero',
  'about',
  'services',
  'testimonials',
  'portfolio',
  'cta',
  'footer',
]);

/**
 * Validates a StructureSpec output object.
 * Accepts the spec output AND the intake object.
 * Returns [validatedSpec, warningOrNull].
 * @param {object} output
 * @param {object} intake
 * @returns {[object, string|null]}
 */
export function validateStructureSpec(output, intake) {
  if (!Array.isArray(output.sections)) {
    throw new Error(`StructureSpec validation failed: sections must be an array`);
  }

  // Validate all section types
  for (const section of output.sections) {
    if (!VALID_SECTION_TYPES.has(section.type)) {
      throw new Error(
        `StructureSpec validation failed: unknown section type '${section.type}'`
      );
    }
  }

  // Sort a working copy by order to check ordering rules
  const sorted = [...output.sections].sort((a, b) => a.order - b.order);

  // First section must be hero
  if (sorted.length > 0 && sorted[0].type !== 'hero') {
    throw new Error(`StructureSpec validation failed: hero must be first section`);
  }

  // cta and footer must be the last two sections
  if (sorted.length >= 2) {
    const lastTwo = sorted.slice(-2).map((s) => s.type);
    if (lastTwo[0] !== 'cta' || lastTwo[1] !== 'footer') {
      throw new Error(
        `StructureSpec validation failed: cta and footer must be final sections`
      );
    }
  }

  // Max 8 sections
  if (output.sections.length > 8) {
    throw new Error(
      `StructureSpec validation failed: maximum 8 sections allowed, got ${output.sections.length}`
    );
  }

  // If intake says no testimonials but spec includes them, silently remove
  let warning = null;
  if (!intake['Has Testimonials']) {
    const idx = output.sections.findIndex((s) => s.type === 'testimonials');
    if (idx !== -1) {
      output.sections.splice(idx, 1);
      warning =
        'testimonials section removed: intake indicates no testimonials available';
    }
  }

  return [output, warning];
}

// ─── Task 3.6 ───────────────────────────────────────────────────────────────

/**
 * Checks font_heading and font_body against WEBFLOW_GOOGLE_FONTS.
 * Mutates brandSpec in place for any unsupported font, replacing with "Inter".
 * Returns a warning string for each fallback, or null if none.
 * @param {object} brandSpec
 * @returns {string|null}
 */
export function validateFonts(brandSpec) {
  const warnings = [];

  for (const field of ['font_heading', 'font_body']) {
    if (!WEBFLOW_GOOGLE_FONTS.includes(brandSpec[field])) {
      warnings.push(
        `Font '${brandSpec[field]}' not in Webflow whitelist. Fell back to Inter.`
      );
      brandSpec[field] = 'Inter';
    }
  }

  return warnings.length > 0 ? warnings.join('\n') : null;
}
