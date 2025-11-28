import { describe, it, expect } from "vitest";
import {
  LocaleSchema,
  ImageRatioSchema,
  AnalyzeProductInputSchema,
  MarketingRouteInputSchema,
  ProductAnalysisInputSchema,
  GenerateContentPlanInputSchema,
  DirectorOutputSchema,
  ContentPlanSchema,
  ContentSetSchema,
  validateDirectorOutput,
  validateContentPlan,
  safeValidateDirectorOutput,
  safeValidateContentPlan,
} from "../schemas";

describe("LocaleSchema", () => {
  it("should accept 'zh'", () => {
    expect(LocaleSchema.parse("zh")).toBe("zh");
  });

  it("should accept 'en'", () => {
    expect(LocaleSchema.parse("en")).toBe("en");
  });

  it("should accept undefined", () => {
    expect(LocaleSchema.parse(undefined)).toBeUndefined();
  });

  it("should reject invalid locale", () => {
    expect(() => LocaleSchema.parse("fr")).toThrow();
  });
});

describe("ImageRatioSchema", () => {
  it("should accept all valid ratios", () => {
    expect(ImageRatioSchema.parse("1:1")).toBe("1:1");
    expect(ImageRatioSchema.parse("9:16")).toBe("9:16");
    expect(ImageRatioSchema.parse("4:5")).toBe("4:5");
    expect(ImageRatioSchema.parse("16:9")).toBe("16:9");
    expect(ImageRatioSchema.parse("1:1-commercial")).toBe("1:1-commercial");
  });

  it("should reject invalid ratio", () => {
    expect(() => ImageRatioSchema.parse("2:3")).toThrow();
  });
});

describe("AnalyzeProductInputSchema", () => {
  it("should validate valid input", () => {
    const input = {
      imageBase64: "base64data",
      imageMimeType: "image/png",
      productName: "Test Product",
      productInfo: "Product info",
      productUrl: "https://example.com",
    };

    const result = AnalyzeProductInputSchema.parse(input);
    expect(result.imageBase64).toBe("base64data");
    expect(result.imageMimeType).toBe("image/png");
  });

  it("should use defaults for optional fields", () => {
    const input = {
      imageBase64: "base64data",
      imageMimeType: "image/png",
    };

    const result = AnalyzeProductInputSchema.parse(input);
    expect(result.productName).toBe("");
    expect(result.productInfo).toBe("");
    expect(result.productUrl).toBe("");
  });

  it("should reject empty imageBase64", () => {
    const input = {
      imageBase64: "",
      imageMimeType: "image/png",
    };

    expect(() => AnalyzeProductInputSchema.parse(input)).toThrow();
  });
});

describe("MarketingRouteInputSchema", () => {
  it("should validate valid marketing route", () => {
    const route = {
      route_name: "Premium Route",
      headline: "Premium Headline",
      subhead: "Premium Subhead",
      style_brief: "Elegant and modern",
      target_audience: "Young professionals",
    };

    const result = MarketingRouteInputSchema.parse(route);
    expect(result.route_name).toBe("Premium Route");
  });

  it("should reject missing required fields", () => {
    const route = {
      route_name: "Premium Route",
      headline: "",
      subhead: "Premium Subhead",
      style_brief: "Elegant and modern",
      target_audience: "Young professionals",
    };

    expect(() => MarketingRouteInputSchema.parse(route)).toThrow();
  });
});

describe("ProductAnalysisInputSchema", () => {
  it("should validate valid product analysis", () => {
    const analysis = {
      name: "Product Name",
      visual_description: "Blue bottle with gold cap",
      key_features: "Premium quality, organic",
    };

    const result = ProductAnalysisInputSchema.parse(analysis);
    expect(result.name).toBe("Product Name");
  });

  it("should use default for visual_description", () => {
    const analysis = {
      name: "Product Name",
      key_features: "Premium quality",
    };

    const result = ProductAnalysisInputSchema.parse(analysis);
    expect(result.visual_description).toBe("");
  });
});

describe("GenerateContentPlanInputSchema", () => {
  it("should validate valid content plan input", () => {
    const input = {
      route: {
        route_name: "Premium Route",
        headline: "Premium Headline",
        subhead: "Premium Subhead",
        style_brief: "Elegant and modern",
        target_audience: "Young professionals",
      },
      analysis: {
        name: "Product Name",
        visual_description: "Blue bottle",
        key_features: "Premium quality",
      },
      referenceCopy: "Reference copy text",
      selectedSizes: ["1:1", "9:16"] as const,
    };

    const result = GenerateContentPlanInputSchema.parse(input);
    expect(result.selectedSizes).toHaveLength(2);
  });

  it("should reject empty selectedSizes", () => {
    const input = {
      route: {
        route_name: "Premium Route",
        headline: "Premium Headline",
        subhead: "Premium Subhead",
        style_brief: "Elegant and modern",
        target_audience: "Young professionals",
      },
      analysis: {
        name: "Product Name",
        visual_description: "Blue bottle",
        key_features: "Premium quality",
      },
      selectedSizes: [],
    };

    expect(() => GenerateContentPlanInputSchema.parse(input)).toThrow();
  });
});

