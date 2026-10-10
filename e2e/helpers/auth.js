/**
 * Shared login helper for smoke / e2e tests.
 * Requires E2E_USERNAME, E2E_PASSWORD, E2E_OUTLET in e2e/.env
 *
 * Login UI: credentials → outlet combobox → auto-submit when outlet is chosen.
 */
export async function loginAsTestUser(page, { outlet: outletOverride, siteCode: siteCodeOverride } = {}) {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const outlet = outletOverride || process.env.E2E_OUTLET;
  const siteCodeHint = siteCodeOverride || process.env.E2E_SITE_CODE;

  if (!username || !password || !outlet) {
    throw new Error(
      "Missing E2E credentials. Copy e2e/.env.example to e2e/.env and set E2E_USERNAME, E2E_PASSWORD, E2E_OUTLET."
    );
  }

  await page.goto("/login");

  await page.getByLabel("Username").waitFor({ state: "visible", timeout: 60_000 });

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);

  await page.getByRole("button", { name: /^Login$/i }).click();

  await page
    .getByText("Loading outlets...")
    .waitFor({ state: "hidden", timeout: 90_000 })
    .catch(() => {});

  const outletLabel = page.getByText("Select Outlet", { exact: true });
  await outletLabel.waitFor({ state: "visible", timeout: 90_000 });

  const outletSection = page
    .locator("div.space-y-2")
    .filter({ hasText: "Select Outlet" });
  await outletSection.getByRole("combobox").click();

  const sitePick = String(siteCodeHint || "").trim().toUpperCase();
  if (sitePick === "ZE01") {
    await page.getByRole("option", { name: /Kota Damansara/i }).click();
  } else if (sitePick === "ZEHQ") {
    await page.getByRole("option", { name: /BeautySalon HQ/i }).click();
  } else {
    await selectOutletOption(page, outlet);
  }

  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 45_000,
  });
  await page.getByRole("heading", { name: /Welcome back/i }).waitFor({
    state: "visible",
    timeout: 45_000,
  });

  const expectedSite = String(siteCodeHint || "").trim();
  if (expectedSite) {
    const siteCode = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("userDetails") || "{}").siteCode || "";
      } catch {
        return "";
      }
    });
    if (siteCode !== expectedSite) {
      throw new Error(
        `Logged in siteCode "${siteCode}" but E2E_SITE_CODE is "${expectedSite}". Fix E2E_OUTLET (use quotes if the label contains spaces).`
      );
    }
  }
}

async function selectOutletOption(page, outlet) {
  const options = page.getByRole("option");
  await options.first().waitFor({ state: "visible", timeout: 20_000 });
  const texts = await options.allTextContents();
  const want = outlet.trim().toLowerCase();
  const siteCode = String(process.env.E2E_SITE_CODE || "").trim().toUpperCase();

  let idx = texts.findIndex((t) => t.trim().toLowerCase() === want);
  if (idx < 0) {
    idx = texts.findIndex((t) => {
      const label = t.trim().toLowerCase();
      return label.includes(want) || want.includes(label);
    });
  }
  if (idx < 0 && siteCode === "ZE01") {
    idx = texts.findIndex((t) => /kota damansara/i.test(t));
  }
  if (idx < 0 && siteCode === "ZEHQ") {
    idx = texts.findIndex((t) => /\bHQ\b/i.test(t) && !/kota damansara/i.test(t));
  }
  if (idx < 0) {
    throw new Error(
      `Outlet "${outlet}" not found. Set E2E_OUTLET to one of: ${texts.map((t) => t.trim()).join(" | ")}`
    );
  }
  await options.nth(idx).click();
}

export async function expectStillAuthenticated(page) {
  await page.waitForLoadState("domcontentloaded");
  if (page.url().includes("/login")) {
    throw new Error(`Redirected to login (not authenticated) at ${page.url()}`);
  }
}

/** Click sidebar Logout and wait for login screen. */
export async function logoutTestUser(page) {
  await page.getByText(/^Logout$/i).first().click();
  await page.waitForURL((url) => url.pathname.includes("/login"), {
    timeout: 30_000,
  });
  await page.getByLabel("Username").waitFor({ state: "visible", timeout: 30_000 });
}
