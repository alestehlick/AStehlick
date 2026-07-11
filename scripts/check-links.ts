import { validateContent } from "./validate-content.js";

const result = validateContent();
const linkErrors = result.errors.filter((error) =>
  /Missing file|escapes|missing referenced note|does not match/.test(error),
);

if (linkErrors.length > 0) {
  console.error(
    `Content link check failed with ${linkErrors.length} error(s):`,
  );
  for (const error of linkErrors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("All manifest paths and note references resolve.");
}