describe("DirectorOutputSchema", () => {
  const validDirectorOutput = {
    product_analysis: {
      name: "Test Product",
      visual_description: "A modern product",
      key_features: "Feature 1, Feature 2",
    },
    marketing_routes: [
      {
        route_name: "Route 1",
        headline: "Headline 1",
        subhead: "Subhead 1",
        style_brief: "Modern style",
        target_audience: "Young adults",
      },
    ],
  };

  it("should validate valid director output", () => {
    const result = DirectorOutputSchema.parse(validDirectorOutput);
    expect(result.product_analysis.name).toBe("Test Product");
    expect(result.marketing_routes).toHaveLength(1);
  });

  it("should reject empty marketing_routes", () => {
    const invalid = {
      ...validDirectorOutput,
      marketing_routes: [],
    };

    expect(() => DirectorOutputSchema.parse(invalid)).toThrow();
  });

  it("should reject more than 5 marketing routes", () => {
    const invalid = {
      ...validDirectorOutput,
      marketing_routes: Array(6).fill(validDirectorOutput.marketing_routes[0]),
    };

    expect(() => DirectorOutputSchema.parse(invalid)).toThrow();
  });
});

describe("ContentSetSchema", () => {
  it("should validate valid content set", () => {
    const contentSet = {
      id: "content-1",
      ratio: "1:1" as const,
      size_label: "IG Feed",
      set_number: 1,
      title: "Title Text",
      copy: "Copy Text",
      visual_prompt_en: "A beautiful product shot",
      visual_summary: "Summary text",
    };

    const result = ContentSetSchema.parse(contentSet);
    expect(result.id).toBe("content-1");
  });

  it("should accept optional arrangement_style", () => {
    const contentSet = {
      id: "content-1",
      ratio: "1:1" as const,
      size_label: "IG Feed",
      set_number: 1,
      title: "Title Text",
      copy: "Copy Text",
      visual_prompt_en: "A beautiful product shot",
      visual_summary: "Summary text",
      arrangement_style: "fan" as const,
    };

    const result = ContentSetSchema.parse(contentSet);
    expect(result.arrangement_style).toBe("fan");
  });

  it("should reject invalid set_number", () => {
    const contentSet = {
      id: "content-1",
      ratio: "1:1" as const,
      size_label: "IG Feed",
      set_number: 5,
      title: "Title Text",
      copy: "Copy Text",
      visual_prompt_en: "A beautiful product shot",
      visual_summary: "Summary text",
    };

    expect(() => ContentSetSchema.parse(contentSet)).toThrow();
  });
});

describe("ContentPlanSchema", () => {
  const validContentPlan = {
    plan_name: "Marketing Plan",
    selected_sizes: ["1:1", "9:16"] as const,
    content_sets: [
      {
        id: "content-1",
        ratio: "1:1" as const,
        size_label: "IG Feed",
        set_number: 1,
        title: "Title Text",
        copy: "Copy Text",
        visual_prompt_en: "A beautiful product shot",
        visual_summary: "Summary text",
      },
    ],
  };

  it("should validate valid content plan", () => {
    const result = ContentPlanSchema.parse(validContentPlan);
    expect(result.plan_name).toBe("Marketing Plan");
  });

  it("should reject empty content_sets", () => {
    const invalid = {
      ...validContentPlan,
      content_sets: [],
    };

    expect(() => ContentPlanSchema.parse(invalid)).toThrow();
  });
});

describe("validateDirectorOutput", () => {
  it("should return validated output for valid data", () => {
    const validData = {
      product_analysis: {
        name: "Test",
        visual_description: "Description",
        key_features: "Features",
      },
      marketing_routes: [
        {
          route_name: "Route",
          headline: "Headline",
          subhead: "Subhead",
          style_brief: "Style",
          target_audience: "Audience",
        },
      ],
    };

    const result = validateDirectorOutput(validData);
    expect(result.product_analysis.name).toBe("Test");
  });

  it("should throw for invalid data", () => {
    expect(() => validateDirectorOutput({})).toThrow();
  });
});

describe("validateContentPlan", () => {
  it("should return validated plan for valid data", () => {
    const validData = {
      plan_name: "Plan",
      selected_sizes: ["1:1"],
      content_sets: [
        {
          id: "1",
          ratio: "1:1",
          size_label: "IG",
          set_number: 1,
          title: "Title",
          copy: "Copy",
          visual_prompt_en: "Prompt",
          visual_summary: "Summary",
        },
      ],
    };

    const result = validateContentPlan(validData);
    expect(result.plan_name).toBe("Plan");
  });
});

describe("safeValidateDirectorOutput", () => {
  it("should return success: true for valid data", () => {
    const validData = {
      product_analysis: {
        name: "Test",
        visual_description: "Description",
        key_features: "Features",
      },
      marketing_routes: [
        {
          route_name: "Route",
          headline: "Headline",
          subhead: "Subhead",
          style_brief: "Style",
          target_audience: "Audience",
        },
      ],
    };

    const result = safeValidateDirectorOutput(validData);
    expect(result.success).toBe(true);
  });

  it("should return success: false for invalid data", () => {
    const result = safeValidateDirectorOutput({});
    expect(result.success).toBe(false);
  });
});

describe("safeValidateContentPlan", () => {
  it("should return success: false for invalid data", () => {
    const result = safeValidateContentPlan({});
    expect(result.success).toBe(false);
  });
});
