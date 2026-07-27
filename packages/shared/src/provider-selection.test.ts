import { describe, expect, it } from "vitest";
import { getDefaultProviderSelection, validateProviderSelection } from "./provider-selection";
import { ALL_PROVIDERS, type ProviderDefinition } from "./providers";

describe("validateProviderSelection", () => {
  it("accepts the default Part 1 chain", () => {
    const selection = getDefaultProviderSelection(ALL_PROVIDERS);
    expect(validateProviderSelection(selection)).toEqual({
      imageProviderIds: [
        "wavespeed_nano_banana_2",
        "wavespeed_nano_banana_pro",
        "wavespeed_seedream_v45",
      ],
      videoProviderId: "wavespeed_kling_v3_standard",
    });
  });

  it("rejects unknown providers", () => {
    expect(() =>
      validateProviderSelection({
        imageProviderIds: ["not-a-provider"],
        videoProviderId: "wavespeed_kling_v3_standard",
      }),
    ).toThrow(/Unknown image provider/);
  });

  it("accepts custom providers when passed in the provider list", () => {
    const custom: ProviderDefinition = {
      id: "custom_google_wan_edit",
      displayName: "Wan Edit",
      stage: "image_gen",
      wavespeedModel: "alibaba/wan/edit",
      sortOrder: 5,
      enabled: true,
      isCustom: true,
    };
    const providers = [...ALL_PROVIDERS, custom];

    expect(
      validateProviderSelection(
        {
          imageProviderIds: ["wavespeed_nano_banana_2", custom.id],
          videoProviderId: "wavespeed_kling_v3_standard",
        },
        providers,
      ),
    ).toEqual({
      imageProviderIds: ["wavespeed_nano_banana_2", custom.id],
      videoProviderId: "wavespeed_kling_v3_standard",
    });
  });
});
