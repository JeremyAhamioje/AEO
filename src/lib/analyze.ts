import * as cheerio from "cheerio";

export type Finding = {
  label: string;
  pass: boolean;
  points: number;
  maxPoints: number;
  detail: string;
  fix?: string;
};

export type Category = {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  findings: Finding[];
};

export type AeoReport = {
  url: string;
  fetchedAt: string;
  overallScore: number;
  categories: Category[];
};

const QUESTION_WORDS = ["what", "how", "why", "when", "where", "who", "which", "can", "does", "is", "are", "should"];

function looksLikeQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.endsWith("?")) return true;
  const firstWord = t.split(/\s+/)[0] ?? "";
  return QUESTION_WORDS.includes(firstWord);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function fetchHtml(url: string): Promise<{ html: string; status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AEO-Auditor/1.0; +https://github.com) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html")) {
      throw new Error(`URL did not return HTML (content-type: ${contentType || "unknown"})`);
    }
    const html = await res.text();
    return { html, status: res.status };
  } finally {
    clearTimeout(timeout);
  }
}

export function analyzeHtml(url: string, html: string): AeoReport {
  const $ = cheerio.load(html);

  // ---- Structured Data ----
  const structuredFindings: Finding[] = [];
  const jsonLdBlocks: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      jsonLdBlocks.push(parsed);
    } catch {
      // malformed JSON-LD; ignore for scoring but could be surfaced later
    }
  });
  const flatTypes = jsonLdBlocks.flatMap((block) => {
    const arr = Array.isArray(block) ? block : [block];
    return arr.flatMap((b) => {
      if (b && typeof b === "object" && "@graph" in (b as Record<string, unknown>)) {
        const graph = (b as { "@graph": unknown[] })["@graph"];
        return Array.isArray(graph) ? graph : [];
      }
      return [b];
    });
  });
  const typeStrings = flatTypes
    .map((b) => (b && typeof b === "object" ? (b as { "@type"?: unknown })["@type"] : undefined))
    .flatMap((t) => (Array.isArray(t) ? t : [t]))
    .filter((t): t is string => typeof t === "string");

  const hasAnyJsonLd = jsonLdBlocks.length > 0;
  structuredFindings.push({
    label: "Has JSON-LD structured data",
    pass: hasAnyJsonLd,
    points: hasAnyJsonLd ? 5 : 0,
    maxPoints: 5,
    detail: hasAnyJsonLd
      ? `Found ${jsonLdBlocks.length} JSON-LD block(s).`
      : "No <script type=\"application/ld+json\"> found.",
    fix: hasAnyJsonLd ? undefined : "Add at least one JSON-LD block describing this page's content type.",
  });

  const hasFaqSchema = typeStrings.some((t) => t === "FAQPage");
  structuredFindings.push({
    label: "FAQPage schema present",
    pass: hasFaqSchema,
    points: hasFaqSchema ? 10 : 0,
    maxPoints: 10,
    detail: hasFaqSchema ? "FAQPage schema found." : "No FAQPage schema found.",
    fix: hasFaqSchema
      ? undefined
      : "If this page answers common questions, mark them up as FAQPage with mainEntity/Question/Answer nodes -- this is one of the highest-signal formats for AI answer engines to quote directly.",
  });

  const contentTypeSchemas = ["Article", "BlogPosting", "HowTo", "NewsArticle"];
  const hasContentSchema = typeStrings.some((t) => contentTypeSchemas.includes(t));
  structuredFindings.push({
    label: "Content-type schema (Article/HowTo/BlogPosting)",
    pass: hasContentSchema,
    points: hasContentSchema ? 5 : 0,
    maxPoints: 5,
    detail: hasContentSchema
      ? `Found: ${typeStrings.filter((t) => contentTypeSchemas.includes(t)).join(", ")}`
      : "No Article/HowTo/BlogPosting schema found.",
    fix: hasContentSchema ? undefined : "Mark up the primary content block with Article or HowTo schema so engines can identify authorship, dates, and structure.",
  });

  const orgSchemas = ["Organization", "BreadcrumbList"];
  const hasOrgSchema = typeStrings.some((t) => orgSchemas.includes(t));
  structuredFindings.push({
    label: "Organization / BreadcrumbList schema",
    pass: hasOrgSchema,
    points: hasOrgSchema ? 5 : 0,
    maxPoints: 5,
    detail: hasOrgSchema
      ? `Found: ${typeStrings.filter((t) => orgSchemas.includes(t)).join(", ")}`
      : "No Organization or BreadcrumbList schema found.",
    fix: hasOrgSchema ? undefined : "Add Organization schema site-wide and BreadcrumbList on deep pages -- helps engines place this page in context.",
  });

  // ---- Heading Structure ----
  const headingFindings: Finding[] = [];
  const h1s = $("h1");
  const singleH1 = h1s.length === 1;
  headingFindings.push({
    label: "Exactly one H1",
    pass: singleH1,
    points: singleH1 ? 5 : 0,
    maxPoints: 5,
    detail: `Found ${h1s.length} H1 element(s).`,
    fix: singleH1 ? undefined : "Use exactly one H1 per page as the single clearest statement of what the page is about.",
  });

  const allHeadings: { level: number; text: string }[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const level = parseInt(el.tagName.replace(/[^0-9]/g, ""), 10);
    const text = $(el).text().trim();
    if (text) allHeadings.push({ level, text });
  });

  let skippedLevel = false;
  for (let i = 1; i < allHeadings.length; i++) {
    if (allHeadings[i].level - allHeadings[i - 1].level > 1) {
      skippedLevel = true;
      break;
    }
  }
  headingFindings.push({
    label: "No skipped heading levels",
    pass: !skippedLevel,
    points: !skippedLevel ? 5 : 0,
    maxPoints: 5,
    detail: skippedLevel ? "Found a heading level skip (e.g. H1 straight to H3)." : "Heading hierarchy looks sequential.",
    fix: skippedLevel ? "Fix the heading order so levels step down one at a time (H1 -> H2 -> H3), not skip." : undefined,
  });

  const questionHeadings = allHeadings.filter((h) => looksLikeQuestion(h.text));
  const hasQuestionHeading = questionHeadings.length > 0;
  headingFindings.push({
    label: "At least one question-phrased heading",
    pass: hasQuestionHeading,
    points: hasQuestionHeading ? 10 : 0,
    maxPoints: 10,
    detail: hasQuestionHeading
      ? `Found ${questionHeadings.length}: "${questionHeadings[0].text}"${questionHeadings.length > 1 ? ", ..." : ""}`
      : "No headings phrased as questions.",
    fix: hasQuestionHeading
      ? undefined
      : "Rephrase at least a few section headings as the actual question a user (or an AI) would ask -- e.g. \"How does X work?\" instead of \"Overview\".",
  });

  const genericHeadings = ["overview", "introduction", "about", "more info", "details"];
  const nonGenericCount = allHeadings.filter((h) => !genericHeadings.includes(h.text.toLowerCase())).length;
  const mostlyDescriptive = allHeadings.length === 0 || nonGenericCount / allHeadings.length >= 0.7;
  headingFindings.push({
    label: "Headings are descriptive, not generic labels",
    pass: mostlyDescriptive,
    points: mostlyDescriptive ? 5 : 0,
    maxPoints: 5,
    detail: mostlyDescriptive
      ? "Most headings are specific rather than generic."
      : "Several headings are generic labels like \"Overview\" or \"Introduction\".",
    fix: mostlyDescriptive ? undefined : "Replace generic section labels with headings that state the actual claim or question of that section.",
  });

  // ---- Answer Clarity ----
  const clarityFindings: Finding[] = [];

  let answeredQuestions = 0;
  // Walk the DOM to find, for each question heading element, the very next paragraph.
  let questionHeadingElements = 0;
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const text = $(el).text().trim();
    if (!text || !looksLikeQuestion(text)) return;
    questionHeadingElements++;
    const nextP = $(el).nextAll("p").first();
    if (nextP.length) {
      const firstSentence = (nextP.text().split(/[.!?]/)[0] || "").trim();
      const words = wordCount(firstSentence);
      if (words > 0 && words <= 35) {
        answeredQuestions++;
      }
    }
  });
  const answerRatio = questionHeadingElements > 0 ? answeredQuestions / questionHeadingElements : 0;
  const answerPoints = questionHeadingElements > 0 ? Math.round(answerRatio * 10) : 0;
  clarityFindings.push({
    label: "Question headings followed by a direct short answer",
    pass: questionHeadingElements > 0 && answerRatio >= 0.6,
    points: answerPoints,
    maxPoints: 10,
    detail:
      questionHeadingElements > 0
        ? `${answeredQuestions}/${questionHeadingElements} question headings are followed by a concise (<=35 word) direct sentence.`
        : "No question headings to evaluate (see heading findings above).",
    fix:
      questionHeadingElements > 0 && answerRatio < 0.6
        ? "Put the direct answer in the first sentence right after each question heading, before any preamble -- that first sentence is what gets quoted."
        : undefined,
  });

  const listOrTableCount = $("ul, ol, table").length;
  const hasListsOrTables = listOrTableCount > 0;
  clarityFindings.push({
    label: "Uses lists or tables for structured content",
    pass: hasListsOrTables,
    points: hasListsOrTables ? 10 : 0,
    maxPoints: 10,
    detail: hasListsOrTables ? `Found ${listOrTableCount} list/table element(s).` : "No lists or tables found.",
    fix: hasListsOrTables ? undefined : "Where content is a set of steps, options, or comparisons, use a real <ul>/<ol>/<table> instead of prose -- these extract cleanly into AI answers.",
  });

  const paragraphs = $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 0);
  const avgWords = paragraphs.length > 0 ? paragraphs.reduce((sum, p) => sum + wordCount(p), 0) / paragraphs.length : 0;
  const concise = paragraphs.length === 0 || avgWords <= 80;
  clarityFindings.push({
    label: "Paragraphs are concise, not walls of text",
    pass: concise,
    points: concise ? 10 : 0,
    maxPoints: 10,
    detail: paragraphs.length > 0 ? `Average paragraph length: ${Math.round(avgWords)} words.` : "No paragraph text found.",
    fix: concise ? undefined : "Break long paragraphs into shorter ones (under ~80 words) -- extraction models favor self-contained chunks.",
  });

  // ---- Meta & Technical ----
  const metaFindings: Finding[] = [];
  const title = $("title").first().text().trim();
  const titleOk = title.length >= 10 && title.length <= 65;
  metaFindings.push({
    label: "Title tag present and well-sized",
    pass: titleOk,
    points: titleOk ? 5 : 0,
    maxPoints: 5,
    detail: title ? `"${title}" (${title.length} chars)` : "No <title> found.",
    fix: titleOk ? undefined : "Keep the title tag between roughly 10-65 characters and specific to this page's content.",
  });

  const metaDesc = $('meta[name="description"]').attr("content")?.trim() || "";
  const descOk = metaDesc.length >= 50 && metaDesc.length <= 160;
  metaFindings.push({
    label: "Meta description present and well-sized",
    pass: descOk,
    points: descOk ? 5 : 0,
    maxPoints: 5,
    detail: metaDesc ? `${metaDesc.length} chars` : "No meta description found.",
    fix: descOk ? undefined : "Add a meta description of roughly 50-160 characters that summarizes the page's actual answer/value.",
  });

  const canonical = $('link[rel="canonical"]').attr("href");
  const hasCanonical = Boolean(canonical);
  metaFindings.push({
    label: "Canonical tag present",
    pass: hasCanonical,
    points: hasCanonical ? 5 : 0,
    maxPoints: 5,
    detail: hasCanonical ? `Canonical: ${canonical}` : "No canonical link found.",
    fix: hasCanonical ? undefined : "Add a <link rel=\"canonical\"> pointing to the preferred URL for this content.",
  });

  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const hasOg = Boolean(ogTitle && ogDesc);
  metaFindings.push({
    label: "Open Graph tags present",
    pass: hasOg,
    points: hasOg ? 5 : 0,
    maxPoints: 5,
    detail: hasOg ? "og:title and og:description both present." : "Missing og:title and/or og:description.",
    fix: hasOg ? undefined : "Add og:title and og:description -- also used by several AI crawlers as a content summary fallback.",
  });

  const categories: Category[] = [
    {
      key: "structured_data",
      label: "Structured Data",
      score: structuredFindings.reduce((s, f) => s + f.points, 0),
      maxScore: structuredFindings.reduce((s, f) => s + f.maxPoints, 0),
      findings: structuredFindings,
    },
    {
      key: "heading_structure",
      label: "Heading Structure",
      score: headingFindings.reduce((s, f) => s + f.points, 0),
      maxScore: headingFindings.reduce((s, f) => s + f.maxPoints, 0),
      findings: headingFindings,
    },
    {
      key: "answer_clarity",
      label: "Answer Clarity",
      score: clarityFindings.reduce((s, f) => s + f.points, 0),
      maxScore: clarityFindings.reduce((s, f) => s + f.maxPoints, 0),
      findings: clarityFindings,
    },
    {
      key: "meta_technical",
      label: "Meta & Technical",
      score: metaFindings.reduce((s, f) => s + f.points, 0),
      maxScore: metaFindings.reduce((s, f) => s + f.maxPoints, 0),
      findings: metaFindings,
    },
  ];

  const overallScore = categories.reduce((s, c) => s + c.score, 0);

  return {
    url,
    fetchedAt: new Date().toISOString(),
    overallScore,
    categories,
  };
}
