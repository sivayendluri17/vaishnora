"use client";

import { useEffect } from "react";

export function RumMonitor() {
  useEffect(() => {
    (async () => {
      try {
        const { AwsRum } = await import("aws-rum-web");

        const config = {
          sessionSampleRate: 1,
          identityPoolId: "us-west-2:1bd65ace-2823-4d24-8a41-32ff437f5ea1",
          endpoint: "https://dataplane.rum.us-west-2.amazonaws.com",
          telemetries: ["performance", "errors", "http"],
          allowCookies: true,
          enableXRay: false,
          signing: false,
        };

        const APPLICATION_ID = "c3acd1a1-07be-4662-85bd-a11bc20fbdd0";
        const APPLICATION_VERSION = "1.0.0";
        const APPLICATION_REGION = "us-west-2";

        new AwsRum(
          APPLICATION_ID,
          APPLICATION_VERSION,
          APPLICATION_REGION,
          config as any
        );
      } catch (error) {
        // Ignore errors during CloudWatch RUM initialization
      }
    })();
  }, []);

  return null;
}
