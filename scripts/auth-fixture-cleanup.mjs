export async function cleanupAuthFixtures({ cases, deleteFixture, listRemaining }) {
  if (!Array.isArray(cases) || typeof deleteFixture !== "function" || typeof listRemaining !== "function") {
    throw new TypeError("AUTH-03 fixture cleanup requires cases, deleteFixture and listRemaining.");
  }

  const errors = [];
  for (const item of cases) {
    const name = String(item?.name || "<unnamed>");
    try {
      await deleteFixture(item);
    } catch (error) {
      errors.push(new Error("Failed to delete isolated AUTH-03 fixture " + name + ".", { cause: error }));
    }
  }

  let remaining;
  try {
    remaining = await listRemaining();
  } catch (error) {
    errors.push(new Error("Could not verify isolated AUTH-03 fixture cleanup.", { cause: error }));
  }

  if (remaining !== undefined) {
    if (!Array.isArray(remaining)) {
      errors.push(new Error("AUTH-03 fixture cleanup postflight returned a non-array result."));
    } else if (remaining.length) {
      const names = remaining.map(item => String(item?.name || item)).join(", ");
      errors.push(new Error("AUTH-03 fixtures remain after cleanup: " + names));
    }
  }

  if (errors.length) {
    throw new AggregateError(errors, "AUTH-03 isolated fixture cleanup did not complete cleanly.");
  }

  return { deleteAttempts: cases.length, remaining: 0 };
}
