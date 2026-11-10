export async function cleanupAuthFixtures({ fixtures, deleteFixture, verifyNoFixtures }) {
  if (!Array.isArray(fixtures)) throw new TypeError("fixtures must be an array.");
  if (typeof deleteFixture !== "function") throw new TypeError("deleteFixture must be a function.");
  if (typeof verifyNoFixtures !== "function") throw new TypeError("verifyNoFixtures must be a function.");

  const failures = [];
  for (const fixture of fixtures) {
    const name = typeof fixture?.name === "string" ? fixture.name : "(unknown)";
    try {
      await deleteFixture(fixture);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(new Error("Failed to delete isolated auth fixture " + name + ": " + message, { cause: error }));
    }
  }

  try {
    await verifyNoFixtures();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(new Error("Final isolated auth fixture verification failed: " + message, { cause: error }));
  }

  if (failures.length) {
    throw new AggregateError(failures, "Isolated auth fixture cleanup reported " + failures.length + " error(s).");
  }
}
