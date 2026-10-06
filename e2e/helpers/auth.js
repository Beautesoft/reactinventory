/**
 * Shared login helper for smoke / e2e tests.
 * Requires E2E_USERNAME, E2E_PASSWORD, E2E_OUTLET in e2e/.env
 */
export async function loginAsTestUser(page, { outlet: outletOverride } = {}) {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const outlet = outletOverride || process.env.E2E_OUTLET;

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

  const outletLabel = page.getByText("Select Outlet", { exact: true });
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await outletLabel.isVisible().catch(() => false)) break;
    await page.waitForTimeout(2000);
    if (attempt < 2) {
      await page.getByRole("button", { name: /^Login$/i }).click();
    }
  }
  await outletLabel.waitFor({ state: "visible", timeout: 90_000 });

  const outletSection = page
    .locator("div.space-y-2")
    .filter({ hasText: "Select Outlet" });
  await outletSection.getByRole("combobox").click();

  const option = page.getByRole("option").filter({ hasText: outlet }).first();
  await option.waitFor({ state: "visible", timeout: 15_000 });
  await option.click();

  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 45_000,
  });
  await page.getByRole("heading", { name: /Welcome back/i }).waitFor({
    state: "visible",
    timeout: 45_000,
  });
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
